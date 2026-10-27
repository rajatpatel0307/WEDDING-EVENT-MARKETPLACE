// Lucide no longer includes brand marks; keep these small brand SVGs local.
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  "aria-hidden": true,
};
export function Instagram({ size = 17 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
    </svg>
  );
}
export function Facebook({ size = 17 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M14 22V13h3l.5-4H14V7c0-1 .5-2 2-2h2V1.5c-.6-.1-1.7-.3-3-.3-3.2 0-5 2-5 5V9H7v4h3v9" />
    </svg>
  );
}
export function Youtube({ size = 17 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 6 3-6 3z" />
    </svg>
  );
}
export function Linkedin({ size = 17 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 10v7m4 0v-7m0 3c0-4 6-4 6 0v4" />
      <circle cx="7" cy="7" r=".6" fill="currentColor" />
    </svg>
  );
}
