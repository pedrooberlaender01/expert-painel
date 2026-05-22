import React, { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  variant?: 'accent' | 'danger' | 'emoji';
}

const VARIANT_STYLES = {
  accent: { bg: 'bg-accent/10', text: 'text-accent-bright', border: 'border-accent/20', close: 'hover:bg-accent/20' },
  danger: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', close: 'hover:bg-red-500/20' },
  emoji: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20', close: 'hover:bg-amber-500/20' },
};

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder,
  variant = 'accent',
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const style = VARIANT_STYLES[variant];

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput('');
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-[#0e0e10] text-white text-[12px] rounded-lg px-3 py-2 border border-[#1e1e22] focus:border-primary/30 focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.08)] focus:outline-none placeholder-[#4b4b55] transition-all"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!input.trim()}
          className="px-2.5 py-2 bg-[#1a1a1e] hover:bg-[#252528] disabled:opacity-30 disabled:cursor-not-allowed text-[#6b7280] rounded-lg border border-[#1e1e22] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all animate-[fadeIn_150ms_ease-out]',
                style.bg, style.text, style.border
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className={cn('rounded-full p-0.5 transition-colors', style.close)}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
