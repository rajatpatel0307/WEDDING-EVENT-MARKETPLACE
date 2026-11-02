export function readyToSubmit(fields, documents) {
  const l = fields.location;
  return (
    fields.businessName.trim().length >= 2 &&
    fields.businessDescription.trim().length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.businessEmail.trim()) &&
    /^\+?[1-9]\d{7,14}$/.test(fields.businessPhone.trim()) &&
    fields.categories.length > 0 &&
    [l.address, l.city, l.state, l.country, l.postalCode].every((v) =>
      v.trim(),
    ) &&
    documents.length > 0 &&
    documents.every((d) => d.status !== "Rejected")
  );
}
