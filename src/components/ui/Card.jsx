import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-lg border border-secondary-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
