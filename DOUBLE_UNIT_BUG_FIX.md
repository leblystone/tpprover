# 🐛 Double Unit Display Bug - FIXED

## **Issue Reported**
User saw "double units" displaying (e.g., `"15 units | 15 units"`) even though this bug was supposedly fixed a long time ago.

---

## **Root Cause**

The bug occurred when **BOTH** of these conditions were true:
1. ✅ A recon item exists (auto-calculates units from reconstitution math)
2. ✅ User manually entered a value in the "Units" field (`unitValue` in protocol)

**Old Logic:**
```javascript
// ❌ BAD: Shows both calculated AND manual units
if (calc.unitsPerDose > 0 && additionalUnits) {
    dose = `${calc.unitsPerDose.toFixed(0)} units | ${additionalUnits} units`;
}
```

**Result:** `"15 units | 15 units"` (duplicate when both are the same)

---

## **Why You Didn't See It**

The bug only appears when a user:
- Sets up a peptide with recon calculator (which auto-calculates units)
- **AND** manually fills in the "Units" field in the protocol editor
- Most users do one OR the other, not both

---

## **Solution Implemented: Smart Priority System**

### **New 4-Tier Priority System**

✅ **Priority Hierarchy:**
1. **Protocol Manual `unitValue`** (highest priority) - User entered units in protocol editor
2. **Recon Manual `units`** - User entered units in recon modal
3. **Auto-Calculated** - Calculator does the math from recon item
4. **Default Dose/Unit** - Fallback to mcg/mg display

```javascript
// ✅ GOOD: Clear priority with no duplication
if (protocolManualUnits) {
    dose = `${protocolManualUnits} units`;
} else if (reconManualUnits) {
    dose = `${reconManualUnits} units`;
} else if (calculatedUnits > 0) {
    dose = `${calculatedUnits} units`;
} else {
    dose = `${dosage.amount} ${dosage.unit}`;
}
```

---

## **Added: Units Field to Recon Modal**

### **New Feature**
Added a "Units" text field to the **Edit/Add Reconstitution** modal (Recon page).

**Why?**
- Users manually reconstituting vials (without using our calculator) need a way to enter their units
- Allows manual override if user trusts external calculators more than ours
- Reduces liability - user can verify and input their own value

**UI Layout:**
```
[Dose + Unit Dropdown] | [Units Field]
     (2 columns)
```

**Location:** `src/pages/Recon.jsx` lines ~1543-1697

---

## **Smart Indicator in Protocol Editor**

Added **non-intrusive helper text** below the "Units" field in protocol editor to show comparison with calculated units.

### **3 States:**

1. **⚠️ Override Active** (Orange/Terracotta `#E5A87A`)
   - Shows when manual ≠ calculated
   - Example: `"⚠️ Override active. Calc suggests: 15 units"`
   - User knows they're overriding the calculator

2. **✓ Auto-calculated** (Gray-Green `#8B9F98`)
   - Shows when field is empty but recon calc exists
   - Example: `"✓ Auto-calculated: 15 units"`
   - User sees what will display without typing anything

3. **✓ Matches calculation** (Sage `#5F7F76`)
   - Shows when manual = calculated
   - Example: `"✓ Matches calculation"`
   - Confirms their manual entry is correct

**No Indicator:**
- If no recon item exists → No helper text (nothing to compare)

---

## **Benefits**

✅ **No Double Units** - Manual always takes priority, calculated never duplicates  
✅ **User Control** - Can always override at protocol OR recon level  
✅ **Transparency** - See what calculator suggests without blocking popup  
✅ **No Liability Risk** - User can verify and override anytime  
✅ **No Popup Fatigue** - Just subtle helper text below field  
✅ **Builds Trust** - User can cross-check calculator accuracy  
✅ **Flexibility** - Manual reconstitution users can now enter units  

---

## **Files Modified**

### **1. `src/pages/Recon.jsx`** ✅
- **Added** "Units" field to Edit/Add Reconstitution modal (line ~1697)
- Changed Dose field layout from single to 2-column grid (Dose + Units)
- Integrated with autosave draft system
- Preserves manual units value when editing existing items

### **2. `src/utils/calendarTasks.js`** ✅
- Fixed blended protocol unit display logic (lines ~214-238)
- Fixed separate peptide unit display logic (lines ~327-350)
- **New Priority:** Protocol Manual > Recon Manual > Calculated > Default
- Checks `reconItem.units` (manual) before calculating

### **3. `src/pages/Calendar.jsx`** ✅
- Fixed blended protocol unit display logic (lines ~604-631)
- Fixed separate peptide unit display logic (lines ~733-759)
- Same 4-tier priority system
- Checks `reconItem.units` (manual) before calculating

