import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Star, Plus, ExternalLink } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';

export default function GlossaryWidget({ widget, theme }) {
  const [favoriteEntries, setFavoriteEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const favorites = localStorage.getItem('tpprover_glossary_favorites');
      if (favorites) setFavoriteEntries(JSON.parse(favorites).slice(0, 3));
    } catch (error) {
      console.error('Error loading glossary data:', error);
    }
  }, []);

  const handleQuickSearch = (term = searchTerm) => {
    if (!term.trim()) return;
    
    // Open glossary modal with search term and immediately trigger search
    window.dispatchEvent(new CustomEvent('tpp:open_glossary', { 
      detail: { 
        searchTerm: term,
        autoSearch: true // This will trigger immediate search
      } 
    }));
    setSearchTerm('');
  };

  // Handle instant search as user types
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Auto-search after 2 characters with debouncing
    if (value.length >= 2) {
      clearTimeout(window.glossarySearchTimeout);
      window.glossarySearchTimeout = setTimeout(() => {
        handleQuickSearch(value);
      }, 800); // 800ms delay for debouncing
    }
  };

  const handleOpenGlossary = (tab = 'search') => {
    window.dispatchEvent(new CustomEvent('tpp:open_glossary', { detail: { tab } }));
  };

  const popularPeptides = [
    'Semaglutide',
    'Tirzepatide', 
    'BPC-157',
    'TB-500',
    'Ipamorelin',
    'CJC-1295'
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
        <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
          Research Glossary
        </h3>
        <BookOpen size={18} style={{ color: theme.primary }} />
      </div>
      
      <div className="flex-1 p-3 flex flex-col overflow-hidden">
        {/* Content Area - grows to fill available space */}
        <div className="flex-1 space-y-3 min-h-0">
          {/* Quick Search */}
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
                placeholder="Start typing to search..."
                className="flex-1 px-2 py-1.5 text-sm border rounded-md min-w-0"
                style={{ borderColor: theme.border }}
              />
              <button
                onClick={() => handleQuickSearch()}
                className="px-2 py-1.5 rounded-md transition-colors flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Search size={12} />
              </button>
            </div>
          </div>


          {/* Favorites */}
          {favoriteEntries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: theme.textLight }}>
                <Star size={12} style={{ color: theme.warning }} />
                Favorites
              </h4>
              <div className="space-y-1">
                {favoriteEntries.map((entry, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSearch(entry)}
                    className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-50 transition-colors"
                    style={{ color: theme.text }}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Peptides - Always show */}
          {favoriteEntries.length === 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold" style={{ color: theme.textLight }}>
                Popular Research
              </h4>
              <div className="grid grid-cols-2 gap-1">
                {popularPeptides.map((peptide, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSearch(peptide)}
                    className="px-2 py-1 text-xs rounded border hover:bg-gray-50 transition-colors text-left flex items-center gap-1"
                    style={{ 
                      borderColor: theme.border,
                      color: theme.text 
                    }}
                >
                  <Search size={10} style={{ color: theme.textLight }} />
                  {peptide}
                </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call to Action - Always at bottom */}
        <div className="pt-2 border-t mt-auto" style={{ borderColor: theme.border }}>
          <div className="flex gap-1">
            <button
              onClick={() => handleOpenGlossary('browse')}
              className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors min-w-0"
              style={{ 
                backgroundColor: theme.primary + '20', 
                color: theme.primary 
              }}
            >
              <BookOpen size={12} className="inline mr-1" />
              Browse Peptides
            </button>
            <ModernTooltip text="Expand" position="top">
              <button
                onClick={handleOpenGlossary}
                className="px-2 py-1.5 rounded-md border transition-colors flex-shrink-0"
                style={{ 
                  borderColor: theme.border,
                  color: theme.textLight 
                }}
              >
                <ExternalLink size={12} />
              </button>
            </ModernTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
