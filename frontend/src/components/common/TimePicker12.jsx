import React from 'react';

/**
 * TimePicker12 — Always-12-hour time picker
 *
 * HTML's native <input type="time"> renders in 12- or 24-hour format depending
 * on the user's browser/OS locale — there's no way to force one. This component
 * guarantees a 12-hour UX (hour 1-12 + minute 00-59 + AM/PM) regardless of locale.
 *
 * Drop-in compatible with <input type="time"> callers:
 *   - `value` is the "HH:mm" 24-hour string (matches HTML time input contract)
 *   - `onChange` receives a synthetic event with `target.value` = "HH:mm" 24-hour
 *
 * So existing form state (which stores 24-hour strings and sends them to the
 * backend) works without any controller changes.
 */
export default function TimePicker12({ value, onChange, className = '', id, name, disabled = false }) {
  // Parse "HH:mm" 24-hour string → { hour (1-12), minute (0-59), period ('AM'|'PM') }
  const parse = (val) => {
    if (!val || typeof val !== 'string' || !val.includes(':')) {
      return { hour: 12, minute: 0, period: 'AM' };
    }
    const [hStr, mStr] = val.split(':');
    const h24 = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isNaN(h24) || Number.isNaN(m)) {
      return { hour: 12, minute: 0, period: 'AM' };
    }
    const period = h24 >= 12 ? 'PM' : 'AM';
    const hour = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return { hour, minute: m, period };
  };

  // Write { hour (1-12), minute, period } → "HH:mm" 24-hour and fire onChange
  const emit = (hour, minute, period) => {
    let h24 = hour;
    if (period === 'AM' && hour === 12) h24 = 0;
    if (period === 'PM' && hour !== 12) h24 = hour + 12;
    const hh = String(h24).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    onChange({ target: { value: `${hh}:${mm}`, name } });
  };

  const { hour, minute, period } = parse(value);

  const selectStyle = {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    background: disabled ? '#f3f4f6' : '#fff',
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div
      id={id}
      className={`time-picker-12 ${className}`}
      style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}
    >
      <select
        value={hour}
        onChange={(e) => emit(parseInt(e.target.value, 10), minute, period)}
        aria-label="Hour"
        disabled={disabled}
        style={selectStyle}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span style={{ fontWeight: 'bold' }}>:</span>
      <select
        value={minute}
        onChange={(e) => emit(hour, parseInt(e.target.value, 10), period)}
        aria-label="Minute"
        disabled={disabled}
        style={selectStyle}
      >
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => emit(hour, minute, e.target.value)}
        aria-label="AM or PM"
        disabled={disabled}
        style={selectStyle}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
