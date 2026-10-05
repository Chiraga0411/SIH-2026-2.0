process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.NODE_ENV = "test";
process.env.DISABLE_RATE_LIMIT = "1";
process.env.LOGIN_OTP = "always"; // most tests cover the strict mode; password-only mode has its own test below
process.env.FRONTEND_ORIGIN = "http://localhost:5173";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fake = require("./fakeModels");
fake.install();
const createApp = require("../src/app");

let server, base;
test.before(async () => {
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = async (method, url, body, token) => {
  const res = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const emailOf = (phone) => fake.User.rows.find((u) => u.phone === phone).email;
const lastCode = (phone) => [...fake.sentMail].reverse().find((m) => m.email === emailOf(phone)).code;
const wrongCode = (real) => (real === "000000" ? "111111" : "000000");

async function registerCitizen(phone, email, password = "Secret123") {
  await call("POST", "/api/auth/register", { name: "Asha Verma", phone, email, password });
  const v = await call("POST", "/api/auth/register/verify", { phone, otp: lastCode(phone) });
  return v.body;
}

test("registration validates input", async () => {
  const bad = { name: "Asha Verma", phone: "9876500001", email: "asha@example.com", password: "Secret123" };
  assert.equal((await call("POST", "/api/auth/register", { ...bad, email: "nope" })).status, 400);
  assert.equal((await call("POST", "/api/auth/register", { ...bad, phone: "12345" })).status, 400);
  assert.equal((await call("POST", "/api/auth/register", { ...bad, password: "short" })).status, 400);
  assert.equal((await call("POST", "/api/auth/register", { ...bad, password: "onlyletters" })).status, 400);
  assert.equal(fake.sentMail.length, 0, "no email for invalid input");
});

test("register -> OTP -> token; no token before OTP; OTP is hashed; OTP response never contains the code", async () => {
  const phone = "9876500002";
  const r = await call("POST", "/api/auth/register", { name: "Ravi Kumar", phone, email: "ravi@example.com", password: "Secret123" });
  assert.equal(r.status, 200);
  assert.equal(r.body.token, undefined);
  assert.ok(!JSON.stringify(r.body).includes(lastCode(phone)), "response must not leak the code");
  const user = fake.User.rows.find((u) => u.phone === phone);
  assert.ok(user.passwordHash.startsWith("$2"), "password stored as bcrypt hash");
  assert.notEqual(fake.Otp.rows.find((o) => String(o.userId) === String(user._id)).codeHash, lastCode(phone));

  const bad = await call("POST", "/api/auth/register/verify", { phone, otp: wrongCode(lastCode(phone)) });
  assert.equal(bad.status, 401);
  const ok = await call("POST", "/api/auth/register/verify", { phone, otp: lastCode(phone) });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(ok.body.user.role, "citizen");
  assert.equal(ok.body.user.passwordHash, undefined);

  const me = await call("GET", "/api/auth/me", null, ok.body.token);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.phone, phone);

  const dup = await call("POST", "/api/auth/register", { name: "X Y", phone, email: "other@example.com", password: "Secret123" });
  assert.equal(dup.status, 409);
});

test("login needs password AND OTP; wrong password and unknown user look identical", async () => {
  const phone = "9876500003";
  await registerCitizen(phone, "meena@example.com");

  const wrongPw = await call("POST", "/api/auth/login", { identifier: phone, password: "Wrong1234" });
  const unknown = await call("POST", "/api/auth/login", { identifier: "9876599999", password: "Wrong1234" });
  assert.equal(wrongPw.status, 401);
  assert.deepEqual(wrongPw, unknown);

  const step1 = await call("POST", "/api/auth/login", { identifier: "meena@example.com", password: "Secret123" });
  assert.equal(step1.status, 200);
  assert.equal(step1.body.token, undefined, "password alone must not log in");

  const bad = await call("POST", "/api/auth/login/verify", { identifier: phone, otp: wrongCode(lastCode(phone)) });
  assert.equal(bad.status, 401);
  const code = lastCode(phone);
  const ok = await call("POST", "/api/auth/login/verify", { identifier: phone, otp: code });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  const reuse = await call("POST", "/api/auth/login/verify", { identifier: phone, otp: code });
  assert.equal(reuse.status, 401, "OTP is single-use");
});

test("OTP locks after 5 wrong attempts, even if the right code is then supplied", async () => {
  const phone = "9876500004";
  await registerCitizen(phone, "lock@example.com");
  await call("POST", "/api/auth/login", { identifier: phone, password: "Secret123" });
  const code = lastCode(phone);
  let last;
  for (let i = 0; i < 5; i++) last = await call("POST", "/api/auth/login/verify", { identifier: phone, otp: wrongCode(code) });
  assert.equal(last.status, 429);
  assert.equal((await call("POST", "/api/auth/login/verify", { identifier: phone, otp: code })).status, 401);
});

test("expired OTP is rejected", async () => {
  const phone = "9876500005";
  await registerCitizen(phone, "exp@example.com");
  await call("POST", "/api/auth/login", { identifier: phone, password: "Secret123" });
  const user = fake.User.rows.find((u) => u.phone === phone);
  fake.Otp.rows.find((o) => String(o.userId) === String(user._id) && o.purpose === "login").expiresAt = new Date(Date.now() - 1000);
  assert.equal((await call("POST", "/api/auth/login/verify", { identifier: phone, otp: lastCode(phone) })).status, 401);
});

test("resend has a cooldown, and a new code invalidates the old one", async () => {
  const phone = "9876500006";
  await registerCitizen(phone, "resend@example.com");
  await call("POST", "/api/auth/login", { identifier: phone, password: "Secret123" });
  const first = lastCode(phone);
  const count = fake.sentMail.length;
  assert.equal((await call("POST", "/api/auth/resend-otp", { identifier: phone, purpose: "login" })).status, 429);
  assert.equal(fake.sentMail.length, count, "no email during cooldown");

  const user = fake.User.rows.find((u) => u.phone === phone);
  fake.Otp.rows.find((o) => String(o.userId) === String(user._id)).lastSentAt = new Date(Date.now() - 60000);
  assert.equal((await call("POST", "/api/auth/resend-otp", { identifier: phone, purpose: "login" })).status, 200);
  assert.equal(fake.sentMail.length, count + 1);
  if (lastCode(phone) !== first) {
    assert.equal((await call("POST", "/api/auth/login/verify", { identifier: phone, otp: first })).status, 401);
  }
  assert.equal((await call("POST", "/api/auth/login/verify", { identifier: phone, otp: lastCode(phone) })).status, 200);

  const none = await call("POST", "/api/auth/resend-otp", { identifier: "9876588888", purpose: "login" });
  assert.equal(none.status, 200, "resend for unknown number looks the same");
  assert.equal(fake.sentMail.filter((m) => m.email.startsWith("nobody")).length, 0);
});

test("account locks after 5 wrong passwords", async () => {
  const phone = "9876500007";
  await registerCitizen(phone, "pw@example.com");
  for (let i = 0; i < 5; i++) assert.equal((await call("POST", "/api/auth/login", { identifier: phone, password: "Wrong1234" })).status, 401);
  assert.equal((await call("POST", "/api/auth/login", { identifier: phone, password: "Secret123" })).status, 429);
});

test("official login uses real hashed passwords; no default demo password", async () => {
  await fake.User.create({ employeeId: "ADM-001", name: "Ops Admin", role: "admin", passwordHash: await bcrypt.hash("Str0ngAdminPass!", 4) });
  assert.equal((await call("POST", "/api/auth/official-login", { employeeId: "ADM-001", password: "demo123" })).status, 401);
  assert.equal((await call("POST", "/api/auth/official-login", { employeeId: "NOPE-1", password: "demo123" })).status, 401);
  const ok = await call("POST", "/api/auth/official-login", { employeeId: "adm-001", password: "Str0ngAdminPass!" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, "admin");
});

test("protected routes and role guard", async () => {
  const citizen = await registerCitizen("9876500008", "guard@example.com");
  assert.equal((await call("GET", "/api/audit-log")).status, 401);
  assert.equal((await call("GET", "/api/audit-log", null, "garbage")).status, 401);
  assert.equal((await call("GET", "/api/audit-log", null, citizen.token)).status, 403, "citizen cannot read audit log");
  assert.equal((await call("GET", "/api/alerts", null, citizen.token)).status, 403);
});

test("tokens: forged, alg=none, expired and deactivated-user tokens are rejected", async () => {
  const c = await registerCitizen("9876500009", "tok@example.com");
  const id = c.user.id;
  const forged = jwt.sign({ role: "admin" }, "some-other-secret-some-other-secret-xx", { subject: id });
  assert.equal((await call("GET", "/api/auth/me", null, forged)).status, 401);
  const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url") + "." + Buffer.from(JSON.stringify({ sub: id, role: "admin" })).toString("base64url") + ".";
  assert.equal((await call("GET", "/api/auth/me", null, none)).status, 401);
  const expired = jwt.sign({ role: "citizen" }, process.env.JWT_SECRET, { subject: id, expiresIn: -10 });
  assert.equal((await call("GET", "/api/auth/me", null, expired)).status, 401);

  assert.equal((await call("GET", "/api/auth/me", null, c.token)).status, 200);
  fake.User.rows.find((u) => String(u._id) === id).isActive = false;
  assert.equal((await call("GET", "/api/auth/me", null, c.token)).status, 401);
});

test("role in a token is ignored in favour of the database role", async () => {
  const c = await registerCitizen("9876500010", "esc@example.com");
  const escalated = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { subject: c.user.id, expiresIn: "1h" });
  assert.equal((await call("GET", "/api/audit-log", null, escalated)).status, 403);
});

test("default mode: password-only login (no code), signup still verifies the email", async () => {
  const phone = "9876500011";
  await registerCitizen(phone, "simple@example.com");
  process.env.LOGIN_OTP = "off";
  try {
    const mails = fake.sentMail.length;
    const bad = await call("POST", "/api/auth/login", { identifier: phone, password: "Wrong1234" });
    assert.equal(bad.status, 401);
    const ok = await call("POST", "/api/auth/login", { identifier: "simple@example.com", password: "Secret123" });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token, "token issued straight after the password");
    assert.equal(fake.sentMail.length, mails, "no email sent on login");
    assert.equal((await call("GET", "/api/auth/me", null, ok.body.token)).status, 200);
    assert.equal((await call("POST", "/api/auth/login/verify", { identifier: phone, otp: "123456" })).status, 400);

    // unverified accounts can never log in
    await call("POST", "/api/auth/register", { name: "Not Yet", phone: "9876500012", email: "pending@example.com", password: "Secret123" });
    const pending = await call("POST", "/api/auth/login", { identifier: "9876500012", password: "Secret123" });
    assert.equal(pending.status, 401);
    assert.equal(pending.body.token, undefined);

    // lockout still applies without a code
    for (let i = 0; i < 5; i++) await call("POST", "/api/auth/login", { identifier: phone, password: "Wrong1234" });
    assert.equal((await call("POST", "/api/auth/login", { identifier: phone, password: "Secret123" })).status, 429);
  } finally {
    process.env.LOGIN_OTP = "always";
  }
});
