# Git Branch Workflow Guide

## Current Setup

- **Active Branch**: `tpprover` (for your other work)
- **Feature Branch**: `squarespace-integration` (Squarespace work is committed there)

## Switching Between Branches

### To Work on Squarespace Feature:
```bash
git checkout squarespace-integration
git stash pop  # If you had stashed protocol/export changes
```

### To Work on Other Features (tpprover):
```bash
git checkout tpprover
# Your other work branches from here
```

### To See Stashed Changes:
```bash
git stash list
```

### To Apply Stashed Changes:
```bash
git stash pop  # Applies and removes from stash
# OR
git stash apply  # Applies but keeps in stash
```

## When You're Ready to Merge Squarespace Work

1. Switch back to squarespace-integration:
   ```bash
   git checkout squarespace-integration
   ```

2. Make sure it's up to date:
   ```bash
   git pull origin squarespace-integration
   ```

3. When ready to merge into tpprover:
   ```bash
   git checkout tpprover
   git merge squarespace-integration
   ```

## Pushing Changes

### Push Squarespace Work:
```bash
git checkout squarespace-integration
git push origin squarespace-integration
```

### Push Other Work:
```bash
git checkout tpprover
git push origin tpprover
```

