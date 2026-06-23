exports.isValidDate = (dateString) => {
  return !isNaN(new Date(dateString));
};
