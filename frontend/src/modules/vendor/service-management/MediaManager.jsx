import MediaLibrary from "../../media/MediaLibrary";
export default function MediaManager({ id, onChanged, disabled = false }) {
  return (
    <MediaLibrary
      key={id}
      role="Vendor"
      fixedTarget={{ entityType: "Service", entityId: id }}
      embedded
      onChanged={onChanged}
      disabled={disabled}
    />
  );
}
