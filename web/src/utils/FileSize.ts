export function formatFileSize(size: number, precision = 3) {
  if (size > 10 ** 9) {
    return `${(size / 10 ** 9).toFixed(precision)} GB`;
  } else if (size > 10 ** 6) {
    return `${(size / 10 ** 6).toFixed(precision)} MB`;
  } else if (size > 10 ** 3) {
    return `${(size / 10 ** 3).toFixed(precision)} KB`;
  }
  return `${size} B`;
}
