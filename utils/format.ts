export const formatNumber = (number: Number) => number.toLocaleString("en-GB");
export const formatPrice = (number: Number) =>
  number.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
