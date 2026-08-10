/**
 * 📱 Telegram Bot Integration for Ghosty👻
 * 
 * Handles approval workflow via Telegram:
 * - Sends notifications when Ghosty generates a response
 * - Allows admin to approve/reject via Telegram buttons
 * - Sends daily digests
 */

const {logger} = require('firebase-functions');
const { COLLECTIONS } = require('./config/collections');
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
 * Answer a callback query (stops loading state on the button)
 * Call this when handling inline keyboard button clicks.
 */
async function answerCallbackQuery(botToken, callbackQueryId, options = {}) {
  try {
    const url = `${TELEGRAM_CONFIG.apiUrl}/bot${botToken}/answerCallbackQuery`;
    const payload = {
      callback_query_id: callbackQueryId,
      text: options.text || undefined,
      show_alert: options.showAlert || false
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: TELEGRAM_CONFIG.timeout
    });
    const data = await response.json();
    if (!data.ok) {
      logger.warn('Telegram answerCallbackQuery error:', data);
    }
    return data.ok;
  } catch (error) {
    logger.warn('Failed to answer callback query:', error.message);
    return false;
  }
}

/**
 * Send message with inline keyboard buttons
 */
async function sendApprovalRequest(botToken, chatId, ticketData, response, routingDecision) {
  // Extract customer response and admin notes
  const customerResponse = extractCustomerResponse(response.content);
  const adminNotes = extractAdminNotes(response.content);
  
  // Build the main message with ticket info
  let message = `
🎫 *New Ticket: ${ticketData.ticketNumber}*

👤 *From:* ${ticketData.userName || 'Unknown'}
📧 *Email:* ${ticketData.userEmail}
📝 *Type:* ${ticketData.type}
📌 *Subject:* ${ticketData.subject}

🧠 *Ghosty Analysis:*
• *Route:* ${routingDecision.route === 'gemini-pro' ? '🎨 Gemini' : '🔧 Claude Sonnet'}
• *Confidence:* ${routingDecision.confidence}%
• *Reasoning:* ${routingDecision.reasoning}

📄 *Customer Response Preview:*
${customerResponse.substring(0, 300)}${customerResponse.length > 300 ? '...' : ''}
`;

  // Add admin notes if available
  if (adminNotes) {
    message += `\n\n---\n\n📋 *ADMIN NOTES (Problem & Solution):*\n\n${adminNotes}`;
  } else {
    // Fallback: show more of the response if admin notes not found
    message += `\n\n📋 *Full Response:*\n${response.content.substring(0, 2000)}${response.content.length > 2000 ? '...' : ''}`;
  }

  message += `\n\n💰 *Estimated Cost:* $${(response.tokensUsed * 0.000003).toFixed(5)}\n\n_What should I do?_`;

  // Split message if too long (Telegram limit is 4096 chars)
  const messageChunks = splitMessage(message, 4096);
  
  // Send first chunk with buttons
  const keyboard = {
    inline_keyboard: [
      [
        {text: '📋 Draft only — reply in Work Queue', callback_data: `approve:${ticketData.ticketId}`},
        {text: '❌ Dismiss', callback_data: `reject:${ticketData.ticketId}`}
      ],
      [
        {text: '👁️ View Full', callback_data: `view:${ticketData.ticketId}`}
      ]
    ]
  };

  // Send first message with buttons
  const firstMessage = messageChunks[0];
  const result = await sendTelegramMessage(botToken, chatId, firstMessage, {
    reply_markup: JSON.stringify(keyboard)
  });

  // Send remaining chunks as follow-up messages (without buttons)
  for (let i = 1; i < messageChunks.length; i++) {
    await sendTelegramMessage(botToken, chatId, messageChunks[i], {
      parseMode: 'Markdown'
    });
  }

  return result;
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
      
      const logsRef = db.collection(COLLECTIONS.USER_REPORTS_QUEUE);
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
      logger.error('❌ TELEGRAM CREDENTIALS MISSING:');
      logger.error(`   TELEGRAM_BOT_TOKEN: ${botToken ? 'SET' : 'MISSING'}`);
      logger.error(`   TELEGRAM_CHAT_ID: ${chatId ? 'SET' : 'MISSING'}`);
      logger.error('   Configure secrets via: firebase functions:secrets:set TELEGRAM_BOT_TOKEN');
      logger.error('   Configure secrets via: firebase functions:secrets:set TELEGRAM_CHAT_ID');
      throw new Error('Telegram credentials not configured. Check Firebase secrets.');
    }
    
    logger.info(`📱 Attempting to send Telegram approval request for ticket ${ticketData.ticketNumber}...`);
    logger.info(`   Bot token: ${botToken.substring(0, 10)}...${botToken.substring(botToken.length - 4)}`);
    logger.info(`   Chat ID: ${chatId}`);
    
    const result = await sendApprovalRequest(botToken, chatId, ticketData, response, routingDecision);
    logger.info(`✅ Sent approval request to Telegram for ticket ${ticketData.ticketNumber}`);
    
    return result;
    
  } catch (error) {
    logger.error('❌ FAILED to send approval request to Telegram:', error);
    logger.error('   Error message:', error.message);
    logger.error('   Error stack:', error.stack);
    // Re-throw so the caller knows it failed (but won't break the whole process)
    throw error;
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
      const callbackQueryId = callbackQuery.id;

      // Parse callback data: "action:ticketId"
      const [action, ticketId] = data.split(':');

      const db = admin.firestore();
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      // Answer callback so Telegram stops the button loading state
      const answerText = action === 'approve' ? 'Blocked — Ghosty retired' : action === 'reject' ? 'Rejected' : undefined;
      await answerCallbackQuery(botToken, callbackQueryId, { text: answerText });

      // Handle different actions
      switch (action) {
        case 'approve':
          try {
            // Ghosty must not post to users — reply as admin from Work Queue instead.
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
            await sendTelegramMessage(botToken, chatId, `⛔ *Ghosty posting retired*\n\nTicket ${ticketId}\n\nGhosty can no longer send replies to users.\nCopy the draft and reply as *admin* from Work Queue.\n\n_${error.message}_`, {
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
          try {
            // Fetch full response from ai_worker_logs
            const logsRef = db.collection(COLLECTIONS.USER_REPORTS_QUEUE);
            const logQuery = logsRef
              .where('ticketId', '==', ticketId)
              .orderBy('timestamp', 'desc')
              .limit(1);
            const logSnapshot = await logQuery.get();
            
            if (logSnapshot.empty) {
              await sendTelegramMessage(botToken, chatId, `❌ *No response found*\n\nNo Ghosty response found for ticket ${ticketId}`, {
                message_id: messageId
              });
              break;
            }
            
            const logData = logSnapshot.docs[0].data();
            const fullResponse = logData.responseContent || 'No response content available';
            
            // Extract sections
            const customerResponse = extractCustomerResponse(fullResponse);
            const adminNotes = extractAdminNotes(fullResponse);
            
            // Build full report message
            let fullMessage = `👁️ *Full Response for Ticket ${ticketId}*\n\n`;
            fullMessage += `📄 *Customer Response:*\n${customerResponse}\n\n`;
            
            if (adminNotes) {
              fullMessage += `---\n\n📋 *ADMIN NOTES:*\n\n${adminNotes}`;
            } else {
              fullMessage += `---\n\n📋 *Full Response (Admin Notes Not Parsed):*\n\n${fullResponse}`;
            }
            
            // Split and send if too long
            const chunks = splitMessage(fullMessage, 4096);
            
            // Send first chunk
            await sendTelegramMessage(botToken, chatId, chunks[0], {
              message_id: messageId
            });
            
            // Send remaining chunks
            for (let i = 1; i < chunks.length; i++) {
              await sendTelegramMessage(botToken, chatId, chunks[i]);
            }
            
            logger.info(`✅ Sent full response to Telegram for ticket ${ticketId}`);
          } catch (viewError) {
            logger.error(`Error sending full response for ticket ${ticketId}:`, viewError);
            await sendTelegramMessage(botToken, chatId, `❌ *Error*\n\nFailed to fetch full response: ${viewError.message}`, {
              message_id: messageId
            });
          }
          
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
 * Extract ADMIN NOTES section from full Ghosty response
 * Returns the admin notes with problem analysis, solution, cursor prompt, etc.
 */
function extractAdminNotes(fullResponse) {
  try {
    // Try multiple patterns to find admin notes section
    const patterns = [
      /---\s*##\s*ADMIN NOTES[:\s]*(.*)/is,
      /##\s*ADMIN NOTES[:\s]*(.*)/is,
      /ADMIN NOTES[:\s]*(.*)/is
    ];
    
    for (const pattern of patterns) {
      const match = fullResponse.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no admin notes found, check if response contains admin-style sections
    if (fullResponse.includes('📍 WHERE TO LOOK') || 
        fullResponse.includes('🔍 WHAT\'S BROKEN') ||
        fullResponse.includes('💡 CURSOR PROMPT')) {
      // Return everything after the separator
      const parts = fullResponse.split(/---/);
      if (parts.length > 1) {
        return parts.slice(1).join('---').trim();
      }
    }
    
    return null; // No admin notes found
  } catch (error) {
    logger.error('Error extracting admin notes:', error);
    return null;
  }
}

/**
 * Split long message into chunks that fit Telegram's 4096 character limit
 */
function splitMessage(message, maxLength = 4096) {
  if (message.length <= maxLength) {
    return [message];
  }
  
  const chunks = [];
  let currentChunk = '';
  
  // Split by lines to avoid breaking in the middle of a line
  const lines = message.split('\n');
  
  for (const line of lines) {
    // If adding this line would exceed limit, save current chunk and start new one
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If a single line is too long, split it
      if (line.length > maxLength) {
        let remainingLine = line;
        while (remainingLine.length > maxLength) {
          chunks.push(remainingLine.substring(0, maxLength));
          remainingLine = remainingLine.substring(maxLength);
        }
        currentChunk = remainingLine;
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Helper to approve and post response — RETIRED.
 * Ghosty must not send anything user-facing. Reply from Work Queue as admin instead.
 */
async function approveAndPostResponse(ticketId, db) {
  logger.warn(
    `⛔ Ghosty Telegram approve/post blocked (retired from user-facing sends). ticket=${ticketId}`
  );
  throw new Error(
    'Ghosty posting to users is retired. Copy the draft from Telegram/queue and reply as admin in Work Queue.'
  );
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

// Send feedback notification (bug/suggestion with Ghosty response)
const sendFeedbackNotification = async (feedbackData) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
      logger.warn('Telegram credentials not configured - skipping feedback notification');
      return;
    }
    
    const emoji = feedbackData.type === 'bug' ? '🐛' : '💡';
    const typeLabel = feedbackData.type === 'bug' ? 'Bug Report' : 'Feature Suggestion';
    
    const message = `${emoji} **New ${typeLabel}**

**From:** ${feedbackData.userEmail}
**ID:** \`${feedbackData.feedbackId}\`

**Feedback:**
_${feedbackData.message.substring(0, 300)}${feedbackData.message.length > 300 ? '...' : ''}_

**🤖 Ghosty's Response:**
_${feedbackData.ghostyResponse}_

✅ Acknowledgment sent to user automatically`;

    await sendTelegramMessage(botToken, chatId, message);
    logger.info(`📱 Sent feedback notification to Telegram`);
    
  } catch (error) {
    logger.error('Failed to send feedback notification:', error);
  }
};

exports.sendFeedbackNotification = sendFeedbackNotification;

// Export helper functions for use in other modules
exports.sendTelegramMessage = sendTelegramMessage;
exports.sendBudgetAlert = sendBudgetAlert;
exports.sendDailyDigest = sendDailyDigest;
