export default function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="mn-icon-button"
      {...props}
    >
      {children}
    </button>
  );
}
