export function cartQuantityBounds(line) {
  return {
    min: line.minimum ?? 1,
    max: Math.min(line.maximum ?? 100000, line.stock ?? 100000),
  };
}

export function validCartQuantity(value, line) {
  const quantity = Number(value);
  const { min, max } = cartQuantityBounds(line);
  return String(value).trim() !== "" && Number.isInteger(quantity) &&
    quantity >= min && quantity <= max;
}
