export const toCamelCase = (str: string) => {
  return str
    .replace(/[-_.\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toLowerCase());
};
