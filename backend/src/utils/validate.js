// RRS-SR-003 shared primitives. Server-local calendar day defines "not in the past".
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

function isValidDate(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return value >= today;
}

// Basic tag removal required by the classroom plan, not a general HTML sanitizer.
const stripHtml = (value) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '';

module.exports = { isNonEmptyString, isPositiveNumber, isValidDate, stripHtml };
