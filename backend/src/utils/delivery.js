// Picks how OTP codes reach the user: OTP_CHANNEL=email (default) or sms.
const { sendOtpEmail } = require("./mail");
const { sendOtpSms } = require("./sms");

const channel = () => ((process.env.OTP_CHANNEL || "email").toLowerCase() === "sms" ? "sms" : "email");

const maskEmail = (e = "") => {
  const [local = "", domain = ""] = e.split("@");
  return `${local.slice(0, local.length > 2 ? 2 : 1)}***@${domain}`;
};
const maskPhone = (p = "") => `${p.slice(0, 2)}XXXXXX${p.slice(-2)}`;

const targetOf = (user) => (channel() === "sms" ? `+91 ${maskPhone(user.phone)}` : maskEmail(user.email));

const deliverOtp = (user, code, minutes) =>
  channel() === "sms" ? sendOtpSms(user.phone, code, minutes) : sendOtpEmail(user.email, code, minutes);

// Called at startup: refuse to run production with the dev-only "console" providers.
function assertDeliveryConfig() {
  if (process.env.NODE_ENV !== "production") return null;
  if (channel() === "sms" && (process.env.SMS_PROVIDER || "console") === "console") return "SMS_PROVIDER must be twilio or msg91 in production.";
  if (channel() === "email" && (process.env.MAIL_PROVIDER || "console") === "console") return "MAIL_PROVIDER must be smtp, brevo or resend in production.";
  return null;
}

module.exports = { channel, targetOf, deliverOtp, assertDeliveryConfig };
