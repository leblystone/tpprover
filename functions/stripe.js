const functions = require("firebase-functions");
const stripe = require("stripe")(functions.config().stripe.secret);

exports.getStripeSubscriptions = functions.https.onCall(async (data, context) => {
  // Check if the user is an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  
  // TODO: Add a check to ensure the user is an admin
  // For example, check a custom claim:
  // if (context.auth.token.admin !== true) {
  //   throw new functions.https.HttpsError(
  //     "permission-denied",
  //     "The function must be called by an admin."
  //   );
  // }

  try {
    const subscriptions = await stripe.subscriptions.list({
      limit: data.limit || 25,
      // You can add more parameters here, like 'status' or 'customer'
    });
    return subscriptions;
  } catch (error) {
    console.error("Stripe API Error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to fetch subscriptions from Stripe."
    );
  }
});
