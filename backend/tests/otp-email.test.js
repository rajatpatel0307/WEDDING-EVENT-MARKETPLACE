import test from "node:test";
import assert from "node:assert/strict";
import { renderOtpEmail } from "../src/modules/auth/otp-email.js";

const details = { code: "123456", purpose: "email", expiresInMinutes: 10 };

test("verification email escapes names and uses only configured safe support links", () => {
  const mail = renderOtpEmail({
    ...details, firstName: '<img src=x onerror="alert(1)">',
    siteUrl: "https://marrynest.example/ignored?code=secret",
    supportEmail: "help@marrynest.example",
  });
  assert.match(mail.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(mail.html, /<img src=x/);
  assert.ok(mail.html.includes('href="https://marrynest.example/contact"'));
  assert.doesNotMatch(mail.html, /code=secret/);
  assert.equal(mail.replyTo, "help@marrynest.example");
  assert.match(mail.text, /expires in 10 minutes/);
  assert.match(mail.html, /Never share this code/);
  // Inbox previews should describe the request without revealing the OTP.
  assert.doesNotMatch(mail.html.match(/<div[^>]*>(.*?)<\/div>/s)[1], /123456/);
});

test("missing or unsafe contact configuration never creates invented or executable links", () => {
  for (const siteUrl of [undefined, "javascript:alert(1)", "https://user:password@example.test"]) {
    const mail = renderOtpEmail({ ...details, siteUrl, supportEmail: "first@example.test,second@example.test" });
    assert.doesNotMatch(mail.html, /href=/);
    assert.equal(mail.replyTo, undefined);
    assert.match(mail.text, /Hello there,/);
  }
});

test("invalid codes and unsupported email purposes fail before rendering", () => {
  for (const code of ["12345", "1234567", '<img src=x>', "123 456"]) {
    assert.throws(() => renderOtpEmail({ ...details, code }));
  }
  assert.throws(() => renderOtpEmail({ ...details, purpose: "unknown" }));
});
