# Contributing

## User data saves and sync

If your change **adds or modifies saving of user data** (new forms, modals, widgets, or edits to protocols, orders, stockpile, wishlist, etc.), follow the app’s save/sync pattern so data stays consistent across devices and platforms.

**Read and use:** [USER_DATA_SAVE_PATTERN.md](./USER_DATA_SAVE_PATTERN.md)

That doc defines:

- Local-first, timestamp-based sync (so multi-device does not overwrite newer data)
- The three steps for every synced create/update
- Which data is synced vs local-only
- The “three places” rule when adding a new synced entity
- The enforcement checklist for PRs that touch user data
- Helper API (`prepareItemForSave`, etc.)

Use the checklist in that doc before opening a PR that touches user data.
