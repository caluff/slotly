// Canonical URL segment, assigned once. No aliases or client-supplied ownership.
export function bookingSlugBase(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/g, "") || "negocio";
}

export function isBookingSlug(value: string) {
  return value.length <= 52 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
