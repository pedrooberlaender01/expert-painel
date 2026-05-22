import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../utils/cn';

interface QualidadeStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
  readonly?: boolean;
}

export const QualidadeStars: React.FC<QualidadeStarsProps> = ({
  value,
  onChange,
  size = 'md',
  readonly = false,
}) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn(
            'p-0.5 transition-all duration-150',
            !readonly && 'cursor-pointer hover:scale-110',
            readonly && 'cursor-default'
          )}
        >
          <Star
            className={cn(
              iconSize,
              'transition-colors duration-150',
              star <= display
                ? 'text-amber-400 fill-amber-400'
                : 'text-[#2a2a2e]'
            )}
          />
        </button>
      ))}
    </div>
  );
};
