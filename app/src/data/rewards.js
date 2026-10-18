// Tillie Rewards: points turn into real discounts at partner brands.
// Earn: 1 pt per $1 spent · +10 posting an outfit · +2 per scan. About 1% back, like real store loyalty programs.
// Sample partner offers for the prototype.

export const EARN_RULES = [
  { label: "Every $1 you spend", pts: "+1" },
  { label: "Post an outfit to Community", pts: "+10" },
  { label: "Scan a look", pts: "+2" },
];

// Cash-off you can apply at checkout (any store)
export const CHECKOUT_REWARDS = [
  { pts: 500, off: 5 },
  { pts: 1000, off: 12 },
  { pts: 2000, off: 30 },
];

// Brand perks (unlock with points)
export const BRAND_PERKS = [
  { brand: "Uniqlo", pts: 400, perk: "$5 off $50+" },
  { brand: "Cider", pts: 500, perk: "10% off one order" },
  { brand: "Zara", pts: 600, perk: "10% off one item" },
  { brand: "Princess Polly", pts: 1000, perk: "Free intl. shipping" },
  { brand: "Aritzia", pts: 1500, perk: "15% off + free shipping" },
];

// The best cash reward you can afford right now
export function bestReward(points) {
  return [...CHECKOUT_REWARDS].reverse().find((r) => points >= r.pts) || null;
}

export function nextReward(points) {
  return CHECKOUT_REWARDS.find((r) => points < r.pts) || null;
}
