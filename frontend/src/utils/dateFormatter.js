// Sprint5-Story-23: Date formatter utility for consistent date formatting across the application

/**
 * Format date string to specified format
 * @param {string|Date} date - Date string or Date object
 * @param {string} format - Desired format ('dd/mm/yy', 'dd/mm/yyyy', etc.)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'dd/mm/yy') => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const shortYear = String(year).slice(-2);

    switch (format) {
      case 'dd/mm/yy':
        return `${day}/${month}/${shortYear}`;

      case 'dd/mm/yyyy':
        return `${day}/${month}/${year}`;

      case 'mm/dd/yy':
        return `${month}/${day}/${shortYear}`;

      case 'mm/dd/yyyy':
        return `${month}/${day}/${year}`;

      case 'yyyy-mm-dd':
        return `${year}-${month}-${day}`;

      default:
        return `${day}/${month}/${shortYear}`;
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

/**
 * Format a date-only value (e.g. from <input type="date"> -> YYYY-MM-DD) in local time,
 * avoiding the common timezone off-by-one that happens with new Date('YYYY-MM-DD').
 *
 * Accepts:
 * - 'YYYY-MM-DD' (treated as local date)
 * - ISO strings / Date objects (formatted in local timezone)
 */
export const formatDateOnly = (date, format = 'dd/mm/yy') => {
  if (!date) return 'N/A';

  try {
    let dateObj;

    if (typeof date === 'string') {
      const m = date.match(/^\d{4}-\d{2}-\d{2}$/);
      if (m) {
        const [y, mo, d] = date.split('-').map((v) => Number(v));
        // local date at midnight
        dateObj = new Date(y, mo - 1, d);
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    return formatDate(dateObj, format);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

/**
 * Format date with time (for detailed views)
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} at ${hours}:${minutes}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

/**
 * Get human-readable date for screen readers
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Human-readable date
 */
export const getReadableDate = (date) => {
  if (!date) return 'No date';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'No date';
  }
};
