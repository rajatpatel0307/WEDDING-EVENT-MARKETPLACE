import * as repo from "../admin/admin.repository.js";
// Call only after verifying an eligible service or creating a genuine enquiry.
export async function recordServiceMetric(serviceId, kind, transaction) {
  if (!["Views", "Enquiries"].includes(kind))
    throw new Error("Unknown metric.");
  const write = (tx) =>
    repo.select(
      `UPDATE dbo.ServiceDailyMetrics WITH(UPDLOCK,SERIALIZABLE) SET [${kind}]=[${kind}]+1 WHERE ServiceId=:serviceId AND MetricDate=CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME())); IF @@ROWCOUNT=0 INSERT INTO dbo.ServiceDailyMetrics(ServiceId,MetricDate,[${kind}]) VALUES(:serviceId,CONVERT(date,DATEADD(minute,330,SYSUTCDATETIME())),1)`,
      { serviceId },
      tx,
    );
  return transaction ? write(transaction) : repo.transaction(write);
}
