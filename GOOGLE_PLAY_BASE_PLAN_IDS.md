# Google Play Base Plan IDs

## Base Plan ID Requirements

- Must start with a number or lowercase letter
- Can contain: numbers (0-9), lowercase letters (a-z), and hyphens (-)
- Maximum 63 characters
- **Cannot be changed after creation** - choose carefully!

---

## Recommended Base Plan IDs

### Monthly Subscription:
**Base Plan ID:** `monthly-base`

Alternative options:
- `base-plan-monthly`
- `monthly-plan-1`
- `m1`

### Annual Subscription:
**Base Plan ID:** `annual-base`

Alternative options:
- `base-plan-annual`
- `annual-plan-1`
- `a1`

---

## Why These IDs?

- ✅ Simple and clear
- ✅ Easy to remember
- ✅ Follows naming conventions
- ✅ Short enough to leave room for future plans
- ✅ Descriptive of what they are

---

## Important Notes

1. **You can only have ONE base plan per subscription product** (for now)
2. **Base Plan ID cannot be changed** after creation
3. **Keep it simple** - you'll reference it in code later if needed
4. **Use lowercase and hyphens** - no underscores, spaces, or uppercase

---

## What to Enter in Google Play Console

For **Monthly Subscription:**
- Product ID: `com.thepepplanner.app.monthly`
- Base Plan ID: `monthly-base`

For **Annual Subscription:**
- Product ID: `com.thepepplanner.app.annual`
- Base Plan ID: `annual-base`

---

## Future Considerations

If you later want to add:
- Free trial periods
- Promotional pricing
- Different billing cycles

You can add **offers** to the base plan, but the base plan ID stays the same.



