import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { themes, defaultThemeName } from '../theme/themes';

// Field mappings for organized CSV exports
const FIELD_ORDER = {
  protocol: ['protocolName', 'name', 'linkedItems', 'duration', 'washout', 'notes', 'startDate', 'endDate'],
  order: ['item', 'vendor', 'status', 'orderDate', 'shippedDate', 'deliveredDate', 'trackingNumber', 'cost', 'quantity', 'notes'],
  stockpile: ['name', 'peptide', 'quantity', 'unit', 'mg', 'vendor', 'batch', 'expiration', 'location', 'notes'],
  vendor: ['name', 'type', 'website', 'email', 'phone', 'rating', 'paymentMethods', 'shippingMethods', 'notes'],
  supplement: ['name', 'type', 'brand', 'dosage', 'frequency', 'purpose', 'notes'],
  recon_item: ['name', 'peptide', 'bacWater', 'peptideAmount', 'totalVolume', 'concentration', 'reconDate', 'expiration', 'penColor', 'deliveryMethod', 'notes'],
  recon_history: ['reconItem', 'date', 'amount', 'notes'],
  scheduled_buy: ['item', 'vendor', 'scheduledDate', 'quantity', 'cost', 'notes'],
  metric: ['date', 'name', 'value', 'unit', 'notes'],
  calendar_note: ['date', 'note'],
  glossary: ['term', 'definition', 'category'],
  goal: ['title', 'targetDate', 'completed', 'createdAt', 'archived', 'archivedAt'],
  protocol_history: ['protocolName', 'startDate', 'endDate', 'notes', 'vials', 'reconstitutionData']
};

// Fields to exclude from exports (backend/admin only) - all lowercase for comparison
const EXCLUDED_FIELDS = ['id', '_id', 'uid', 'userid', 'createdat', 'updatedat', 'timestamp', 'servertimestamp', 'blendmode', 'protocoltype', 'endtype'];

// Helper function to check if a field should be excluded
function shouldExcludeField(fieldName) {
  const lower = fieldName.toLowerCase();
  // Exclude common ID patterns
  if (EXCLUDED_FIELDS.includes(lower)) return true;
  if (lower.endsWith('id') && lower !== 'peptide') return true; // Allow 'peptide' field
  if (lower === 'type') return true; // Exclude type field used for categorization
  return false;
}

// Helper function to get ordered fields for a data type
function getOrderedFields(type, item) {
  const ordered = FIELD_ORDER[type] || [];
  const allFields = Object.keys(item);
  // Filter out excluded fields and IDs
  const filteredFields = allFields.filter(f => !shouldExcludeField(f));
  const orderedFields = ordered.filter(f => filteredFields.includes(f));
  const remainingFields = filteredFields.filter(f => !ordered.includes(f)).sort();
  return [...orderedFields, ...remainingFields];
}

// Convert duration object to readable string
function formatDuration(duration) {
  if (!duration) return '';
  if (typeof duration === 'string') return duration;
  if (typeof duration === 'object') {
    if (duration.noEnd) return 'Ongoing';
    if (duration.count && duration.unit) {
      const count = duration.count;
      const unit = String(duration.unit).toLowerCase();
      return `${count} ${unit}${count !== '1' ? 's' : ''}`;
    }
    return '';
  }
  return String(duration);
}

// Convert washout object to readable string
function formatWashout(washout) {
  if (!washout) return 'No';
  if (typeof washout === 'string') return washout;
  if (typeof washout === 'object') {
    // Check if washout is enabled
    if (washout.enabled === false || washout.enabled === 'false') {
      return 'No';
    }
    if (washout.enabled === true || washout.enabled === 'true' || washout.count) {
      const parts = [];
      if (washout.count && washout.unit) {
        const count = washout.count;
        const unit = String(washout.unit).toLowerCase();
        parts.push(`${count} ${unit}${count !== '1' ? 's' : ''}`);
      }
      if (washout.duration) {
        const durationStr = formatDuration(washout.duration);
        if (durationStr) parts.push(durationStr);
      }
      return parts.length > 0 ? parts.join(' ') : 'Yes';
    }
    return 'No';
  }
  return String(washout);
}

// Convert boolean to yes/no
function formatBoolean(value) {
  if (value === true || value === 'true') return 'Yes';
  if (value === false || value === 'false') return 'No';
  return '';
}

