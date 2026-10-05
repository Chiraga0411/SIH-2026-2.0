// Email delivery for OTP codes. Provider is chosen with MAIL_PROVIDER: console | smtp | brevo | resend
const provider = () => (process.env.MAIL_PROVIDER || "console").toLowerCase();
const fromHeader = () => process.env.MAIL_FROM || "LandStack <no-reply@example.com>";
const SUBJECT = "Your LandStack verification code";

const parseFrom = (v) => {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(v);
  return m ? { name: m[1].replace(/^"|"$/g, "") || "LandStack", email: m[2] } : { name: "LandStack", email: v.trim() };
};

const textBody = (code, minutes) =>
  `Your LandStack verification code is ${code}.\n\nIt expires in ${minutes} minutes and can be used only once.\nIf you did not request this, ignore this email. Never share this code with anyone.`;

const htmlBody = (code, minutes) =>
  `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e3e8f0;border-radius:12px">
  <h2 style="margin:0 0 8px;color:#0b3d91">LandStack</h2>
  <p style="color:#334">Your verification code is:</p>
  <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:12px 0;color:#0b3d91">${code}</p>
  <p style="color:#556;font-size:13px">It expires in ${minutes} minutes and can be used only once. If you did not request it, ignore this email. Never share this code with anyone.</p></div>`;

async function viaSmtp(to, code, minutes) {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
  if (!host || !user || !pass) throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS are required");
  const port = Number(process.env.SMTP_PORT) || 465;
  const nodemailer = require("nodemailer");
  const transport = nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  await transport.sendMail({ from: fromHeader(), to, subject: SUBJECT, text: textBody(code, minutes), html: htmlBody(code, minutes) });
}

async function viaResend(to, code, minutes) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is required");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromHeader(), to: [to], subject: SUBJECT, text: textBody(code, minutes), html: htmlBody(code, minutes) }),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

async function viaBrevo(to, code, minutes) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY is required");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: parseFrom(fromHeader()), to: [{ email: to }], subject: SUBJECT,
      textContent: textBody(code, minutes), htmlContent: htmlBody(code, minutes)
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Brevo responded ${res.status}`);
}

async function sendOtpEmail(to, code, minutes) {
  const p = provider();
  if (p === "smtp") return viaSmtp(to, code, minutes);
  if (p === "resend") return viaResend(to, code, minutes);
  if (p === "brevo") return viaBrevo(to, code, minutes);
  if (p === "console") {
    if (process.env.NODE_ENV === "production") throw new Error("MAIL_PROVIDER=console is not allowed in production");
    console.log(`[DEV EMAIL] OTP for ${to}: ${code}`);
    return;
  }
  throw new Error(`Unknown MAIL_PROVIDER "${p}"`);
}

module.exports = { sendOtpEmail, parseFrom };
