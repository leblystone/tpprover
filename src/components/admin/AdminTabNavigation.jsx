import React from 'react';

export default function AdminTabNavigation({ tabs, activeTab, onTabChange, theme: enhancedTheme }) {
  return (
    <div className="px-4 lg:px-6 py-2 overflow-x-auto border-b" style={{ scrollbarWidth: 'thin', borderColor: enhancedTheme.border + '30' }}>
      <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap justify-center">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all duration-300 relative group ${
                isActive ? '' : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: isActive ? tab.color : 'transparent',
                color: isActive ? '#FFFFFF' : enhancedTheme.text,
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <Icon 
                size={14} 
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform duration-300'}
              />
              <span className="relative">
                {tab.label}
                {isActive && (
                  <span 
                    className="absolute -inset-1 blur-md opacity-30"
                    style={{ backgroundColor: tab.color }}
                  />
                )}
              </span>
              {tab.count > 0 && (
                <span 
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    isActive ? 'animate-bounce' : ''
                  }`}
                  style={{ 
                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : tab.color + '20',
                    color: isActive ? '#FFFFFF' : tab.color
                  }}>
                  {tab.count}
                </span>
              )}
              {/* Active indicator line with glow */}
              {isActive && (
                <span 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full shadow-lg"
                  style={{ 
                    backgroundColor: tab.color,
                    boxShadow: `0 0 8px ${tab.color}`
                  }}
                />
              )}
              {/* Hover glow effect */}
              {!isActive && (
                <span 
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ backgroundColor: tab.color }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

