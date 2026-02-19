export const SUBSCRIPTION_PLANS = {
  monthly: {
    key: 'monthly',
    label: 'Monthly',
    interval: 'month',
    price: 3.99,
    cta: 'Start Monthly',
  },
  annual: {
    key: 'annual',
    label: 'Annual',
    interval: 'year',
    price: 36.99,
    cta: 'Start Annual',
    description: 'Same price as our best-selling physical planner!',
  },
  lifetime: {
    key: 'lifetime',
    label: 'Lifetime Access',
    interval: 'lifetime',
    price: 99.99,
    cta: 'Join Forever',
  },
};

export function getFounderPrice(basePrice, discountPercent) {
  if (!discountPercent || discountPercent <= 0) {
    return basePrice;
  }
  const discounted = basePrice * (1 - discountPercent / 100);
  return Math.max(0, Number(discounted.toFixed(2)));
}

export function getPlanPricing(planKey, discountPercent) {
  const plan = SUBSCRIPTION_PLANS[planKey];
  if (!plan) {
    return null;
  }

  const founderPrice = getFounderPrice(plan.price, discountPercent);

  let savings = 0;
  if (planKey === 'annual') {
    const monthlyEquivalent = SUBSCRIPTION_PLANS.monthly.price * 12;
    savings = Number((monthlyEquivalent - founderPrice).toFixed(2));
  } else {
    savings = Number((plan.price - founderPrice).toFixed(2));
  }

  return {
    ...plan,
    founderPrice,
    savings,
    discountPercent,
  };
}


