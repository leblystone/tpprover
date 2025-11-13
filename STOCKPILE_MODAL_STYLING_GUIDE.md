# Stockpile Modal Styling Guide
## Complete Reference for Applying This Design to Other Modals

This document details all styling changes made to the Stockpile Add/Edit Modal. Use this as a reference when applying the same design to other modals.

---

## 1. SECTION HEADERS

### Header Structure
Each section has a header with the following styling:

```jsx
<div 
  className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" 
  style={{ 
    backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
    borderLeft: '4px solid #e0ded7' 
  }}
>
  <h4 
    className="font-bold text-sm tracking-wider uppercase" 
    style={{ 
      color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', 
      letterSpacing: '0.1em' 
    }}
  >
    SECTION TITLE
  </h4>
  <IconComponent size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
</div>
```

### Header Properties:
- **Container**: `px-4 py-2.5 rounded-lg flex items-center justify-between mb-2`
- **Background**: `theme.isDark ? '#374151' : theme.secondary`
- **Left Border**: `4px solid #e0ded7` (slightly darker than `#f0eee7`)
- **Text Color**: `theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76'` (2 shades darker than default)
- **Typography**: `font-bold text-sm tracking-wider uppercase` with `letterSpacing: '0.1em'`
- **Icon**: Lucide React icon, `size={20}`, matching text color, positioned on the right

### Section Headers Used:
- **VIAL DETAILS**: `TestTube` icon
- **ORDER DETAILS**: `PackageOpen` icon  
- **EXTRA DETAILS**: `ImageUp` icon

---

## 2. TEXT INPUT FIELDS (Standard)

### Using TextInput Component with Outlined Style

For standard text inputs, use the `TextInput` component with these props:

```jsx
<TextInput 
  label="Field Label" 
  value={form.fieldName} 
  onChange={v => updateFormData({ fieldName: v })} 
  placeholder="Placeholder text" 
  theme={theme}
  outlined={true}
  customTextColor="#181A18"
  customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
  uppercase={true}  // Optional: for fields that should be uppercase
/>
```

### TextInput Props:
- **`outlined={true}`**: Enables the outlined adaptive label style
- **`customTextColor="#181A18"`**: Sets text color to dark gray
- **`customShadow`**: Inset shadow for recessed effect
  - Dark mode: `'inset 0 2px 4px rgba(0,0,0,0.3)'`
  - Light mode: `'inset 0 1px 2px rgba(0,0,0,0.1)'`
- **`uppercase={true}`**: Optional - makes user input uppercase (placeholder stays normal case)

### Examples from Stockpile Modal:
- **Peptide Name**: Standard outlined input
- **Crimp / Cap Color**: Outlined + uppercase
- **Purity %**: Outlined
- **Batch #**: Outlined + uppercase
- **Price ($)**: Outlined + `type="number"`
- **Date Acquired**: Outlined + `type="date"`

---

## 3. CUSTOM INPUT FIELDS (Amount & Quantity with Toggles)

For inputs that have embedded toggles (like mg/mL or vial/kit), use a custom structure:

