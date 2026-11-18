const searchText = value => String(value).normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();

export function filterDropdownOptions(options, query) {
  const search = searchText(query);
  return options.filter(option => searchText(option.label).includes(search));
}

export function filterDropdownPosition(rect, viewport) {
  const gap = 6;
  const below = viewport.height - rect.bottom - gap - 12;
  const above = rect.top - gap - 12;
  const opensUp = below < 220 && above > below;
  const width = Math.min(Math.max(rect.width, 240), viewport.width - 24);
  return {
    width,
    left: Math.max(12, Math.min(rect.left, viewport.width - width - 12)),
    ...(opensUp ? { bottom: viewport.height - rect.top + gap } : { top: rect.bottom + gap }),
    listHeight: Math.max(60, Math.min(240, (opensUp ? above : below) - 64)),
  };
}
