/**
 * Shared copy for Buddy System scope — one account, one payer, co-tracking slot.
 * Import wherever we explain Research+ buddy limits (FAQ, terms, pricing, AccountBuddy).
 */

export const BUDDY_SYSTEM_SHORT =
  'Co-track one research partner under your account — not a second login or full Research+ seat.';

import { MAX_BUDDIES } from '../utils/buddies';

export const BUDDY_SYSTEM_INCLUDES = [
  `One buddy label per Research+ account (max ${MAX_BUDDIES}, no second login)`,
  'Tag protocols, supplements, stockpile & daily tasks as Mine or Theirs',
  'Calendar, dashboard & list filters by person',
  'Export buddy data if they want their own paid account later',
];

export const BUDDY_SYSTEM_EXCLUDES = [
  'Not a second subscriber account — your buddy does not get their own login',
  'Advanced analytics, streaks & insights stay with the account holder (you)',
  'AI Research (PiP) quotas and context are for the paying account only',
  'Full analytics, community identity & unlimited tracking → separate Research+ account',
];

export const BUDDY_FAQ_WHAT_IS =
  'The Buddy System lets you co-track one research partner inside your Research+ account. You log their protocols, doses, and stockpile alongside yours — tagged by person, filtered in the calendar, and shown as darker cards so nothing gets mixed up. It is built for couples or partners where one person manages the data. It is not a second full account: no separate login, and advanced analytics and streaks belong to the account holder. If your buddy wants their own analytics, AI history, and unlimited tracking, they can export their data and subscribe on their own.';

export const BUDDY_FAQ_ANALYTICS =
  'No. Research+ analytics, streaks, spending insights, and AI Research (PiP) apply to the account holder — the person who pays for Research+. Buddy records appear in your tracking views (protocols, calendar, stockpile) but do not create a parallel analytics profile. Your buddy\'s adherence does not affect your streak. If they want personal analytics and their own subscription, use Export on the Buddy page and have them start a separate account.';

export const BUDDY_TERMS_PARAGRAPH =
  'Research+ may include a Buddy System that allows the subscriber to label and co-track research data for one additional person within the same account. The Buddy System does not create a separate user account, login credentials, or standalone subscription for the buddy. Advanced analytics, streaks, AI Research quotas, community identity, and other premium capabilities associated with Research+ apply to the subscribing account holder unless otherwise stated. Data tagged to a buddy may be exported by the account holder. We may limit the number of buddies, features available to buddy-tagged data, or modify Buddy System functionality at any time.';
