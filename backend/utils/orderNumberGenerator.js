/**
 * Order Number Generator Utility - Sprint5-Story-03
 * Generates unique order numbers in format: ORD-YYYYMMDD-XXXXX
 *
 * Format breakdown:
 * - ORD: Static prefix
 * - YYYYMMDD: Current date (e.g., 20251008)
 * - XXXXX: Random 5-digit number (00000-99999)
 *
 * Example: ORD-20251008-12345
 */

/**
 * Generate a unique order number
 * @returns {string} Order number in format ORD-YYYYMMDD-XXXXX
 */
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Generate random 5-digit number (00000-99999)
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');

  return `ORD-${year}${month}${day}-${random}`;
}

/**
 * Validate order number format
 * @param {string} orderNumber - Order number to validate
 * @returns {boolean} True if valid format
 */
function isValidOrderNumber(orderNumber) {
  const orderNumberRegex = /^ORD-\d{8}-\d{5}$/;
  return orderNumberRegex.test(orderNumber);
}

module.exports = {
  generateOrderNumber,
  isValidOrderNumber
};
