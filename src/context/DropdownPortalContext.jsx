import React from 'react';

/**
 * Ref to a div inside a modal overlay where dropdowns should portal
 * so they appear above the sheet (avoids clipping/z-order on iOS).
 * BottomSheet provides this; CombinedDosageInput (and others) consume it.
 */
export const DropdownPortalContext = React.createContext(null);
