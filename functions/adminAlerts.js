/**
 * Admin Alert System
 * Sends critical payment/subscription alerts via Telegram bot.
 * 
 * Setup:
 * 1. Create a Telegram bot via @BotFather -> get the bot token
 * 2. Get your chat ID by messaging the bot and checking https://api.telegram.org/bot<TOKEN>/getUpdates
 * 3. Set secrets:
 *    firebase functions:secrets:set TELEGRAM_BOT_TOKEN
 *    firebase functions:secrets:set TELEGRAM_CHAT_ID
 */

const { logger } = require('firebase-functions');

async function sendTelegramAlert(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    logger.warn('⚠️ Telegram alerts not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Telegram API error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('❌ Failed to send Telegram alert:', error.message);
    return false;
  }
}

function alertPaymentFailed(userId, userEmail, amount, provider) {
  return sendTelegramAlert(
    `🚨 <b>Payment Failed</b>\nUser: ${userEmail}\nID: ${userId}\nAmount: $${amount || '?'}\nProvider: ${provider}`
  );
}

function alertDispute(userId, userEmail, disputeId, reason, amount) {
  return sendTelegramAlert(
    `⚠️ <b>Dispute Created</b>\nUser: ${userEmail}\nID: ${userId}\nDispute: ${disputeId}\nReason: ${reason}\nAmount: $${(amount || 0) / 100}`
  );
}

function alertRefund(userId, userEmail, amount, provider) {
  return sendTelegramAlert(
    `💸 <b>Refund Processed</b>\nUser: ${userEmail}\nID: ${userId}\nAmount: $${(amount || 0) / 100}\nProvider: ${provider}`
  );
}

function alertWebhookFailure(source, eventType, error) {
  return sendTelegramAlert(
    `🔴 <b>Webhook Processing Failed</b>\nSource: ${source}\nEvent: ${eventType}\nError: ${error}`
  );
}

function alertReconciliationIssues(count) {
  return sendTelegramAlert(
    `🔄 <b>Reconciliation Issues Found</b>\n${count} subscription(s) have status drift between payment provider and database.`
  );
}

module.exports = {
  sendTelegramAlert,
  alertPaymentFailed,
  alertDispute,
  alertRefund,
  alertWebhookFailure,
  alertReconciliationIssues,
};
