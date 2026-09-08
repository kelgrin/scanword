import React, { useEffect, useRef } from 'react';

interface ClueTooltipProps {
  text: string;
  onClose: () => void;
  x: number;
  y: number;
}

const ClueTooltip: React.FC<ClueTooltipProps> = ({ text, onClose, x, y }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px] max-w-[250px] animate-fade-in"
      style={{
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '4px',
      }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45" />
      <p className="text-sm text-gray-700 relative z-10">{text}</p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
      >
        ✕
      </button>
    </div>
  );
};

export default ClueTooltip;
