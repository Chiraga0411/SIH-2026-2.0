// SMS delivery. Provider is chosen with SMS_PROVIDER: console | twilio | msg91
const provider = () => (process.env.SMS_PROVIDER || "console").toLowerCase();

async function sendWithTwilio(phone, text) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials missing");
  const body = new URLSearchParams({ To: `+91${phone}`, Body: text });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) body.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else if (process.env.TWILIO_FROM) body.set("From", process.env.TWILIO_FROM);
  else throw new Error("Set TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!res.ok) throw new Error(`Twilio responded ${res.status}`);
}

async function sendWithMsg91(phone, code) {
  const { MSG91_AUTH_KEY: key, MSG91_TEMPLATE_ID: template } = process.env;
  if (!key || !template) throw new Error("MSG91 credentials missing");
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.search = new URLSearchParams({ template_id: template, mobile: `91${phone}`, otp: code }).toString();
  const res = await fetch(url, { method: "POST", headers: { authkey: key, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`MSG91 responded ${res.status}`);
}

async function sendOtpSms(phone, code, minutes) {
  const p = provider();
  if (p === "twilio") return sendWithTwilio(phone, `Your LandStack verification code is ${code}. It expires in ${minutes} minutes. Do not share it.`);
  if (p === "msg91") return sendWithMsg91(phone, code);
  if (p === "console") {
    if (process.env.NODE_ENV === "production") throw new Error("SMS_PROVIDER=console is not allowed in production");
    console.log(`[DEV SMS] OTP for ${phone}: ${code}`);
    return;
  }
  throw new Error(`Unknown SMS_PROVIDER "${p}"`);
}

module.exports = { sendOtpSms };
