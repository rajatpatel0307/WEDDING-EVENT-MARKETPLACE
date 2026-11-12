export const requiredDocumentTypes = ["PAN", "Identity Proof", "Address Proof"];
export function verificationStepErrors(step, fields, documents = []) {
  const errors = [];
  if (step === 0) {
    if (fields.businessName.trim().length < 2)
      errors.push("Business name must contain at least 2 characters.");
    if (fields.businessDescription.trim().length < 10)
      errors.push("Business description must contain at least 10 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.businessEmail.trim()))
      errors.push("Enter a valid business email.");
    if (!/^\+?[1-9]\d{7,14}$/.test(fields.businessPhone.trim()))
      errors.push(
        "Enter a valid business phone with 8 to 15 digits, including country code.",
      );
  }
  if (step === 1 && !fields.categories.length)
    errors.push("Select at least one service category.");
  if (step === 2) {
    if (!fields.adminLocationId) errors.push("Select an active registered business / service location.");
    for (const [key, label] of [
      ["address", "Street address"],
      ["city", "City"],
      ["state", "State"],
      ["country", "Country"],
      ["postalCode", "Postal code"],
    ]) {
      if (!fields.location[key]?.trim()) errors.push(`${label} is required.`);
    }
    for (const [key, limit] of [
      ["latitude", 90],
      ["longitude", 180],
    ]) {
      const value = fields.location[key];
      if (value != null && (!Number.isFinite(value) || Math.abs(value) > limit))
        errors.push(`Enter a valid ${key} between -${limit} and ${limit}.`);
    }
  }
  if (step === 3) {
    for (const type of requiredDocumentTypes) {
      if (
        !documents.some(
          (document) =>
            document.type === type && document.status !== "Rejected",
        )
      )
        errors.push(`Upload a valid ${type} document.`);
    }
    if (documents.some((document) => document.status === "Rejected"))
      errors.push("Replace or remove rejected documents before submitting.");
  }
  return errors;
}
export function readyToSubmit(fields, documents) {
  return [0, 1, 2, 3].every(
    (step) => !verificationStepErrors(step, fields, documents).length,
  );
}
