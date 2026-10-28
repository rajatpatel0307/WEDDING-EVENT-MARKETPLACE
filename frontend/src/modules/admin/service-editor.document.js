export function newDocument() {
  return {
    vendorId: "",
    name: "",
    categoryId: 0,
    subcategoryId: null,
    description: "",
    shortDescription: "",
    serviceType: "On site",
    attributes: {},
    pricing: {
      basePrice: 0,
      unitPrice: 0,
      minimumQuantity: 1,
      maximumQuantity: 1,
      unit: "Per Event",
      discount: 0,
      additionalCharges: 0,
      taxRate: 0,
      specialPrice: null,
      weekendPrice: null,
      seasonalPrice: null,
      seasonalFrom: null,
      seasonalTo: null,
    },
    location: {
      address: "",
      city: "",
      state: "",
      country: "India",
      zip: "",
      latitude: null,
      longitude: null,
      mode: "Both",
    },
    availability: {
      days: [1, 2, 3, 4, 5],
      start: "09:00",
      end: "20:00",
      advanceDays: 180,
      noticeHours: 24,
    },
    policies: {
      cancellation: "",
      refund: "",
      advanceRequired: false,
      advancePercentage: 0,
      rescheduling: "",
      travelCharges: 0,
      additionalCharges: "",
      setupTime: 0,
      duration: 0,
      terms: "",
    },
    seo: { slug: "", title: "", description: "", keywords: "" },
    items: [],
  };
}
export function editorDocument(data) {
  const initial = newDocument();
  if (!data) return initial;
  const document = data.document || {};
  for (const key of Object.keys(initial)) {
    if (
      ["pricing", "location", "availability", "policies", "seo"].includes(key)
    )
      initial[key] = { ...initial[key], ...document[key] };
    else if (document[key] !== undefined) initial[key] = document[key];
  }
  return {
    ...initial,
    vendorId: data.VendorId,
    name: data.ServiceName,
    categoryId: data.CategoryId,
    subcategoryId: data.SubCategoryId,
    description: data.Description || "",
    attributes: data.attributes || {},
    pricing: document.pricing
      ? initial.pricing
      : { ...initial.pricing, basePrice: Number(data.BasePrice || 0) },
    seo: { ...initial.seo, slug: data.ServiceSlug },
    items: [],
    expectedUpdatedAt: new Date(data.UpdatedAt).toISOString(),
  };
}
