import React from 'react';
import { Dumbbell } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-bounce mb-4">
          <Dumbbell className="h-12 w-12 text-primary-500 mx-auto" />
        </div>
        <p className="text-secondary-600">Loading...</p>
      </div>
    </div>
  );
}
