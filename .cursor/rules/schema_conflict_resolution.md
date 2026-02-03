# SCHEMA.md conflict resolution (confirm first)

When using **SCHEMA.md** for reference (e.g. when editing user data, Firestore, or schema-related code):

- If **SCHEMA.md conflicts** with existing code or types (e.g. a field or key in the code is missing or different in SCHEMA.md), **do not change code or SCHEMA.md until the user confirms**.
- **Tell the user** about the conflict.
- **Recommend** updating SCHEMA.md to match the code (code is authoritative).
- **Ask for approval** before making any change to either the codebase or SCHEMA.md.

Agents must never override code or documentation silently; they must confirm with the user first.
