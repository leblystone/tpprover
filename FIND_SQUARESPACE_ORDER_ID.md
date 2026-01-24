# 📍 How to Find Squarespace Order ID

## Method 1: Squarespace Dashboard (Easiest)

1. **Log into Squarespace**
2. Go to **Commerce** → **Orders** (or **Commerce** → **Orders & Transactions**)
3. Click on any order to open it
4. The **Order ID** is displayed at the top of the order details page
   - Usually formatted like: `6965d3c8c4bf0860f73d9e3e` (alphanumeric string)
   - May also be shown as "Order #" followed by a number

## Method 2: Order Confirmation Email

1. Check the **order confirmation email** sent to the customer
2. The order ID is usually in:
   - The email subject line
   - The order details section
   - The order number/reference

## Method 3: Squarespace API (If you have access)

If you have API access, you can list orders:
- Endpoint: `https://api.squarespace.com/1.0/commerce/orders`
- Each order will have an `id` field

## Method 4: Order URL

When viewing an order in Squarespace:
- The URL might contain the order ID
- Format: `https://your-site.squarespace.com/commerce/orders/[ORDER_ID]`

---

## 🧪 Testing with Manual Processing

Once you have the Order ID:

1. **Copy the Order ID** (e.g., `6965d3c8c4bf0860f73d9e3e`)
2. **Call the manual processing function:**
   - Use Firebase Console → Functions → `manualProcessSquarespaceOrder`
   - Or use the Firebase CLI
   - Pass the order ID as a parameter

---

## 📝 Example Order ID Format

Order IDs are typically:
- **24 characters long** (hexadecimal)
- **Lowercase alphanumeric** (no spaces or special characters)
- Example: `6965d3c8c4bf0860f73d9e3e`

---

## ⚠️ Important Notes

- Order IDs are **unique** per order
- They don't change once created
- Make sure you're copying the **full ID** (not just the order number)
- The order must contain a subscription product (with SKU: `monthly-access`, `annual-access`, or `lifetime-access`)