// Helper function to format linkedItems for protocols - convert to readable format
function formatProtocolLinkedItems(protocol, stockpile = []) {
  if (!protocol.linkedItems || typeof protocol.linkedItems !== 'object') return '';
  
  const formattedLinks = [];
  const peptides = protocol.peptides || [];
  
  Object.entries(protocol.linkedItems).forEach(([peptideId, linkedItem]) => {
    // Find peptide name
    const peptide = peptides.find(p => (p.id || '').toString() === peptideId.toString()) || {};
    const peptideName = peptide.name || 'Unknown Peptide';
    
    // Find vendor name from stockpile if vialId exists
    let vendorName = 'No Vendor';
    if (linkedItem.vialId) {
      const vial = stockpile.find(v => (v.id || '').toString() === linkedItem.vialId.toString());
      if (vial && vial.vendor) {
        vendorName = vial.vendor;
      }
    } else if (linkedItem.vendor) {
      // Some linkedItems might have vendor directly
      vendorName = linkedItem.vendor;
    }
    
    formattedLinks.push(`${peptideName}: ${vendorName}`);
  });
  
  return formattedLinks.join('; ');
}

// Improved CSV export with organized sections
export function exportUserDataToCSV(data, filename = null) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `the-pep-planner-data-${dateStr}.csv`;
  filename = filename || defaultFilename;
  
  const csvLines = [];
  
  // Add BOM for proper UTF-8 encoding in Excel
  csvLines.push('\uFEFF');
  
  // Header
  csvLines.push('The Pep Planner - Research Data Export');
  csvLines.push(`Exported: ${new Date().toLocaleString()}`);
  csvLines.push('');
  
  // Convert calendarNotes object to array if needed
  const calendarNotesArray = data.calendarNotes && typeof data.calendarNotes === 'object' && !Array.isArray(data.calendarNotes)
    ? Object.entries(data.calendarNotes).map(([date, note]) => ({ date, note: typeof note === 'string' ? note : JSON.stringify(note) }))
    : (data.calendarNotes || []);
  
  // Pre-process protocols to format linkedItems
  const processedProtocols = (data.protocols || []).map(protocol => {
    if (protocol.linkedItems) {
      return {
        ...protocol,
        linkedItems: formatProtocolLinkedItems(protocol, data.stockpile || [])
      };
    }
    return protocol;
  });

  // Flatten protocol history notes for export
  const protocolHistoryWithNotes = (data.protocolHistory || []).map(entry => {
    const notes = entry.notes || [];
    const duringNotes = notes.filter(n => n.type === 'during').map(n => n.content).join(' | ');
    const followUpNotes = notes.filter(n => n.type === 'follow_up').map(n => n.content).join(' | ');
    return {
      ...entry,
      notes: duringNotes || '',
      followUpNotes: followUpNotes || '',
      notesCount: notes.length
    };
  });

  // Export each data type in its own section
  const dataTypes = [
    { key: 'protocols', label: 'PROTOCOLS', data: processedProtocols },
    { key: 'protocolHistory', label: 'PROTOCOL HISTORY', data: protocolHistoryWithNotes },
    { key: 'orders', label: 'ORDERS', data: data.orders || [] },
    { key: 'stockpile', label: 'STOCKPILE', data: data.stockpile || [] },
    { key: 'vendors', label: 'VENDORS', data: data.vendors || [] },
    { key: 'supplements', label: 'SUPPLEMENTS', data: data.supplements || [] },
    { key: 'reconItems', label: 'RECONSTITUTED ITEMS', data: data.reconItems || [] },
    { key: 'reconHistory', label: 'RECONSTITUTION HISTORY', data: data.reconHistory || [] },
    { key: 'scheduledBuys', label: 'SCHEDULED BUYS', data: data.scheduledBuys || [] },
    { key: 'metrics', label: 'METRICS', data: data.metrics || [] },
    { key: 'calendarNotes', label: 'CALENDAR NOTES', data: calendarNotesArray },
    { key: 'goals', label: 'GOALS', data: data.goals || [] },
    { key: 'glossary', label: 'GLOSSARY', data: data.glossary || [] },
  ];
  
  dataTypes.forEach(({ key, label, data: items }) => {
    if (items.length === 0) return;
    
    // Section header
    csvLines.push('');
    csvLines.push(`=== ${label} (${items.length} items) ===`);
    
    // Get ordered fields for this data type
    const typeKey = key === 'reconItems' ? 'recon_item' : 
                    key === 'reconHistory' ? 'recon_history' :
                    key === 'scheduledBuys' ? 'scheduled_buy' :
                    key === 'calendarNotes' ? 'calendar_note' :
                    key === 'protocolHistory' ? 'protocol_history' :
                    key === 'goals' ? 'goal' :
                    key.slice(0, -1); // Remove 's' from plural
    
    const firstItem = items[0];
    const headers = getOrderedFields(typeKey, firstItem);
    
    if (headers.length > 0) {
      // Add headers
      csvLines.push(headers.map(h => csvEscape(formatFieldName(h))).join(','));
      
      // Add data rows
      items.forEach(item => {
        const values = headers.map(h => csvEscape(formatValue(item[h], false, h)));
        csvLines.push(values.join(','));
      });
    }
  });
  
  // Summary
  csvLines.push('');
  csvLines.push('=== SUMMARY ===');
  dataTypes.forEach(({ label, data: items }) => {
    if (items.length > 0) {
      csvLines.push(`${label}: ${items.length} items`);
    }
  });
  
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

