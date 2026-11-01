import { processCleanup } from "./media.cleanup.js";
export function startMediaJobs() {
  let running;
  const tick = () => {
    if (running) return;
    running = processCleanup({ apply: true, limit: 10 })
      .catch(() => console.error("Media cleanup deferred; it will retry."))
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, 300000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    if (running) await running;
  };
}
