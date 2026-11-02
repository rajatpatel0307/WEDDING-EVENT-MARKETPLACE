export default function IconButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="mn-icon-button inline-flex items-center justify-center w-[36px] h-[36px] rounded-full bg-transparent border-0 text-inherit shrink-0 hover:bg-[#f3e9e7]"
      {...props}
    >
      {children}
    </button>
  );
}
