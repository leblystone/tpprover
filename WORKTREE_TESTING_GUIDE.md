# Worktree Testing Guide

## Understanding Your Worktrees

When Cursor Agent uses multiple models, it creates separate Git worktrees. Each worktree is an independent copy of your repository where different models can make changes without affecting each other.

### Current Worktrees

1. **Main Worktree** (Your current project)
   - Path: `C:\Users\lebro\Desktop\TPPSpendide`
   - Branch: `tpprover`
   - Status: Has uncommitted changes

2. **Worktree: asf**
   - Path: `C:\Users\lebro\.cursor\worktrees\TPPSpendide\asf`
   - Changes: Navigation-related (App.jsx, NotificationBell, BottomNavigation, etc.)

3. **Worktree: oer**
   - Path: `C:\Users\lebro\.cursor\worktrees\TPPSpendide\oer`
   - Changes: Same as `asf` (navigation-related)

4. **Worktree: ydq**
   - Path: `C:\Users\lebro\.cursor\worktrees\TPPSpendide\ydq`
   - Changes: Extensive changes (navigation, email templates, many components)

## How to Test Each Worktree

### Method 1: Quick View Changes

To see what changed in a specific worktree:

```powershell
# View changes in worktree 'asf'
cd C:\Users\lebro\.cursor\worktrees\TPPSpendide\asf
git diff

# View changes in worktree 'oer'
cd C:\Users\lebro\.cursor\worktrees\TPPSpendide\oer
git diff

# View changes in worktree 'ydq'
cd C:\Users\lebro\.cursor\worktrees\TPPSpendide\ydq
git diff
```

### Method 2: Test Each Worktree Locally

To test a specific worktree's changes:

1. **Navigate to the worktree directory**
   ```powershell
   cd C:\Users\lebro\.cursor\worktrees\TPPSpendide\asf
   ```

2. **Install dependencies** (if needed)
   ```powershell
   npm install
   ```

3. **Run the dev server from that worktree**
   ```powershell
   npm run dev
   ```

4. **Test the changes** in your browser

5. **When done, stop the server** and move to the next worktree

### Method 3: Compare Worktrees

To see differences between worktrees:

```powershell
# Compare main worktree with 'asf'
git diff C:\Users\lebro\Desktop\TPPSpendide C:\Users\lebro\.cursor\worktrees\TPPSpendide\asf

# Compare two worktrees
git diff C:\Users\lebro\.cursor\worktrees\TPPSpendide\asf C:\Users\lebro\.cursor\worktrees\TPPSpendide\ydq
```

### Method 4: Copy Changes to Main Worktree

If you want to test a worktree's changes in your main project:

1. **View the changes first**
   ```powershell
   cd C:\Users\lebro\.cursor\worktrees\TPPSpendide\asf
   git diff > changes.patch
   ```

2. **Apply to main worktree** (be careful - this will overwrite!)
   ```powershell
   cd C:\Users\lebro\Desktop\TPPSpendide
   git apply C:\Users\lebro\.cursor\worktrees\TPPSpendide\asf\changes.patch
   ```

## Quick Reference Commands

### List all worktrees
```powershell
git worktree list
```

### See what changed in a worktree
```powershell
cd C:\Users\lebro\.cursor\worktrees\TPPSpendide\[worktree-name]
git status
git diff
```

### Test a worktree
```powershell
cd C:\Users\lebro\.cursor\worktrees\TPPSpendide\[worktree-name]
npm run dev
```

### Remove a worktree (when done)
```powershell
git worktree remove C:\Users\lebro\.cursor\worktrees\TPPSpendide\[worktree-name]
```

## Tips

1. **Each worktree is independent** - changes in one don't affect others
2. **Each worktree needs its own node_modules** - run `npm install` in each if needed
3. **Port conflicts** - if testing multiple worktrees, use different ports:
   ```powershell
   npm run dev -- --port 5174  # for second worktree
   npm run dev -- --port 5175  # for third worktree
   ```
4. **Clean up** - remove worktrees when you're done testing to free up space