// Helper to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 127, g: 158, b: 149 }; // Default sage color
}

// Helper to load logo as base64
async function loadLogoAsBase64() {
  try {
    const logoPaths = [
      '/tpp_logo.png',
      './tpp_logo.png',
      window.location.origin + '/tpp_logo.png'
    ];
    
    for (const logoPath of logoPaths) {
      try {
        const response = await fetch(logoPath);
        if (response.ok) {
          const blob = await response.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        continue;
      }
    }
  } catch (error) {
    console.warn('Could not load logo:', error);
  }
  return null;
}

// PDF export with branding
export async function exportUserDataToPDF(data, filename = null, theme = null) {
  const defaultTheme = themes[defaultThemeName];
  const activeTheme = theme || defaultTheme;
  
  const primaryRgb = hexToRgb(activeTheme.primary);
  const primaryDarkRgb = hexToRgb(activeTheme.primaryDark);
  const textRgb = hexToRgb(activeTheme.text);
  const textLightRgb = hexToRgb(activeTheme.textLight);
  const backgroundRgb = hexToRgb(activeTheme.background);
  
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `the-pep-planner-data-${dateStr}.pdf`;
  filename = filename || defaultFilename;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 0;
  
  const logoBase64 = await loadLogoAsBase64();
  
  const headerHeight = 50;
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  const overlayR = Math.floor(primaryRgb.r * 0.7);
  const overlayG = Math.floor(primaryRgb.g * 0.7);
  const overlayB = Math.floor(primaryRgb.b * 0.7);
  doc.setFillColor(overlayR, overlayG, overlayB);
  doc.rect(0, 0, pageWidth, 15, 'F');
  
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 20, 10, 30, 30);
      yPos = 25;
    } catch (error) {
      yPos = 20;
    }
  } else {
    yPos = 20;
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('The Pep Planner', logoBase64 ? 60 : pageWidth / 2, yPos, { 
    align: logoBase64 ? 'left' : 'center' 
  });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Research Data Export', logoBase64 ? 60 : pageWidth / 2, yPos + 7, { 
    align: logoBase64 ? 'left' : 'center' 
  });
  
  yPos = headerHeight + 15;
  
  doc.setFillColor(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b);
  doc.roundedRect(14, yPos - 5, pageWidth - 28, 12, 2, 2, 'F');
  
  doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Exported: ${new Date().toLocaleString()}`, 20, yPos + 2);
  
  const totalItems = Object.values(data).reduce((sum, arr) => {
    if (Array.isArray(arr)) return sum + arr.length;
    if (typeof arr === 'object' && arr !== null && !Array.isArray(arr)) {
      return sum + Object.keys(arr).length;
    }
    return sum;
  }, 0);
  
  doc.text(`Total Items: ${totalItems}`, pageWidth - 20, yPos + 2, { align: 'right' });
  yPos += 20;
  
  const calendarNotesArray = data.calendarNotes && typeof data.calendarNotes === 'object' && !Array.isArray(data.calendarNotes)
    ? Object.entries(data.calendarNotes).map(([date, note]) => ({ date, note: typeof note === 'string' ? note : JSON.stringify(note) }))
    : (data.calendarNotes || []);

  // Pre-process protocols to format linkedItems for PDF export
  const processedProtocolsPDF = (data.protocols || []).map(protocol => {
    if (protocol.linkedItems) {
      return {
        ...protocol,
        linkedItems: formatProtocolLinkedItems(protocol, data.stockpile || [])
      };
    }
    return protocol;
  });

  const dataTypes = [
    { key: 'protocols', label: 'Protocols', data: processedProtocolsPDF },
    { key: 'protocolHistory', label: 'Protocol History', data: (data.protocolHistory || []).map(entry => {
      const notes = entry.notes || [];
      const duringNotes = notes.filter(n => n.type === 'during').map(n => n.content).join(' | ');
      const followUpNotes = notes.filter(n => n.type === 'follow_up').map(n => n.content).join(' | ');
      return {
        ...entry,
        notes: duringNotes || '',
        followUpNotes: followUpNotes || '',
        notesCount: notes.length
      };
    }) },
    { key: 'orders', label: 'Orders', data: data.orders || [] },
    { key: 'stockpile', label: 'Stockpile', data: data.stockpile || [] },
    { key: 'vendors', label: 'Vendors', data: data.vendors || [] },
    { key: 'supplements', label: 'Supplements', data: data.supplements || [] },
    { key: 'reconItems', label: 'Reconstituted Items', data: data.reconItems || [] },
    { key: 'reconHistory', label: 'Reconstitution History', data: data.reconHistory || [] },
    { key: 'scheduledBuys', label: 'Scheduled Buys', data: data.scheduledBuys || [] },
    { key: 'metrics', label: 'Metrics', data: data.metrics || [] },
    { key: 'calendarNotes', label: 'Calendar Notes', data: calendarNotesArray },
    { key: 'goals', label: 'Goals', data: data.goals || [] },
    { key: 'glossary', label: 'Glossary', data: data.glossary || [] },
  ];
  
  dataTypes.forEach(({ key, label, data: items }) => {
    if (items.length === 0) return;
    
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    const sectionHeaderHeight = 8;
    doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.roundedRect(14, yPos - 6, pageWidth - 28, sectionHeaderHeight, 1, 1, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${label}`, 20, yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${items.length} items)`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 8;
    
    const typeKey = key === 'reconItems' ? 'recon_item' : 
                    key === 'reconHistory' ? 'recon_history' :
                    key === 'scheduledBuys' ? 'scheduled_buy' :
                    key === 'calendarNotes' ? 'calendar_note' :
                    key === 'protocolHistory' ? 'protocol_history' :
                    key === 'goals' ? 'goal' :
                    key.slice(0, -1);
    
    const firstItem = items[0];
    const headers = getOrderedFields(typeKey, firstItem);
    
    if (headers.length > 0 && items.length > 0) {
      const tableData = items.map(item => 
        headers.map(h => formatValue(item[h], true, h))
      );
      
      const tableHeaders = headers.map(h => formatFieldName(h));
      
      // Calculate column widths to fit page
      const margins = 28; // 14 left + 14 right
      const availableWidth = pageWidth - margins;
      const numColumns = headers.length;
      
      // Build column styles with proper widths - distribute evenly but cap at reasonable max
      const columnStyles = {};
      const baseWidth = availableWidth / numColumns;
      const maxWidth = 35; // Max width per column in mm
      const minWidth = 12; // Min width per column in mm
      const columnWidth = Math.max(Math.min(baseWidth, maxWidth), minWidth);
      
      headers.forEach((_, index) => {
        columnStyles[index] = { 
          cellWidth: columnWidth,
          overflow: 'linebreak',
          cellPadding: 2,
          minCellHeight: 4
        };
      });
      
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos,
        styles: { 
          fontSize: 7, 
          cellPadding: 2,
          textColor: [textRgb.r, textRgb.g, textRgb.b],
          lineColor: [primaryRgb.r * 0.3, primaryRgb.g * 0.3, primaryRgb.b * 0.3],
          lineWidth: 0.1,
          overflow: 'linebreak',
          minCellHeight: 4
        },
        headStyles: { 
          fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          overflow: 'linebreak'
        },
        alternateRowStyles: { 
          fillColor: [backgroundRgb.r, backgroundRgb.g, backgroundRgb.b]
        },
        margin: { left: 14, right: 14 },
        columnStyles: columnStyles,
        theme: 'grid',
        tableWidth: 'auto',
        showHead: 'everyPage'
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
    }
  });
  
  doc.addPage();
  
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 20, 5, 30, 30);
    } catch (error) {
      // Skip
    }
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Export Summary', pageWidth / 2, 25, { align: 'center' });
  
  yPos = 55;
  
  const summaryBoxHeight = dataTypes.filter(dt => dt.data.length > 0).length * 10 + 30;
  doc.setFillColor(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b);
  doc.roundedRect(14, yPos - 5, pageWidth - 28, summaryBoxHeight, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  
  let totalItemsCount = 0;
  dataTypes.forEach(({ label, data: items }) => {
    if (items.length > 0) {
      totalItemsCount += items.length;
      doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.circle(20, yPos + 1, 2, 'F');
      
      doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 28, yPos + 2);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textLightRgb.r, textLightRgb.g, textLightRgb.b);
      doc.text(`${items.length} items`, pageWidth - 20, yPos + 2, { align: 'right' });
      yPos += 10;
    }
  });
  
  yPos += 10;
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text(`Total Items: ${totalItemsCount}`, pageWidth / 2, yPos, { align: 'center' });
  
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(primaryRgb.r * 0.5, primaryRgb.g * 0.5, primaryRgb.b * 0.5);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    
    doc.setFontSize(7);
    doc.setTextColor(textLightRgb.r, textLightRgb.g, textLightRgb.b);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    
    doc.setFontSize(6);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text(
      'The Pep Planner - Research Data Management',
      pageWidth / 2,
      pageHeight - 3,
      { align: 'center' }
    );
  }
  
  doc.save(filename);
}

// Format field names for display
function formatFieldName(field) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Format values for display
function formatValue(value, forPDF = false, fieldName = '') {
  if (value == null || value === undefined) return '';
  
  // Handle booleans first
  if (typeof value === 'boolean') {
    return formatBoolean(value);
  }
  
  // Special handling for duration field
  if (fieldName === 'duration') {
    return formatDuration(value);
  }
  
  // Special handling for washout field
  if (fieldName === 'washout') {
    return formatWashout(value);
  }

  // Special handling for linkedItems field - already formatted as string by formatProtocolLinkedItems
  if (fieldName === 'linkedItems' && typeof value === 'string') {
    return value; // Already formatted by formatProtocolLinkedItems
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'boolean') return formatBoolean(item);
        if (typeof item === 'object') {
          // Check if it's a duration or washout object
          if (item.count && item.unit) {
            const count = item.count;
            const unit = String(item.unit).toLowerCase();
            return `${count} ${unit}${count !== '1' ? 's' : ''}`;
          }
          return JSON.stringify(item);
        }
        return String(item);
      }).join(forPDF ? '; ' : ', ');
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    // For objects, try to make them readable
    const pairs = Object.entries(value)
      .filter(([k, v]) => {
        // Filter out excluded fields
        if (EXCLUDED_FIELDS.includes(k.toLowerCase())) return false;
        if (shouldExcludeField(k)) return false;
        return v != null;
      })
      .map(([k, v]) => {
        if (k === 'duration') return formatDuration(v);
        if (k === 'washout') return formatWashout(v);
        if (typeof v === 'boolean') return `${k}: ${formatBoolean(v)}`;
        return `${k}: ${v}`;
      })
      .join(forPDF ? '; ' : ', ');
    return pairs || '';
  }
  
  return String(value);
}

// Legacy function for backward compatibility
export function exportToCSV(rows, filename = 'export.csv') {
  if (!Array.isArray(rows) || rows.length === 0) {
    const blob = new Blob(['No data to export'], { type: 'text/csv' })
    downloadBlob(blob, filename)
    return
  }
  
  // Get all unique headers from all rows
  const allHeaders = new Set()
  rows.forEach(row => {
    Object.keys(row).forEach(key => allHeaders.add(key))
  })
  const headers = Array.from(allHeaders).sort()
  
  const csvLines = []
  
  // Add BOM for proper UTF-8 encoding in Excel
  csvLines.push('\uFEFF')
  
  // Add headers
  csvLines.push(headers.join(','))
  
  // Add data rows
  for (const row of rows) {
    const values = headers.map((h) => csvEscape(flattenValue(row[h])))
    csvLines.push(values.join(','))
  }
  
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}

function csvEscape(value) {
  if (value == null || value === undefined) return ''
  let s = String(value)
  if (s.includes('"')) s = s.replace(/"/g, '""')
  if (/[",\n\r]/.test(s)) s = `"${s}"`
  return s
}

function flattenValue(value) {
  if (value == null || value === undefined) return ''
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(item => 
        typeof item === 'object' ? JSON.stringify(item) : String(item)
      ).join('; ')
    }
    return JSON.stringify(value)
  }
  return String(value)
}

 function downloadBlob(blob, filename) {
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = filename
   document.body.appendChild(a)
   a.click()
   a.remove()
   URL.revokeObjectURL(url)
 }
