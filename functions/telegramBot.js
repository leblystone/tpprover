/**
 * 📱 Telegram Bot Integration for Ghosty👻
 * 
 * Handles approval workflow via Telegram:
 * - Sends notifications when Ghosty generates a response
 * - Allows admin to approve/reject via Telegram buttons
 * - Sends daily digests
 */

const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

// ==================== CONFIGURATION ====================

const TELEGRAM_CONFIG = {
  apiUrl: 'https://api.telegram.org',
  timeout: 10000, // 10 seconds
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(botToken, chatId, message, options = {}) {
  try {
    const url = `${TELEGRAM_CONFIG.apiUrl}/bot${botToken}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: options.parseMode || 'Markdown',
      disable_web_page_preview: options.disablePreview !== false,
      ...options
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: TELEGRAM_CONFIG.timeout
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      logger.error('Telegram API error:', data);
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }
    
    return data.result;
    
  } catch (error) {
    logger.error('Failed to send Telegram message:', error);
    throw error;
  }
}

/**
 * Send message with inline keyboard buttons
 */
async function sendApprovalRequest(botToken, chatId, ticketData, response, routingDecision) {
  const message = `
🎫 *New Ticket: ${ticketData.ticketNumber}*

👤 *From:* ${ticketData.userName || 'Unknown'}
📧 *Email:* ${ticketData.userEmail}
📝 *Type:* ${ticketData.type}
📌 *Subject:* ${ticketData.subject}

🧠 *Ghosty Analysis:*
• *Route:* ${routingDecision.route === 'gemini-pro' ? '🎨 Gemini' : '🔧 Claude Sonnet'}
• *Confidence:* ${routingDecision.confidence}%
• *Reasoning:* ${routingDecision.reasoning}

📄 *Suggested Response:*
${response.content.substring(0, 500)}${response.content.length > 500 ? '...' : ''}

💰 *Estimated Cost:* $${(response.tokensUsed * 0.000003).toFixed(5)}

_What should I do?_
`;

  const keyboard = {
    inline_keyboard: [
      [
        {text: '✅ Approve & Post', callback_data: `approve:${ticketData.ticketId}`},
        {text: '❌ Reject', callback_data: `reject:${ticketData.ticketId}`}
      ],
      [
        {text: '✏️ Edit First', callback_data: `edit:${ticketData.ticketId}`},
        {text: '👁️ View Full', callback_data: `view:${ticketData.ticketId}`}
      ]
    ]
  };

  return await sendTelegramMessage(botToken, chatId, message, {
    reply_markup: JSON.stringify(keyboard)
  });
}

// ==================== BUDGET ALERTS ====================

/**
 * Send budget alert (warning or critical)
 */
async function sendBudgetAlert(botToken, chatId, alertLevel, currentCost, limit, ticketCount) {
  const emoji = alertLevel === 'critical' ? '🚨' : '⚠️';
  const levelText = alertLevel === 'critical' ? 'CRITICAL' : 'WARNING';
  
  const message = `
${emoji} *Budget Alert: ${levelText}*

📊 *Today's AI Costs:*
• Current: $${currentCost.toFixed(4)}
• Limit: $${limit.toFixed(2)}
• Tickets: ${ticketCount}

${alertLevel === 'critical' ? '🛑 *Ghosty has been auto-paused.*' : ''}

${alertLevel === 'critical' 
  ? '_Review costs in admin dashboard. Enable manually when ready._'
  : '_Approaching budget limit. Monitor closely._'
}
`;

  return await sendTelegramMessage(botToken, chatId, message);
}

// ==================== DAILY DIGEST ====================

/**
 * Send daily summary
 */
async function sendDailyDigest(botToken, chatId, stats) {
  const message = `
📊 *Ghosty👻 Daily Report*
_${new Date().toLocaleDateString()}_

✅ *Tickets Processed:* ${stats.totalTickets}
💰 *Total Cost:* $${stats.totalCost.toFixed(4)}

🎨 *Gemini:* ${stats.geminiProTickets} tickets ($${stats.geminiProCost.toFixed(4)})
🔧 *Claude Sonnet:* ${stats.claudeTickets} tickets ($${stats.claudeCost.toFixed(4)})

📈 *Performance:*
• Avg Confidence: ${stats.avgConfidence.toFixed(1)}%
• Avg Cost/Ticket: $${stats.avgCostPerTicket.toFixed(5)}
• Responses Posted: ${stats.responsesPosted}
• Human Overrides: ${stats.humanOverrides}

${stats.humanOverrides > 0 
  ? `⚠️ *${stats.humanOverrides} routing correction(s)* - Review for improvements`
  : '✅ *No routing corrections* - All decisions accurate!'
}
`;

  return await sendTelegramMessage(botToken, chatId, message);
}

// ==================== ERROR NOTIFICATIONS ====================

/**
 * Send error alert to admin
 */
async function sendErrorAlert(botToken, chatId, ticketId, errorMessage) {
  const message = `
🚨 *Ghosty👻 Error*

🎫 *Ticket:* ${ticketId}
❌ *Error:* ${errorMessage}

_Check Firebase logs for details._
`;

  return await sendTelegramMessage(botToken, chatId, message);
}

// ==================== SCHEDULED FUNCTIONS ====================

// NOTE: Hourly budget checks disabled per user request
// Daily digest at 6 PM remains active

/**
 * Send daily digest at 6 PM
 */
exports.sendDailyDigest = require('firebase-functions/v2/scheduler').onSchedule(
  {
    schedule: '0 18 * * *', // 6 PM daily
    timeZone: 'America/New_York',
    secrets: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
  },
  async (event) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) {
        logger.warn('Telegram credentials not configured');
        return;
      }
      
      const db = admin.firestore();
      
      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const logsRef = db.collection('ai_worker_logs');
      const q = logsRef.where('timestamp', '>=', today);
      const snapshot = await q.get();
      
      let stats = {
        totalTickets: snapshot.size,
        totalCost: 0,
        geminiProTickets: 0,
        claudeTickets: 0,
        geminiProCost: 0,
        claudeCost: 0,
        responsesPosted: 0,
        humanOverrides: 0,
        confidenceSum: 0
      };
      
      snapshot.forEach(doc => {
        const data = doc.data();
        stats.totalCost += data.totalCost || 0;
        stats.confidenceSum += data.confidence || 0;
        
        if (data.route === 'gemini-pro') {
          stats.geminiProTickets++;
          stats.geminiProCost += data.executionCost || 0;
        } else if (data.route === 'claude-sonnet') {
          stats.claudeTickets++;
          stats.claudeCost += data.executionCost || 0;
        }
        
        if (data.responsePosted) stats.responsesPosted++;
        if (data.humanOverride) stats.humanOverrides++;
      });
      
      stats.avgConfidence = stats.totalTickets > 0 ? stats.confidenceSum / stats.totalTickets : 0;
      stats.avgCostPerTicket = stats.totalTickets > 0 ? stats.totalCost / stats.totalTickets : 0;
      
      // Only send if there was activity today
      if (stats.totalTickets > 0) {
        await sendDailyDigest(botToken, chatId, stats);
      }
      
    } catch (error) {
      logger.error('Error sending daily digest:', error);
    }
  }
);

// ==================== APPROVAL WORKFLOW ====================

/**
 * Send approval request to Telegram
 * Called by Ghosty when response is ready
 */
exports.sendApprovalRequest = async (ticketData, response, routingDecision) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
      logger.warn('Telegram credentials not configured - skipping approval request');
      return null;
    }
    
    const result = await sendApprovalRequest(botToken, chatId, ticketData, response, routingDecision);
    logger.info(`✅ Sent approval request to Telegram for ticket ${ticketData.ticketNumber}`);
    
    return result;
    
  } catch (error) {
    logger.error('Failed to send approval request:', error);
    return null;
  }
};

/**
 * Handle callback from Telegram (approve/reject/edit)
 */
exports.handleTelegramCallback = require('firebase-functions/v2/https').onRequest(
  {
    cors: true,
    secrets: ['TELEGRAM_BOT_TOKEN']
  },
  async (req, res) => {
    try {
      const update = req.body;
      
      if (!update.callback_query) {
        res.status(200).send('OK');
        return;
      }
      
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;
      const messageId = callbackQuery.message.message_id;
      const chatId = callbackQuery.message.chat.id;
      
      // Parse callback data: "action:ticketId"
      const [action, ticketId] = data.split(':');
      
      const db = admin.firestore();
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      // Handle different actions
      switch (action) {
        case 'approve':
          try {
            // Post the response to the ticket
            await approveAndPostResponse(ticketId, db);
            
            // Get ticket number for confirmation
            const ticketDoc = await db.collection('supportTickets').doc(ticketId).get();
            const ticketNumber = ticketDoc.data()?.ticketNumber || ticketId;
            
            // Update Telegram message
            await sendTelegramMessage(botToken, chatId, `✅ *Approved & Posted!*\n\n🎫 Ticket: ${ticketNumber}\n✉️ Response sent to user\n\n_Check admin panel to see the posted message._`, {
              message_id: messageId
            });
          } catch (error) {
            logger.error(`Error approving ticket ${ticketId}:`, error);
            await sendTelegramMessage(botToken, chatId, `❌ *Error!*\n\nFailed to post response for ticket ${ticketId}\n\nError: ${error.message}\n\n_Check Firebase logs for details._`, {
              message_id: messageId
            });
          }
          
          break;
          
        case 'reject':
          // Mark as rejected, don't post
          await db.collection('supportTickets').doc(ticketId).update({
            'metadata.ghostWorker.rejected': true,
            'metadata.ghostWorker.rejectedAt': admin.firestore.FieldValue.serverTimestamp()
          });
          
          await sendTelegramMessage(botToken, chatId, `❌ *Rejected*\n\nResponse not posted for ticket ${ticketId}`, {
            message_id: messageId
          });
          
          break;
          
        case 'edit':
          // Open admin panel for editing (can't be done via Telegram)
          await sendTelegramMessage(botToken, chatId, `✏️ *Edit Mode*\n\nOpen admin panel to edit response for ticket ${ticketId}`, {
            message_id: messageId
          });
          
          break;
          
        case 'view':
          // Send full response in new message
          const ticketDoc = await db.collection('supportTickets').doc(ticketId).get();
          // TODO: Fetch and send full Ghost Worker response
          await sendTelegramMessage(botToken, chatId, `👁️ *Full response sent in next message*`);
          
          break;
      }
      
      res.status(200).send('OK');
      
    } catch (error) {
      logger.error('Error handling Telegram callback:', error);
      res.status(500).send('Error');
    }
  }
);

/**
 * Extract customer-facing response from full Ghosty response
 * Removes admin notes and formatting headers
 */
function extractCustomerResponse(fullResponse) {
  try {
    // Split by the admin notes section
    const parts = fullResponse.split(/---\s*##\s*ADMIN NOTES/i);
    
    if (parts.length === 0) {
      return fullResponse; // Fallback to full response if parsing fails
    }
    
    // Get the customer response part (everything before admin notes)
    let customerResponse = parts[0];
    
    // Remove the "## CUSTOMER RESPONSE:" header if present
    customerResponse = customerResponse.replace(/^##\s*CUSTOMER RESPONSE:\s*/i, '');
    
    // Remove any leading/trailing whitespace and extra newlines
    customerResponse = customerResponse.trim();
    
    // Remove the trailing "---" separator if present
    customerResponse = customerResponse.replace(/---\s*$/, '').trim();
    
    return customerResponse;
  } catch (error) {
    logger.error('Error extracting customer response:', error);
    return fullResponse; // Fallback to full response on error
  }
}

/**
 * Helper to approve and post response
 */
async function approveAndPostResponse(ticketId, db) {
  try {
    // Get the generated response from Ghosty logs
    const logsRef = db.collection('ai_worker_logs');
    const q = logsRef.where('ticketId', '==', ticketId).orderBy('timestamp', 'desc').limit(1);
    const snapshot = await q.get();
    
    if (snapshot.empty) {
      logger.error(`No Ghosty log found for ticket ${ticketId}`);
      throw new Error('No Ghosty response found for this ticket');
    }
    
    const logData = snapshot.docs[0].data();
    
    // Verify response content exists
    if (!logData.responseContent) {
      logger.error(`No response content stored for ticket ${ticketId}`);
      throw new Error('Response content not found in log');
    }
    
    // Extract ONLY the customer-facing response (strip admin notes)
    const customerResponse = extractCustomerResponse(logData.responseContent);
    
    logger.info(`📝 Customer response extracted (${customerResponse.length} chars, full was ${logData.responseContent.length} chars)`);
    
    // Get ticket reference
    const ticketRef = db.collection('supportTickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();
    
    if (!ticketDoc.exists) {
      throw new Error('Ticket not found');
    }
    
    // Post ONLY the customer response to ticket messages
    const messageRef = ticketRef.collection('messages').doc();
    
    await messageRef.set({
      messageId: messageRef.id,
      ticketId: ticketId,
      senderType: 'ghost-worker',
      senderEmail: 'ghosty@thepepplanner.com',
      senderName: `Ghosty👻 (${logData.route === 'gemini-pro' ? 'Gemini' : 'Claude'})`,
      message: customerResponse, // ONLY customer-facing content
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      metadata: {
        model: logData.executionModel,
        confidence: logData.confidence,
        tokensUsed: logData.executionTokensTotal,
        estimatedCost: logData.executionCost,
        approvedVia: 'telegram',
        fullResponseInLog: true // Flag that admin notes are in the log
      }
    });
    
    // Update ticket status
    await ticketRef.update({
      status: 'in-progress',
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      'metadata.ghostWorker.responsePosted': true,
      'metadata.ghostWorker.postedAt': admin.firestore.FieldValue.serverTimestamp(),
      'metadata.ghostWorker.approvedVia': 'telegram'
    });
    
    // Update the log to mark as posted
    await snapshot.docs[0].ref.update({
      responsePosted: true,
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedVia: 'telegram'
    });
    
    logger.info(`✅ Approved and posted Ghosty response for ticket ${ticketId}`);
    return true;
    
  } catch (error) {
    logger.error(`Error approving and posting response for ticket ${ticketId}:`, error);
    throw error;
  }
}

// ==================== ERROR NOTIFICATIONS ====================

/**
 * Send error notification
 * Can be called from Ghosty when errors occur
 */
exports.notifyError = async (ticketId, errorMessage) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
      return;
    }
    
    await sendErrorAlert(botToken, chatId, ticketId, errorMessage);
    
  } catch (error) {
    logger.error('Failed to send error notification:', error);
  }
};

// Export helper functions for use in other modules
exports.sendTelegramMessage = sendTelegramMessage;
exports.sendBudgetAlert = sendBudgetAlert;
exports.sendDailyDigest = sendDailyDigest;
