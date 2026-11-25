/**
 * Time formatting & slot utilities for Kitchen Hours
 */

/**
 * Format 24-hour DB time string ("08:00:00" or "21:30") to 12-hour readable string ("08:00 AM", "09:30 PM")
 */
export const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return str;

  let hours = parseInt(match[1], 10);
  const mins = match[2];
  if (Number.isNaN(hours)) return str;

  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${String(hours).padStart(2, '0')}:${mins} ${period}`;
};

/**
 * Format a range of opening & closing times cleanly, or return '' if neither is set.
 */
export const formatKitchenHours = (openingTime, closingTime) => {
  const open = formatTime12h(openingTime);
  const close = formatTime12h(closingTime);
  if (open && close) return `${open} - ${close}`;
  if (open) return `Opens ${open}`;
  if (close) return `Closes ${close}`;
  return '';
};

/**
 * Generate 30-minute time slots from 05:00 AM to 11:30 PM
 */
export const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      slots.push({
        value,
        label: formatTime12h(value),
      });
    }
  }
  return slots;
})();
