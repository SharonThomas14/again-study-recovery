export function numericDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y.slice(-2)}`;
}
export function parseNumericDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return null;
  const result = `20${m[3]}-${m[2]}-${m[1]}`,
    d = new Date(result + "T12:00:00");
  return !Number.isNaN(+d) &&
    d.getDate() === +m[1] &&
    d.getMonth() + 1 === +m[2]
    ? result
    : null;
}
