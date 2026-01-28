# Protocol Date Fix - User Communication Guide

## Issue Summary
We fixed a bug where washout periods were incorrectly included in protocol end dates, causing protocols to show longer durations than intended (e.g., 12 weeks instead of 8 weeks when 4 weeks of washout was configured).

## What Was Fixed

### ✅ New Protocols
- **All new protocols** started after this fix will have correct dates
- Washout periods are now correctly excluded from protocol duration
- Start dates are preserved correctly without timezone shifts

### ✅ Existing Protocols - Automatic Fix
- **Migration runs automatically** on app load to fix existing protocols
- Protocols with incorrect endDates (including washout) are automatically corrected
- Both active and inactive protocols are fixed

### ⚠️ Active Protocols - Manual Fix Required
For users currently in an **active protocol** with incorrect dates:

**If the start date is NOT edited:**
- The endDate will remain incorrect until the protocol is edited or the migration runs
- Calendar scheduling may be off by the washout period duration
- **Solution:** Edit the protocol start date (even if just re-selecting the same date) to trigger recalculation

**If the start date IS edited:**
- The endDate will automatically recalculate correctly (washout excluded)
- Calendar scheduling will be corrected immediately

## User Communication Template

### For Users Reporting Date Issues

**Short Response:**
> "We've fixed the date calculation bug! Your protocol dates should now be correct. If you're currently in an active protocol and notice the dates are still off, please edit the protocol start date (even if you select the same date) to trigger a recalculation. This will ensure your calendar scheduling is accurate."

**Detailed Response:**
> "We've identified and fixed a bug where washout periods were incorrectly included in protocol end dates. Here's what you need to know:
> 
> **For New Protocols:** All protocols started after this fix will have correct dates automatically.
> 
> **For Existing Active Protocols:** 
> - If your protocol dates look incorrect, the system will automatically fix them when you edit the protocol start date (even if you just re-select the same date).
> - This ensures your calendar scheduling matches your actual protocol duration.
> - Washout periods are now correctly excluded from the protocol date range - they're for reference/reminders only.
> 
> **For Completed Protocols:** These have been automatically corrected by our migration system.
> 
> If you continue to see issues after editing your protocol start date, please let us know!"

### For Users Asking About Washout

> "Washout periods are now correctly separated from your protocol duration. They appear in your calendar for reference and reminders, but are not included in the protocol's main date range. This ensures your protocol duration matches what you configured (e.g., 8 weeks means 8 weeks, not 8 weeks + washout)."

## Technical Details

### What Changed
1. **Display Fix:** Protocol cards now show only the protocol duration, excluding washout
2. **Calculation Fix:** End date calculation explicitly excludes washout period
3. **Migration:** Automatic migration detects and fixes protocols with washout incorrectly included
4. **Timezone:** Enhanced automatic timezone detection to prevent date shifts

### Migration Behavior
- Runs once on app load
- Checks all protocols (active and inactive)
- Detects if endDate = (correct endDate + washout duration)
- Automatically recalculates and saves correct endDate
- Shows toast notification if protocols were fixed

### Active Protocol Handling
- When user edits protocol start date → endDate recalculates automatically
- When user edits protocol duration → endDate recalculates automatically
- Migration also runs for active protocols, but editing start date is the most reliable fix

## Testing Checklist

- [x] New protocols calculate endDate correctly (washout excluded)
- [x] Migration detects and fixes existing protocols with washout in endDate
- [x] Editing start date in active protocol recalculates endDate
- [x] Display shows correct date range (washout excluded)
- [x] Washout still appears in calendar for reminders/reference
- [x] Timezone detection works automatically
