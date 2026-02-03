---
name: Fix Ghosty Telegram Full Report
overview: Ghosty AI should send a complete report via Telegram including the problem analysis and solution from the ADMIN NOTES section, but currently NO messages are being sent at all. Need to diagnose why messages aren't being sent, then ensure full content is included.
todos:
  - id: diagnose-no-messages
    content: Diagnose why Telegram messages aren't being sent - check secrets, Ghost Worker status, error logs
    status: completed
  - id: fix-telegram-sending
    content: Fix any issues preventing Telegram messages from being sent (secrets, error handling, etc.)
    status: completed
  - id: parse-response-sections
    content: Add helper function to parse Ghosty response and extract ADMIN NOTES section
    status: completed
  - id: update-approval-message
    content: Update sendApprovalRequest() to include full ADMIN NOTES in Telegram message
    status: completed
  - id: fix-view-full-handler
    content: Complete the 'view' action handler to fetch and send full response from ai_worker_logs
    status: completed
  - id: handle-message-length
    content: Add logic to handle Telegram 4096 character limit (split messages if needed)
    status: completed
---

## Problem Analysis

**CRITICAL ISSUE**: No Telegram messages are being sent at all for tickets.

### Potential Root Causes:

1. **Telegram Secrets Not Configured** (`functions/telegramBot.js` line 269-272):

   - If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` are missing, function silently returns null
   - No error is thrown, so it fails silently

2. **Ghost Worker Paused** (`functions/ghostWorker.js` line 422-430):

   - Checks `_config/ghostWorker.enabled === false`
   - If paused, function returns early and never processes tickets

3. **Observation Mode Logic** (`functions/ghostWorker.js` line 482-507):

   - Telegram messages only sent when `observationMode: true` AND `enableAutoResponse: false`
   - Current config shows both are set correctly, but need to verify

4. **Error Handling** (`functions/ghostWorker.js` line 503-506):

   - Telegram errors are caught and logged but don't fail the process
   - Errors might be happening but not visible

5. **Function Not Triggering**:

   - `ghostWorkerTriage` is a Firestore trigger on `supportTickets/{ticketId}` creation
   - Need to verify trigger is actually firing

### Secondary Issue (Once Messages Are Sending):

1. **Current behavior**: `sendApprovalRequest()` only shows first 500 characters of response (line 79)
2. **Missing content**: The ADMIN NOTES section (which contains problem analysis, solution, cursor prompt, test steps) is not included
3. **Broken feature**: The "View Full" button handler (line 358-364) is incomplete - it doesn't actually send the full response

## Solution

### Phase 1: Diagnose and Fix "No Messages" Issue

1. **Add Better Error Logging**:

   - Log when Telegram secrets are missing (currently just warns)
   - Log when Ghost Worker is paused
   - Log when observation mode prevents sending
   - Add explicit error messages that are visible

2. **Verify Configuration**:

   - Check if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets are set in Firebase
   - Check if Ghost Worker is paused in `_config/ghostWorker` collection
   - Verify `observationMode` and `enableAutoResponse` settings

3. **Add Diagnostic Function**:

   - Create a test function to verify Telegram connectivity
   - Test sending a message manually

4. **Improve Error Handling**:

   - Don't silently fail when Telegram credentials are missing
   - Log errors more prominently
   - Consider throwing errors in development mode

### Phase 2: Fix Content Issue (Once Messages Are Sending)

### 1. Parse Response to Extract Sections

- Modify `sendApprovalRequest()` to parse the full response and extract:
  - Customer Response section
  - ADMIN NOTES section (problem, solution, cursor prompt, etc.)

### 2. Send Complete Report via Telegram

- Send the full ADMIN NOTES section in the Telegram message
- Format it clearly so admin can see:
  - Problem analysis
  - Solution
  - Where to look (file paths)
  - Cursor prompt
  - Test steps

### 3. Fix "View Full" Button Handler

- Complete the `view` action handler (line 358-364)
- Fetch full response from `ai_worker_logs` collection
- Send it as a follow-up Telegram message

### 4. Handle Message Length Limits

- Telegram has a 4096 character limit per message
- If ADMIN NOTES are too long, split into multiple messages or use a more concise format

## Files to Modify

1. **`functions/ghostWorker.js`**

   - Add better error logging for Telegram failures
   - Add explicit checks and warnings for missing secrets
   - Verify observation mode logic is correct

2. **`functions/telegramBot.js`**

   - Add diagnostic logging for why messages aren't sent
   - Update `sendApprovalRequest()` to parse and include ADMIN NOTES
   - Fix `handleTelegramCallback()` for the "view" action
   - Add helper function to extract ADMIN NOTES section from response
   - Add test function to verify Telegram connectivity

3. **`functions/index.js`** (optional)

   - Add admin function to test Telegram connectivity
   - Add admin function to check Ghost Worker status

## Implementation Details

The response format from Ghosty is:

```
## CUSTOMER RESPONSE:
[Customer-facing message]

---

## ADMIN NOTES (Plain English):
[Problem analysis, solution, cursor prompt, etc.]
```

We need to:

1. Split on the "---" separator
2. Extract ADMIN NOTES section
3. Format it nicely for Telegram (using markdown)
4. Include it in the approval request message
5. Make sure the "View Full" button fetches and sends the complete response from Firestore