import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, Calendar, Dumbbell, TrendingUp } from 'lucide-react';

export default function Navigation() {
  const navItems = [
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/plan', icon: Calendar, label: 'Plan' },
    { to: '/workout', icon: Dumbbell, label: 'Workout' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-secondary-800 border-t border-secondary-700 safe-area-pb">
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 px-1 ${
                isActive
                  ? 'text-primary-400'
                  : 'text-secondary-300 hover:text-secondary-100'
              }`
            }
          >
            <Icon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
