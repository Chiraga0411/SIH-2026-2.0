const ServiceRequest = require("../models/ServiceRequest");
const TaxDue = require("../models/TaxDue");
const Parcel = require("../models/Parcel");
const Privacy = require("../models/Privacy");
const Consent = require("../models/Consent");
const User = require("../models/User");
const KbDoc = require("../models/KbDoc");
const audit = require("../utils/audit");
const { retrieve } = require("../utils/retrieval");
const { shapeOne } = require("../utils/viewer");
const { findParcelByIdentifier } = require("../utils/parcelLookup");

const LANGS = ["en", "hi", "ta"];
const APP_WORDS = /(delay|delayed|status|track|application|pending|why|देरी|स्थिति|आवेदन|ट्रैक|தாமதம்|நிலை|விண்ணப்பம்)/i;
const DUE_WORDS = /(\bdue\b|dues|tax|pay|payment|receipt|बकाया|कर|भुगतान|வரி|நிலுவை|செலுத்து)/i;
const ID_RE = /\b([0-9A-Z]{14}|[A-Z]{2}-\d{4}-\d{4})\b/i;

const T = {
  en: {
    app: (r, step, dept, h) => `Your application ${r.refId} (${r.serviceName}) is at the step "${step}" with ${dept}. ${h > 0 ? `About ${h} hours remain for this step.` : "This step has passed its target time, so it may be delayed."}`,
    appDone: (r) => `Your application ${r.refId} (${r.serviceName}) is ${r.status}.`,
    noApp: "You have no service applications yet.",
    dues: (n, sum) => `You have ${n} unpaid item(s) totalling ₹${sum}.`,
    noDues: "You have no unpaid dues.",
    parcel: (p) => `Plot ${p.name || ""} (${p.ulpin}): zoning ${p.zoning}, status ${p.status}, trust score ${p.trustScore}.`,
    notFound: "I could not find this in the information I have. Try the Services tab, or ask the revenue officer for your area."
  },
  hi: {
    app: (r, step, dept, h) => `आपका आवेदन ${r.refId} (${r.serviceName}) अभी "${step}" चरण में है, विभाग: ${dept}. ${h > 0 ? `इस चरण के लिए लगभग ${h} घंटे बचे हैं।` : "इस चरण का लक्षित समय बीत चुका है, इसलिए देरी हो सकती है।"}`,
    appDone: (r) => `आपका आवेदन ${r.refId} (${r.serviceName}) की स्थिति: ${r.status}.`,
    noApp: "आपका कोई सेवा आवेदन अभी नहीं है।",
    dues: (n, sum) => `आपके ${n} बकाया मद हैं, कुल ₹${sum}.`,
    noDues: "आपका कोई बकाया नहीं है।",
    parcel: (p) => `प्लॉट ${p.name || ""} (${p.ulpin}): ज़ोन ${p.zoning}, स्थिति ${p.status}, ट्रस्ट स्कोर ${p.trustScore}.`,
    notFound: "मुझे यह जानकारी उपलब्ध सामग्री में नहीं मिली। सेवाएँ टैब देखें या अपने क्षेत्र के राजस्व अधिकारी से पूछें।"
  },
  ta: {
    app: (r, step, dept, h) => `உங்கள் விண்ணப்பம் ${r.refId} (${r.serviceName}) தற்போது "${step}" படியில் உள்ளது, துறை: ${dept}. ${h > 0 ? `இந்தப் படிக்கு சுமார் ${h} மணி நேரம் உள்ளது.` : "இந்தப் படியின் இலக்கு நேரம் கடந்துவிட்டது, எனவே தாமதம் இருக்கலாம்."}`,
    appDone: (r) => `உங்கள் விண்ணப்பம் ${r.refId} (${r.serviceName}) நிலை: ${r.status}.`,
    noApp: "உங்களுக்கு இன்னும் சேவை விண்ணப்பங்கள் இல்லை.",
    dues: (n, sum) => `உங்களுக்கு ${n} செலுத்தப்படாத உருப்படி(கள்) உள்ளன, மொத்தம் ₹${sum}.`,
    noDues: "உங்களுக்கு நிலுவைத் தொகை இல்லை.",
    parcel: (p) => `மனை ${p.name || ""} (${p.ulpin}): மண்டலம் ${p.zoning}, நிலை ${p.status}, நம்பகத்தன்மை மதிப்பெண் ${p.trustScore}.`,
    notFound: "என்னிடம் உள்ள தகவலில் இது கிடைக்கவில்லை. சேவைகள் தாவலைப் பாருங்கள் அல்லது உங்கள் பகுதி வருவாய் அலுவலரிடம் கேளுங்கள்."
  }
};

// POST /api/assistant/ask  { question, lang, ulpin? }
exports.ask = async (req, res) => {
  try {
    const question = String((req.body || {}).question || "").trim().slice(0, 500);
    if (!question) return res.status(400).json({ message: "question is required" });
    const lang = LANGS.includes(req.body.lang) ? req.body.lang : "en";
    const t = T[lang];
    const parts = [];
    const sources = [];

    if (APP_WORDS.test(question)) {
      const r = await ServiceRequest.findOne({ applicant: req.user.id }).sort({ createdAt: -1 }).lean();
      if (r) {
        if (r.status === "IN_PROGRESS") {
          const step = r.steps[r.currentStep];
          const hours = r.slaDueAt ? Math.round((new Date(r.slaDueAt) - Date.now()) / 3600000) : 0;
          parts.push(t.app(r, step.name, step.department, hours));
        } else parts.push(t.appDone(r));
        sources.push({ type: "application", id: r.refId, label: `${r.serviceName} (${r.refId})` });
      } else if (/(application|status|track|delay)/i.test(question)) parts.push(t.noApp);
    }

    if (DUE_WORDS.test(question)) {
      const mine = await Parcel.find({ owner: req.user.id }).select("_id").lean();
      const dues = await TaxDue.find({ parcel: { $in: mine.map((p) => p._id) }, status: "DUE" }).lean();
      const fees = await ServiceRequest.find({ applicant: req.user.id, fee: { $gt: 0 }, feePaid: false }).lean();
      const n = dues.length + fees.length;
      const sum = dues.reduce((s, d) => s + d.amount, 0) + fees.reduce((s, f) => s + f.fee, 0);
      parts.push(n ? t.dues(n, sum) : t.noDues);
      sources.push({ type: "due", id: "dues", label: n ? `${n} unpaid` : "No dues" });
    }

    const ident = (req.body.ulpin && String(req.body.ulpin)) || (question.match(ID_RE) || [])[1];
    if (ident) {
      const parcel = await findParcelByIdentifier(ident, { lean: true });
      if (parcel) {
        // The caller's own rights apply: the assistant never reveals more than the API would.
        const { shaped } = await shapeOne(parcel, { id: req.user.id, role: req.user.role }, { Privacy, Consent, User });
        parts.push(t.parcel(shaped));
        sources.push({ type: "parcel", id: shaped.ulpin, label: shaped.name || shaped.ulpin });
      }
    }

    const docs = await KbDoc.find({}).lean();
    for (const d of retrieve(question, docs, lang, 2)) {
      parts.push(d.text);
      sources.push({ type: "kb", id: `${d.key}:${d.lang}`, label: d.sourceLabel });
    }

    const matched = sources.length > 0;
    await audit(req, "ASSISTANT_QUERY", { resourceType: "Assistant", metadata: { lang, matched, sources: sources.length } });
    res.json({ answer: matched ? parts.join(" ") : t.notFound, sources, lang, matched });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "The assistant could not answer right now" });
  }
};