### Structure:
```jsx
<div className="relative">
  <div 
    className="flex items-stretch rounded-lg"
    style={{ 
      border: `1px solid #f0eee7`,
      boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
      backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
    }}
  >
    <input 
      type="text"
      id="field-input"
      value={form.fieldName || ''} 
      onChange={e => updateFormData({ fieldName: e.target.value })} 
      onFocus={() => setIsFieldFocused(true)}
      onBlur={() => setIsFieldFocused(false)}
      placeholder=" "
      className="flex-1 px-3 py-3 outline-none min-w-0 rounded-l-lg"
      style={{
        backgroundColor: 'transparent',
        color: '#181A18',
        border: 'none'
      }}
    />
    {/* Toggle buttons container */}
    <div 
      className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0 rounded-r-lg"
      style={{ 
        borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
        backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
      }}
    >
      {/* Toggle buttons */}
    </div>
  </div>
  {/* Adaptive label */}
  <label 
    htmlFor="field-input"
    className="absolute pointer-events-none transition-all"
    style={{
      fontSize: (isFieldFocused || (form.fieldName && form.fieldName.trim())) ? '0.75rem' : '0.9375rem',
      top: (isFieldFocused || (form.fieldName && form.fieldName.trim())) ? '-8px' : '14px',
      left: (isFieldFocused || (form.fieldName && form.fieldName.trim())) ? '12px' : '16px',
      padding: (isFieldFocused || (form.fieldName && form.fieldName.trim())) ? '0 4px' : '0',
      background: (isFieldFocused || (form.fieldName && form.fieldName.trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
      color: (isFieldFocused || (form.fieldName && form.fieldName.trim())) ? theme.primary : (theme.textLight || theme.text),
      fontWeight: 500
    }}
  >
    Field Label
  </label>
</div>
```

### Required State:
```jsx
const [isFieldFocused, setIsFieldFocused] = useState(false);
```

### Key Styling Points:
- **Container Border**: `1px solid #f0eee7`
- **Container Shadow**: Inset shadow (same as TextInput)
- **Input**: Transparent background, `#181A18` text color, `rounded-l-lg`
- **Toggle Container**: Border-left separator, `rounded-r-lg`
- **Label**: Absolute positioned, animates on focus/value change
  - **Inactive**: `14px` from top, `16px` from left, `0.9375rem` font size
  - **Active**: `-8px` from top, `12px` from left, `0.75rem` font size, background color applied

---

## 4. VENDOR INPUT FIELD

For vendor autocomplete fields, use `VendorSuggestInput` with outlined props:

```jsx
<VendorSuggestInput 
  label="Vendor" 
  value={form.vendor} 
  onChange={v => updateFormData({ vendor: v })} 
  placeholder="e.g., Pharm..." 
  theme={theme}
  outlined={true}
  customTextColor="#181A18"
  customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
/>
```

**Note**: The `VendorSuggestInput` component internally passes these props to `TextInput`.

---

## 5. DOCUMENTATION UPLOAD COMPONENT

### Empty State Styling:
```jsx
<div className="text-center py-6 px-4 rounded-lg" 
     style={{ 
       backgroundColor: theme.isDark ? '#111827' : theme.cardBackground,
       border: `1px solid ${theme.border}`,
       boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
     }}>
  <p className="text-sm mb-4" style={{ color: theme.textLight }}>
    {placeholder}
  </p>
  {!readonly && (
    <button
      onClick={() => setShowAddForm(true)}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-105 mx-auto"
      style={{ 
        backgroundColor: theme.primary, 
        color: theme.textOnPrimary,
        boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : `0 2px 4px ${theme.primary}30`
      }}
    >
      <Plus size={16} />
      Add
    </button>
  )}
</div>
```

### Key Changes:
- **Removed**: Dashed border, centered paper icon
- **Added**: Solid border, shadow, centered "+ Add" button inside the box
- **Button**: Uses `Plus` icon, shadowed, hover scale effect

### Props:
- **`title=""`**: Empty string to hide the title
- **`placeholder`**: Custom placeholder text (e.g., "Add photos, screenshots, or files that correlate with this peptide.")

---

## 6. TEXTINPUT COMPONENT ENHANCEMENTS

The `TextInput` component was enhanced with new props. Here's what was added:

### New Props:
1. **`uppercase = false`**: Makes input text uppercase while keeping placeholder normal case
2. **`customShadow = null`**: Overrides default shadow
3. **`outlined = false`**: Enables outlined adaptive label style
4. **`customTextColor = null`**: Overrides default text color

### Outlined Input CSS (in TextInput.jsx):
```css
.outlined-input-wrapper {
  position: relative;
}

.outlined-input-label {
  position: absolute;
  left: 16px;  /* or 12px if dense */
  top: 14px;   /* or 10px if dense */
  pointer-events: none;
  transition: all 0.2s ease;
  color: ${theme.textLight || theme.text};
  font-size: 1rem;  /* or 0.9375rem if dense */
  font-weight: 500;
}

.outlined-input-label.active,
.outlined-input:focus + .outlined-input-label,
.outlined-input:not(:placeholder-shown) + .outlined-input-label {
  top: -8px;
  left: 12px;
  font-size: 0.875rem;
  padding: 0 4px;
  background: ${theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')};
  color: ${theme.primary};
  font-weight: 500;
}
```

### Outlined Input Styling:
- **Border**: `1px solid #f0eee7` (changes to `theme.primary` on focus)
- **Background**: `theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')`
- **Text Color**: Uses `customTextColor` if provided, else `theme.text`
- **Shadow**: Uses `customShadow` if provided, else default
- **Label**: Animates from inside input to top-left when focused or has value

### Uppercase Placeholder CSS:
```css
.themed-input-uppercase::placeholder,
.themed-textarea-uppercase::placeholder {
  text-transform: none !important;
}
```

This ensures placeholder text stays in normal case even when input is uppercase.

---

## 7. COLOR VALUES REFERENCE

### Primary Colors:
- **Border Color**: `#f0eee7` (light beige/gray)
- **Darker Border**: `#e0ded7` (for section header left border)
- **Text Color**: `#181A18` (dark gray/black for input text)
- **Header Text**: `theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76'` (muted green)

### Shadows:
- **Light Mode Inset**: `inset 0 1px 2px rgba(0,0,0,0.1)`
- **Dark Mode Inset**: `inset 0 2px 4px rgba(0,0,0,0.3)`
- **Light Mode Regular**: `0 1px 2px rgba(0,0,0,0.05)`
- **Dark Mode Regular**: `0 2px 4px rgba(0,0,0,0.3)`

---

## 8. LAYOUT PATTERNS

### Two-Column Grid:
```jsx
<div className="grid grid-cols-2 gap-3">
  <TextInput ... />
  <TextInput ... />
</div>
```

### Section Spacing:
- **Between sections**: `space-y-4` on the main form container
- **Header to content**: `mb-2` on section headers

---

## 9. COMPLETE EXAMPLE STRUCTURE

```jsx
<div className="space-y-4">
  {/* Section Header */}
  <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" 
       style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
    <h4 className="font-bold text-sm tracking-wider uppercase" 
        style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>
      SECTION TITLE
    </h4>
    <IconComponent size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
  </div>

  {/* Standard Text Input */}
  <TextInput 
    label="Field Label" 
    value={form.field} 
    onChange={v => updateFormData({ field: v })} 
    placeholder="Placeholder" 
    theme={theme}
    outlined={true}
    customTextColor="#181A18"
    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
  />

  {/* Two-Column Grid */}
  <div className="grid grid-cols-2 gap-3">
    <TextInput ... />
    <TextInput ... />
  </div>
</div>
```

---

## 10. IMPORTANT NOTES

1. **All text inputs** in the modal use the outlined style with inset shadows
2. **Text color** is consistently `#181A18` for all inputs
3. **Section headers** use a monospace-style font with wider letter spacing
4. **Icons** on headers are always `size={20}` and match the header text color
5. **Spacing** between header and content is `mb-2`
6. **Custom inputs** (with toggles) require manual state management for focus
7. **Placeholder text** for uppercase fields stays in normal case
8. **Documentation upload** empty state uses solid borders and shadow, not dashed

---

## 11. FILES MODIFIED

1. **`src/pages/Stockpile.jsx`**: Main modal structure, section headers, custom inputs
2. **`src/components/common/inputs/TextInput.jsx`**: Added outlined style, uppercase support, custom shadow/text color
3. **`src/components/vendors/VendorSuggestInput.jsx`**: Added outlined props support
4. **`src/components/common/DocumentationUpload.jsx`**: Updated empty state styling

---

## 12. QUICK CHECKLIST FOR APPLYING TO OTHER MODALS

- [ ] Add section headers with icons (if multiple sections)
- [ ] Convert all `TextInput` components to use `outlined={true}`
- [ ] Add `customTextColor="#181A18"` to all inputs
- [ ] Add `customShadow` with inset shadow values
- [ ] For custom inputs with toggles, implement manual label animation
- [ ] Update `DocumentationUpload` empty state if used
- [ ] Ensure spacing between sections (`space-y-4`, `mb-2` on headers)
- [ ] Test uppercase fields maintain normal-case placeholders
- [ ] Verify all borders use `#f0eee7`
- [ ] Check that header text color matches icon color

---

**Last Updated**: Based on Stockpile Modal implementation
**Version**: 1.0