### **4. `src/components/protocols/PeptideSubForm.jsx`** ✅
- Added `calculateRecon` import from recon utils
- Added `AppContext` to access `reconItems`
- Added smart helper text below "Units" field (lines ~226-274)
- Shows comparison indicator (override warning, auto-calc info, or match confirmation)

---

## **Priority System Examples**

### **Example 1: Protocol Override Wins**
- Protocol `unitValue`: 20 units ← **SHOWS THIS**
- Recon `units`: 18 units
- Calculated: 15 units
- **Display:** `"20 units"`

### **Example 2: Recon Override Wins (No Protocol Override)**
- Protocol `unitValue`: (empty)
- Recon `units`: 18 units ← **SHOWS THIS**
- Calculated: 15 units
- **Display:** `"18 units"`

### **Example 3: Calculated Wins (No Manual Overrides)**
- Protocol `unitValue`: (empty)
- Recon `units`: (empty)
- Calculated: 15 units ← **SHOWS THIS**
- **Display:** `"15 units"`

### **Example 4: Default Fallback**
- Protocol `unitValue`: (empty)
- Recon `units`: (empty)
- Calculated: 0 (no recon item or calc failed)
- **Display:** `"600 mcg"` (default dose/unit)

---

## **Testing Scenarios**

### **Test 1: Protocol Manual Override**
1. Create protocol "Semaglutide", dose 600 mcg
2. Create recon item: 5mg in 2ml, calc shows 24 units
3. In recon modal, leave "Units" empty
4. In protocol editor, enter "Units": 20
5. **Expected:** Calendar shows `"20 units"`, helper text shows `"⚠️ Override active. Calc suggests: 24 units"`

### **Test 2: Recon Manual Override**
1. Create protocol "BPC-157", dose 250 mcg, leave "Units" empty
2. Create recon item: 5mg in 2ml
3. In recon modal, enter "Units": 40
4. **Expected:** Calendar shows `"40 units"` (recon manual wins)

### **Test 3: Auto-Calculated (No Manual Entries)**
1. Create protocol "Tirz", dose 2.5 mg, leave "Units" empty
2. Create recon item: 10mg in 2ml, leave "Units" empty
3. **Expected:** Calendar shows `"50 units"` (calculated), helper text shows `"✓ Auto-calculated: 50 units"`

### **Test 4: Protocol Override > Recon Override**
1. Create protocol "CJC-1295", dose 100 mcg
2. Create recon item, enter "Units": 10 in recon modal
3. In protocol editor, enter "Units": 12
4. **Expected:** Calendar shows `"12 units"` (protocol wins over recon)

### **Test 5: No Recon Item**
1. Create protocol "Ipamorelin", dose 300 mcg
2. Don't create recon item
3. Enter "Units": 15 in protocol
4. **Expected:** Calendar shows `"15 units"`, no helper text

---

## **User Communication**

### **If the user reports back:**

> ✅ **Fixed!** The double unit display was caused by a conflict between auto-calculated units and manually entered units. 
>
> **What changed:**
> - **Added "Units" field to Recon modal** - You can now manually enter units when creating/editing recon items
> - **New priority system:**
>   1. Manual units in protocol (highest priority)
>   2. Manual units in recon modal  
>   3. Auto-calculated from recon math
>   4. Default dose/unit (mcg/mg)
> - **Smart indicator** in protocol editor shows when you're overriding the calculator
>
> This gives you full control at multiple levels while preventing duplicates! 🎉

---

## **Design Decision: 4-Tier Priority**

**Why Protocol Manual > Recon Manual?**
- Protocol is more specific (per-peptide in protocol)
- Recon is more general (per-vial)
- User expects protocol settings to override recon settings

**Why Manual > Calculated?**
- User may have better/external calculators
- Reduces liability concerns
- Transparency builds trust

**Visual Feedback:**
- Smart indicator shows comparison (non-blocking)
- No popup fatigue
- Real-time updates as user types
- Color-coded (warning = orange, info = green)

---

## **Related Documentation**

- Recon calculator logic: `src/utils/recon.js`
- Protocol editor: `src/components/protocols/ProtocolEditorModal.jsx`
- Calendar display: `src/pages/Calendar.jsx`
- Task generation: `src/utils/calendarTasks.js`
- Recon modal: `src/pages/Recon.jsx`

---

**Status:** ✅ Fixed & Enhanced  
**Date:** January 24, 2026  
**Impact:** High - Eliminates confusing duplicate unit displays + adds flexibility  
**Breaking Changes:** None - existing protocols/recon items work fine  
**User-Facing:** Yes - improved clarity everywhere + new Units field in Recon modal  
**New Feature:** Manual Units field in Edit/Add Reconstitution modal
