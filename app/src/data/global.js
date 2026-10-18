// Cross-border data for Tillie checkout. All rates and fees are SAMPLE values for the prototype,
// not live exchange rates or real duty rules.

export const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD", symbol: "$", perUSD: 1, duty: 0.06, city: "Seattle, WA" },
  { code: "ID", name: "Indonesia", currency: "IDR", symbol: "Rp", perUSD: 16300, duty: 0.15, city: "Jakarta" },
  { code: "CA", name: "Canada", currency: "CAD", symbol: "C$", perUSD: 1.38, duty: 0.13, city: "Vancouver, BC" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", perUSD: 0.76, duty: 0.2, city: "London" },
  { code: "KR", name: "South Korea", currency: "KRW", symbol: "₩", perUSD: 1380, duty: 0.1, city: "Seoul" },
  { code: "JP", name: "Japan", currency: "JPY", symbol: "¥", perUSD: 150, duty: 0.1, city: "Tokyo" },
  { code: "SG", name: "Singapore", currency: "SGD", symbol: "S$", perUSD: 1.33, duty: 0.09, city: "Singapore" },
  { code: "AU", name: "Australia", currency: "AUD", symbol: "A$", perUSD: 1.52, duty: 0.1, city: "Sydney" },
];

// Where each retailer ships from, and the currency it charges in
export const RETAILER_ORIGIN = {
  Zara: { country: "Spain", code: "ES", currency: "EUR", perUSD: 0.92, days: 6 },
  Aritzia: { country: "Canada", code: "CA", currency: "CAD", perUSD: 1.38, days: 5 },
  Uniqlo: { country: "Japan", code: "JP", currency: "JPY", perUSD: 150, days: 7 },
  "H&M": { country: "Sweden", code: "SE", currency: "SEK", perUSD: 10.5, days: 7 },
  Cider: { country: "Hong Kong", code: "HK", currency: "HKD", perUSD: 7.8, days: 9 },
  Edikted: { country: "United States", code: "US", currency: "USD", perUSD: 1, days: 4 },
  "Princess Polly": { country: "Australia", code: "AU", currency: "AUD", perUSD: 1.52, days: 8 },
  "Urban Outfitters": { country: "United States", code: "US", currency: "USD", perUSD: 1, days: 4 },
  Amazon: { country: "United States", code: "US", currency: "USD", perUSD: 1, days: 3 },
};

export const countryOf = (code) => COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
export const originOf = (retailer) => RETAILER_ORIGIN[retailer] || { country: "United States", code: "US", currency: "USD", perUSD: 1, days: 5 };

// Format an amount (given in USD) in another currency
export function inCurrency(usd, currency, perUSD) {
  const v = usd * perUSD;
  const big = perUSD >= 100;
  return `${currency} ${big ? Math.round(v).toLocaleString("en-US") : v.toFixed(2)}`;
}
