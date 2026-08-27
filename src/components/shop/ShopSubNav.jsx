import React from 'react';
import { NavLink } from 'react-router-dom';
import { themes, defaultThemeName } from '../../theme/themes';

const theme = themes[defaultThemeName];

import { PAPER_PLANNER_LINKS } from '../../config/publicNavConfig';

const LINKS = PAPER_PLANNER_LINKS.map(({ path, label }) => [path, label]);

export default function ShopSubNav() {
  return (
    <div className="bg-white border-b overflow-x-auto" style={{ borderColor: '#DDE6DE' }}>
      <div className="max-w-7xl mx-auto px-5 flex gap-0">
        {LINKS.map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/shop'}
            className={({ isActive }) =>
              `px-4 py-2.5 text-[10px] font-bold tracking-[0.13em] uppercase whitespace-nowrap border-b-2 transition-colors ${
                isActive ? 'border-current' : 'border-transparent hover:opacity-60'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? theme.text : theme.textLight,
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
