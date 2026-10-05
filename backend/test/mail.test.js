const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const env = (vars) => { for (const k of Object.keys(vars)) vars[k] === undefined ? delete process.env[k] : (process.env[k] = vars[k]); };

test("brevo: correct endpoint, key header, sender/recipient, code in body", async () => {
  env({ MAIL_PROVIDER: "brevo", BREVO_API_KEY: "k-123", MAIL_FROM: "LandStack <me@gmail.com>", NODE_ENV: "test" });
  let call;
  global.fetch = async (url, opts) => { call = { url, opts }; return { ok: true, status: 201 }; };
  await require("../src/utils/mail").sendOtpEmail("user@example.com", "482913", 5);
  assert.equal(call.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(call.opts.headers["api-key"], "k-123");
  const b = JSON.parse(call.opts.body);
  assert.deepEqual(b.sender, { name: "LandStack", email: "me@gmail.com" });
  assert.deepEqual(b.to, [{ email: "user@example.com" }]);
  assert.ok(b.textContent.includes("482913") && b.htmlContent.includes("482913"));
});

test("resend: bearer auth and payload", async () => {
  env({ MAIL_PROVIDER: "resend", RESEND_API_KEY: "re_abc", MAIL_FROM: "LandStack <onboarding@resend.dev>" });
  let call;
  global.fetch = async (url, opts) => { call = { url, opts }; return { ok: true, status: 200 }; };
  await require("../src/utils/mail").sendOtpEmail("user@example.com", "111222", 5);
  assert.equal(call.url, "https://api.resend.com/emails");
  assert.equal(call.opts.headers.Authorization, "Bearer re_abc");
  assert.deepEqual(JSON.parse(call.opts.body).to, ["user@example.com"]);
});

test("provider HTTP errors surface without leaking the API key", async () => {
  env({ MAIL_PROVIDER: "brevo", BREVO_API_KEY: "secret-key-xyz" });
  global.fetch = async () => ({ ok: false, status: 401 });
  await assert.rejects(() => require("../src/utils/mail").sendOtpEmail("a@b.co", "123456", 5), (e) => !e.message.includes("secret-key-xyz") && /401/.test(e.message));
});

test("smtp (Gmail): uses SSL on 465 with credentials and sends the code", async () => {
  env({ MAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465", SMTP_USER: "me@gmail.com", SMTP_PASS: "app-pass", MAIL_FROM: "LandStack <me@gmail.com>" });
  let opts, sent;
  const filename = require.resolve("nodemailer");
  require.cache[filename] = { id: filename, filename, loaded: true, children: [], paths: [],
    exports: { createTransport: (o) => { opts = o; return { sendMail: async (m) => { sent = m; } }; } } };
  await require("../src/utils/mail").sendOtpEmail("user@example.com", "654321", 5);
  assert.equal(opts.host, "smtp.gmail.com");
  assert.equal(opts.secure, true);
  assert.deepEqual(opts.auth, { user: "me@gmail.com", pass: "app-pass" });
  assert.equal(sent.to, "user@example.com");
  assert.ok(sent.text.includes("654321"));
});

test("missing credentials are reported clearly", async () => {
  env({ MAIL_PROVIDER: "smtp", SMTP_HOST: undefined, SMTP_USER: undefined, SMTP_PASS: undefined });
  await assert.rejects(() => require("../src/utils/mail").sendOtpEmail("a@b.co", "123456", 5), /SMTP_HOST/);
});

test("console provider is refused in production; unknown provider rejected", async () => {
  env({ MAIL_PROVIDER: "console", NODE_ENV: "production" });
  await assert.rejects(() => require("../src/utils/mail").sendOtpEmail("a@b.co", "123456", 5), /not allowed in production/);
  env({ MAIL_PROVIDER: "carrier-pigeon", NODE_ENV: "test" });
  await assert.rejects(() => require("../src/utils/mail").sendOtpEmail("a@b.co", "123456", 5), /Unknown MAIL_PROVIDER/);
});

test("delivery: email masking, channel switch and production config check", () => {
  const d = require("../src/utils/delivery");
  env({ OTP_CHANNEL: undefined });
  assert.equal(d.channel(), "email");
  assert.equal(d.targetOf({ email: "chiraga0411@gmail.com", phone: "9889273827" }), "ch***@gmail.com");
  assert.equal(d.targetOf({ email: "a@x.in" }), "a***@x.in");
  env({ OTP_CHANNEL: "sms" });
  assert.equal(d.targetOf({ phone: "9889273827", email: "x@y.z" }), "+91 98XXXXXX27");
  env({ OTP_CHANNEL: undefined, NODE_ENV: "production", MAIL_PROVIDER: undefined });
  assert.match(d.assertDeliveryConfig(), /MAIL_PROVIDER/);
  env({ MAIL_PROVIDER: "brevo" });
  assert.equal(d.assertDeliveryConfig(), null);
  env({ NODE_ENV: "development", MAIL_PROVIDER: undefined });
  assert.equal(d.assertDeliveryConfig(), null);
});
