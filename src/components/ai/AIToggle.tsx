import React from 'react';
import { Bot } from 'lucide-react';

interface AIToggleProps {
  onClick: () => void;
}

export function AIToggle({ onClick }: AIToggleProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      aria-label="Toggle AI Assistant"
    >
      <Bot className="h-6 w-6" />
    </button>
  );
}