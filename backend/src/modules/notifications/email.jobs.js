import { fileURLToPath } from "node:url";
import { mailConfigured, sendTransactionalMail } from "../auth/mail.service.js";
import { emailQuery, emailSchemaReady } from "./email.service.js";

const logoPath = fileURLToPath(new URL("./assets/marrynest-logo.png", import.meta.url));
const safeCodes = new Set(["EAUTH", "ECONNECTION", "EDNS", "ETLS", "ESOCKET", "ETIMEDOUT", "EENVELOPE", "EMESSAGE"]);
export function deliveryFailure(error) {
  const response = Number(error?.responseCode);
  // An explicit negative SMTP response is a definitive rejection, including
  // after DATA. Lost connections/timeouts during DATA have an unknown outcome.
  if (response >= 400 && response <= 599)
    return { certain: true, retry: response < 500, code: `SMTP_REJECTED_${Math.trunc(response)}` };
  const code = safeCodes.has(error?.code) ? error.code : "SMTP_OUTCOME_UNKNOWN";
  const certain = ["EAUTH", "ECONNECTION", "EDNS", "ETLS", "EENVELOPE"].includes(code) ||
    (["ESOCKET", "ETIMEDOUT"].includes(code) && /^(CONN|CONNECT|EHLO|HELO|STARTTLS|AUTH|MAIL FROM|RCPT TO)$/i.test(error?.command || ""));
  return { certain, retry: certain, code };
}

export async function processLifecycleMail({ send = sendTransactionalMail, query = emailQuery,
  configured = mailConfigured, ready = emailSchemaReady, limit = 10 } = {}) {
  const stats = { sent: 0, failed: 0, deferred: 0, unknown: 0 };
  if (!await ready()) return { ...stats, skipped: "schema_missing" };
  await query(`UPDATE dbo.TransactionalEmailOutbox SET DeliveryStatus='Unknown',ErrorCode='LEASE_EXPIRED',LeaseUntil=NULL,UpdatedAt=SYSUTCDATETIME()
    WHERE DeliveryStatus='Sending' AND LeaseUntil<SYSUTCDATETIME()`);
  if (!configured()) return { ...stats, skipped: "smtp_missing" };
  const count = Number.isFinite(Number(limit)) ? Math.min(50, Math.max(1, Math.floor(Number(limit)))) : 10;
  const candidates = await query(`SELECT TOP(:count) EmailId FROM dbo.TransactionalEmailOutbox
    WHERE DeliveryStatus='Pending' AND NextAttemptAt<=SYSUTCDATETIME() ORDER BY CreatedAt,EmailId`, { count });
  for (const candidate of candidates) {
    const [row] = await query(`UPDATE dbo.TransactionalEmailOutbox SET DeliveryStatus='Sending',AttemptCount=AttemptCount+1,
      LeaseUntil=DATEADD(minute,5,SYSUTCDATETIME()),UpdatedAt=SYSUTCDATETIME()
      OUTPUT inserted.* WHERE EmailId=:id AND DeliveryStatus='Pending' AND NextAttemptAt<=SYSUTCDATETIME()`, { id: candidate.EmailId });
    if (!row) continue; // Another process already claimed this event.
    let accepted = false;
    try {
      await send({ to: row.RecipientEmail, subject: row.Subject, text: row.TextBody, html: row.HtmlBody,
        messageId: `<${row.EmailId.toLowerCase()}@notifications.marrynest>`,
        ...(row.ReplyTo ? { replyTo: row.ReplyTo } : {}),
        attachments: [{ filename: "marrynest-logo.png", path: logoPath, cid: "marrynest-logo", contentType: "image/png", contentDisposition: "inline" }],
      });
      accepted = true;
      await query(`UPDATE dbo.TransactionalEmailOutbox SET DeliveryStatus='Sent',SentAt=SYSUTCDATETIME(),LeaseUntil=NULL,
        ErrorCode=NULL,UpdatedAt=SYSUTCDATETIME() WHERE EmailId=:id AND DeliveryStatus='Sending' AND AttemptCount=:attempt`, { id: row.EmailId, attempt: row.AttemptCount });
      stats.sent++;
    } catch (error) {
      const failure = accepted ? { certain: false, code: "RECEIPT_WRITE_FAILED" } : deliveryFailure(error);
      const retry = failure.certain && failure.retry && row.AttemptCount < 5;
      const status = !failure.certain ? "Unknown" : retry ? "Pending" : "Failed";
      // Never include raw SMTP responses, recipient addresses or bodies in logs.
      console.error("Lifecycle email delivery update", { emailId: row.EmailId, status, code: failure.code });
      await query(`UPDATE dbo.TransactionalEmailOutbox SET DeliveryStatus=:status,ErrorCode=:code,LeaseUntil=NULL,
        NextAttemptAt=DATEADD(second,:delay,SYSUTCDATETIME()),UpdatedAt=SYSUTCDATETIME()
        WHERE EmailId=:id AND DeliveryStatus='Sending' AND AttemptCount=:attempt`, {
        id: row.EmailId, attempt: row.AttemptCount, status, code: failure.code,
        delay: Math.min(3600, 30 * 2 ** (row.AttemptCount - 1)),
      });
      stats[status === "Unknown" ? "unknown" : retry ? "deferred" : "failed"]++;
    }
  }
  return stats;
}

export function startEmailJobs() {
  let running;
  const run = () => {
    if (!running) running = processLifecycleMail()
      .then(result => {
        if (result.skipped === "smtp_missing") console.error("Lifecycle emails queued: configure SMTP_HOST and SMTP_FROM for delivery.");
      })
      .catch(() => console.error("Lifecycle email worker deferred; inspect the email outbox."))
      .finally(() => { running = null; });
  };
  const timer = setInterval(run, 30000);
  timer.unref();
  run();
  return async () => { clearInterval(timer); if (running) await running; };
}
