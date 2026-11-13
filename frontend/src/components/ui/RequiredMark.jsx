export default function RequiredMark() {
  return (
    <>
      <span className="text-[#b34242]" aria-hidden="true"> *</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}
