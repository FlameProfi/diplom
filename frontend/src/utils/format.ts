/**
 * Formats a number according to the specified locale and options.
 * @param value The number to format.
 * @param locale The locale to use for formatting (e.g., 'ru-RU', 'en-US').
 * @param maximumFractionDigits The maximum number of decimal places (default is 3).
 * @returns A formatted string.
 */
export const formatNumber = (
  value: number | string | undefined | null,
  locale: string = 'ru-RU',
  maximumFractionDigits: number = 3
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (num === null || num === undefined || isNaN(num as number)) {
    return '0';
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(num as number);
};
