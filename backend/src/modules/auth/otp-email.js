import { siteOrigin, validEmail } from "../notifications/email.templates.js";

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export function renderOtpEmail({ code, purpose, firstName, expiresInMinutes, siteUrl, supportEmail }) {
  if (!/^\d{6}$/.test(code) || !["email", "reset"].includes(purpose)) {
    throw new Error("Invalid verification email details.");
  }
  const reset = purpose === "reset";
  const name = String(firstName || "").trim().slice(0, 100);
  const greeting = name ? `Hi ${name},` : "Hello there,";
  const title = reset ? "Reset your password" : "Verify your email address";
  const subject = reset ? "Your MarryNest password reset code" : "Your MarryNest verification code";
  const introduction = reset
    ? "We received a request to reset your MarryNest password. Enter the code below on the password reset screen to continue."
    : "Welcome to MarryNest. Enter the code below on the verification screen to confirm your email and continue planning your celebration.";
  const unsolicited = reset
    ? "Didn't request a password reset? You can safely ignore this email. Your password will stay the same."
    : "Didn't create an account or request this code? You can safely ignore this email.";
  const origin = siteOrigin(siteUrl);
  const contactUrl = origin ? `${origin}/contact` : null;
  const replyTo = validEmail(supportEmail) ? supportEmail : null;
  const expiry = `This code expires in ${expiresInMinutes} minutes.`;
  const security = "Never share this code with anyone. MarryNest will never ask for it by phone or message.";
  const text = [
    "MarryNest | Wedding & Event Marketplace", title, greeting, introduction,
    `Your ${reset ? "password reset" : "verification"} code: ${code}`, expiry,
    "If it expires, request a new code on the verification screen.", security, unsolicited,
    replyTo ? `Need help? Email ${replyTo}` : "",
    contactUrl ? `Contact & support: ${contactUrl}` : "",
    "With care,\nThe MarryNest team", "This is an automated account security email.",
  ].filter(Boolean).join("\n\n");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)} | MarryNest</title>
<style>
@media only screen and (max-width:600px){
  .email-outer{padding:16px 10px!important}
  .email-content{padding:28px 22px!important}
  .email-heading{font-size:28px!important}
  .email-code{font-size:34px!important;letter-spacing:7px!important}
}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#faf7f3;font-family:Arial,Helvetica,sans-serif;color:#45343b;-webkit-text-size-adjust:100%">
<div style="display:none!important;visibility:hidden;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(`${reset ? "Password reset" : "Email verification"}: ${expiry} Keep it private.`)}</div>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#faf7f3" style="table-layout:fixed">
<tr><td class="email-outer" align="center" style="padding:40px 16px">
<!--[if mso]><table role="presentation" width="580" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout:fixed;width:100%;max-width:580px;background-color:#ffffff;border:1px solid #eadfe0;border-radius:18px;overflow:hidden">
<tr><td align="center" bgcolor="#fffcf8" style="padding:22px 24px 18px;border-top:5px solid #8c414e;border-bottom:1px solid #f0e6e5">
<img src="cid:marrynest-logo" width="192" height="94" alt="MarryNest" style="display:block;width:192px;max-width:100%;height:auto;border:0;margin:0 auto">
</td></tr>
<tr><td class="email-content" style="padding:36px 40px 32px;word-wrap:break-word;overflow-wrap:break-word">
<p style="margin:0 0 12px;font-size:10px;line-height:1.5;font-weight:bold;letter-spacing:2px;color:#9a6874;text-transform:uppercase">${reset ? "ACCOUNT SECURITY" : "WELCOME TO YOUR NEXT CHAPTER"}</p>
<h1 class="email-heading" style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.25;font-weight:normal;color:#68313d">${escapeHtml(title)}</h1>
<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#45343b">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#75636b">${escapeHtml(introduction)}</p>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fcf6f7;border:1px solid #ecdce1;border-radius:12px">
<tr><td align="center" style="padding:23px 12px 22px">
<p style="margin:0 0 12px;font-size:10px;font-weight:bold;line-height:1.5;letter-spacing:1.7px;color:#8c6571;text-transform:uppercase">YOUR ${reset ? "PASSWORD RESET" : "VERIFICATION"} CODE</p>
<p class="email-code" dir="ltr" style="margin:0 0 14px;padding-left:8px;font-family:Consolas,'Courier New',monospace;font-size:40px;line-height:1.25;font-weight:bold;letter-spacing:8px;white-space:nowrap;color:#68313d">${code}</p>
<p style="margin:0;font-size:12px;line-height:1.6;color:#826c76">Expires in <strong style="color:#68313d">${expiresInMinutes} minutes</strong></p>
</td></tr></table>
<p style="margin:14px 0 24px;text-align:center;font-size:11px;line-height:1.7;color:#95818a">If it expires, request a new code on the verification screen.</p>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-left:3px solid #cda76c;background-color:#fffcf6">
<tr><td style="padding:14px 16px">
<p style="margin:0 0 4px;font-size:12px;line-height:1.6;font-weight:bold;color:#795d37">Keep your account safe</p>
<p style="margin:0;font-size:12px;line-height:1.8;color:#7f705d">${escapeHtml(security)}</p>
</td></tr></table>
<p style="margin:22px 0 0;font-size:12px;line-height:1.8;color:#8c7a83">${escapeHtml(unsolicited)}</p>
<p style="margin:24px 0 0;font-size:13px;line-height:1.8;color:#75636b">With care,<br><strong style="color:#68313d">The MarryNest team</strong></p>
</td></tr>
<tr><td align="center" bgcolor="#fffcf8" style="padding:22px;border-top:1px solid #f0e6e5;font-size:11px;line-height:1.9;color:#9a858e">
<strong style="font-size:12px;letter-spacing:.4px;color:#8c414e">MarryNest</strong><br>Thoughtfully planned. Wholeheartedly celebrated.<br>
${replyTo ? `<a href="mailto:${escapeHtml(replyTo)}" style="color:#8c414e;text-decoration:underline">${escapeHtml(replyTo)}</a><br>` : ""}
${contactUrl ? `<a href="${escapeHtml(contactUrl)}" style="color:#8c414e;text-decoration:underline">Contact &amp; support</a><br>` : ""}
<span style="font-size:10px;color:#aa969f">This is an automated account security email.</span>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
  return { subject, text, html, ...(replyTo ? { replyTo } : {}) };
}
