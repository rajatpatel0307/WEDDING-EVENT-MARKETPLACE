const CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export function createCheckoutLoader({
  window,
  document,
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout,
  timeoutMs = 15000,
}) {
  let pending;
  const attempt = () => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    let timer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      document.removeEventListener("securitypolicyviolation", blocked);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else resolve();
    };
    const blocked = (event) => {
      if (event.blockedURI?.startsWith("https://checkout.razorpay.com") &&
          event.effectiveDirective?.startsWith("script-src")) {
        finish(Object.assign(new Error(
          "This site's security policy blocked Razorpay checkout. Contact support to allow https://checkout.razorpay.com in the site's script policy.",
        ), { policyBlocked: true }));
      }
    };
    document.addEventListener("securitypolicyviolation", blocked);
    script.src = CHECKOUT_URL;
    script.async = true;
    script.onload = () => finish(typeof window.Razorpay === "function" ? undefined : new Error("Razorpay checkout did not initialize. Please retry."));
    script.onerror = () => finish(new Error(
      "Your browser could not reach Razorpay checkout. Check your connection and allow checkout.razorpay.com in your browser or network blocker, then retry. No payment has been started.",
    ));
    timer = setTimeout(() => finish(new Error(
      "Razorpay checkout took too long to load. Check your connection and retry. No payment has been started.",
    )), timeoutMs);
    try { document.head.appendChild(script); }
    catch { finish(new Error("Your browser blocked the secure checkout script. Allow checkout.razorpay.com and retry.")); }
  });
  return function loadCheckout() {
    if (typeof window.Razorpay === "function") return Promise.resolve();
    if (!pending) {
      pending = (async () => {
        for (let index = 0; index < 2; index++) {
          try { await attempt(); return; }
          catch (error) {
            if (error.policyBlocked || index === 1) throw error;
            if (typeof window.Razorpay === "function") return;
          }
        }
      })().finally(() => { pending = undefined; });
    }
    return pending;
  };
}

let browserLoader;
export function loadCheckout() {
  browserLoader ||= createCheckoutLoader({ window, document });
  return browserLoader();
}
