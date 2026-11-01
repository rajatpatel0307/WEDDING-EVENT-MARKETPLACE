import { processMail } from "./support.service.js";
export function startSupportJobs() {
  let running;
  const timer = setInterval(() => {
    if (!running)
      running = processMail()
        .catch(() => console.error("Inquiry email delivery deferred."))
        .finally(() => {
          running = null;
        });
  }, 30000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    if (running) await running;
  };
}
