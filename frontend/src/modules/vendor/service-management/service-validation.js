const amountIsValid = (value, max = 100000000) =>
  Number.isFinite(value) &&
  value >= 0 &&
  value <= max &&
  Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;

const numberIsValid = (value, max = 1000000) =>
  Number.isFinite(value) && value >= 0 && value <= max;

export function validateService(data, { submit = false, imageCount = 0 } = {}) {
  if (
    !data.name.trim() ||
    data.name.trim().length < 2 ||
    data.name.trim().length > 200
  )
    return {
      step: 0,
      message: "Enter a service name with 2 to 200 characters.",
    };
  if (!Number.isInteger(data.categoryId) || data.categoryId < 1)
    return { step: 0, message: "Choose a service category." };
  if (
    data.subcategoryId !== null &&
    (!Number.isInteger(data.subcategoryId) || data.subcategoryId < 1)
  )
    return { step: 0, message: "Choose a valid subcategory." };
  if (data.shortDescription.length > 500 || data.description.length > 10000)
    return { step: 0, message: "Descriptions exceed their allowed length." };
  if (
    !["On site", "Rental", "Sale", "Digital", "Hybrid"].includes(
      data.serviceType,
    )
  )
    return { step: 0, message: "Choose a valid service type." };
  if (
    !data.seo.slug.trim() ||
    data.seo.slug.trim().length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.seo.slug.trim())
  )
    return {
      step: 7,
      message: "Enter a URL slug using lowercase letters, numbers and hyphens.",
    };
  if (
    data.seo.title.length > 200 ||
    data.seo.description.length > 500 ||
    data.seo.keywords.length > 500
  )
    return { step: 7, message: "SEO fields exceed their allowed length." };

  const pricing = data.pricing;
  if (
    pricing.type != null &&
    ![
      "Fixed",
      "PerPerson",
      "PerHour",
      "PerDay",
      "PerItem",
      "CustomQuote",
    ].includes(pricing.type)
  )
    return { step: 2, message: "Choose a valid pricing type." };
  for (const key of ["minimumPrice", "maximumPrice"])
    if (pricing[key] != null && !amountIsValid(pricing[key]))
      return {
        step: 2,
        message: "Price limits must be valid non-negative amounts.",
      };
  if (
    pricing.minimumPrice != null &&
    pricing.maximumPrice != null &&
    pricing.maximumPrice < pricing.minimumPrice
  )
    return {
      step: 2,
      message: "Maximum price must be at least minimum price.",
    };
  for (const key of ["basePrice", "unitPrice", "additionalCharges"])
    if (!amountIsValid(pricing[key]))
      return {
        step: 2,
        message: "Enter valid prices with no more than 2 decimal places.",
      };
  for (const key of ["specialPrice", "weekendPrice", "seasonalPrice"])
    if (pricing[key] !== null && !amountIsValid(pricing[key]))
      return {
        step: 2,
        message: "Optional prices must be valid non-negative amounts.",
      };
  if (
    !numberIsValid(pricing.minimumQuantity) ||
    !numberIsValid(pricing.maximumQuantity) ||
    pricing.maximumQuantity < pricing.minimumQuantity
  )
    return {
      step: 2,
      message: "Maximum quantity must be at least the minimum.",
    };
  if (!amountIsValid(pricing.discount, 100))
    return { step: 2, message: "Discount must be between 0 and 100." };
  if (!amountIsValid(pricing.taxRate ?? 0, 100))
    return { step: 2, message: "Tax must be between 0 and 100." };
  const seasonalEmpty =
    !pricing.seasonalFrom &&
    !pricing.seasonalTo &&
    pricing.seasonalPrice === null;
  const seasonalComplete =
    pricing.seasonalFrom &&
    pricing.seasonalTo &&
    /^\d{4}-\d{2}-\d{2}$/.test(pricing.seasonalFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(pricing.seasonalTo) &&
    pricing.seasonalTo >= pricing.seasonalFrom &&
    pricing.seasonalPrice !== null;
  if (!seasonalEmpty && !seasonalComplete)
    return {
      step: 2,
      message:
        "Complete the seasonal date range and price, or clear all three.",
    };
  if (
    ![
      "Per Event",
      "Per Day",
      "Per Hour",
      "Per Plate",
      "Per Person",
      "Per KM",
      "Per Vehicle",
      "Per Item",
      "Custom",
    ].includes(pricing.unit)
  )
    return { step: 2, message: "Choose a valid pricing unit." };

  const availability = data.availability;
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(availability.start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(availability.end) ||
    availability.end <= availability.start
  )
    return { step: 6, message: "Working hours must end after they start." };
  if (
    !Array.isArray(availability.days) ||
    availability.days.length > 7 ||
    availability.days.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    ) ||
    !numberIsValid(availability.advanceDays, 730) ||
    !Number.isInteger(availability.advanceDays) ||
    !numberIsValid(availability.noticeHours, 8760) ||
    !Number.isInteger(availability.noticeHours)
  )
    return {
      step: 6,
      message: "Enter valid booking notice and advance limits.",
    };
  const location = data.location;
  if (
    location.address.length > 300 ||
    location.city.length > 100 ||
    location.state.length > 100 ||
    location.country.length > 100 ||
    location.zip.length > 20 ||
    (location.latitude !== null &&
      (!Number.isFinite(location.latitude) ||
        location.latitude < -90 ||
        location.latitude > 90)) ||
    (location.longitude !== null &&
      (!Number.isFinite(location.longitude) ||
        location.longitude < -180 ||
        location.longitude > 180)) ||
    !["Vendor location", "Customer location", "Both", "Service area"].includes(
      location.mode,
    )
  )
    return { step: 5, message: "Check the location details and coordinates." };
  if (
    !amountIsValid(data.policies.advancePercentage, 100) ||
    !amountIsValid(data.policies.travelCharges) ||
    !numberIsValid(data.policies.setupTime) ||
    !numberIsValid(data.policies.duration) ||
    !Number.isInteger(data.policies.duration) ||
    !Number.isInteger(data.policies.setupTime)
  )
    return { step: 7, message: "Enter valid policy amounts and durations." };
  if (data.items.length > 100)
    return { step: 3, message: "A service can have up to 100 items." };
  if (
    data.items.some(
      (item) =>
        !item.name.trim() ||
        item.name.trim().length > 200 ||
        item.description.length > 500 ||
        item.unit.length > 50 ||
        !amountIsValid(item.price) ||
        !numberIsValid(item.quantity),
    )
  )
    return {
      step: 3,
      message: "Complete each item name, quantity and valid price.",
    };
  if (
    data.policies.cancellation.length > 2000 ||
    data.policies.refund.length > 2000 ||
    data.policies.rescheduling.length > 2000 ||
    data.policies.additionalCharges.length > 2000 ||
    data.policies.terms.length > 10000
  )
    return { step: 7, message: "Policy text exceeds its allowed length." };

  if (submit) {
    if (!data.shortDescription.trim())
      return { step: 0, message: "Add a short description before submitting." };
    if (data.description.trim().length < 20)
      return {
        step: 0,
        message: "Detailed description must be at least 20 characters.",
      };
    if (!data.location.city.trim())
      return { step: 5, message: "Add your service city before submitting." };
    if (!data.policies.cancellation.trim())
      return {
        step: 7,
        message: "Add a cancellation policy before submitting.",
      };
    if (imageCount < 1)
      return {
        step: 4,
        message: "Add at least one service image before submitting.",
      };
  }
  return null;
}
