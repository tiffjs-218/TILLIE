// Tillie Rewards: points turn into real discounts at partner brands.
// Earn: 1 pt per $1 spent · +25 posting an outfit · +5 per scan.
// Sample partner offers for the prototype.

export const EARN_RULES = [
  { label: "Every $1 you spend", pts: "+1" },
  { label: "Post an outfit to Community", pts: "+25" },
  { label: "Scan a look", pts: "+5" },
];

// Cash-off you can apply at checkout (any store)
export const CHECKOUT_REWARDS = [
  { pts: 100, off: 5 },
  { pts: 200, off: 10 },
  { pts: 400, off: 25 },
];

// Brand perks (unlock with points)
export const BRAND_PERKS = [
  { brand: "Zara", pts: 150, perk: "10% off" },
  { brand: "Aritzia", pts: 300, perk: "15% off + free shipping" },
  { brand: "Uniqlo", pts: 100, perk: "$5 off $40+" },
  { brand: "Cider", pts: 120, perk: "12% off" },
  { brand: "Princess Polly", pts: 250, perk: "Free intl. shipping" },
];

// The best cash reward you can afford right now
export function bestReward(points) {
  return [...CHECKOUT_REWARDS].reverse().find((r) => points >= r.pts) || null;
}

export function nextReward(points) {
  return CHECKOUT_REWARDS.find((r) => points < r.pts) || null;
}
