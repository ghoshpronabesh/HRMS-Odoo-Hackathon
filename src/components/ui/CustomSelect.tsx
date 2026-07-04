'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  direction?: 'up' | 'down';
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  style,
  direction = 'down'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        width: '100%',
        userSelect: 'none',
        ...style 
      }}
    >
      <div
        onClick={handleToggle}
        className="form-input"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#f1f5f9' : 'var(--bg-input)',
          opacity: disabled ? 0.7 : 1,
          padding: '10px 14px',
          borderColor: isOpen ? 'var(--accent-cyan)' : '#cbd5e1',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-glow)' : 'var(--shadow-sm)'
        }}
      >
        <span style={{ 
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease'
          }} 
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: direction === 'up' ? 'auto' : 'calc(100% + 4px)',
          bottom: direction === 'up' ? 'calc(100% + 4px)' : 'auto',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '4px'
        }} className="animate-fade-in">
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              style={{
                padding: '10px 12px',
                fontSize: '14px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: value === option.value ? 'var(--accent-glow)' : 'transparent',
                color: value === option.value ? 'var(--accent-cyan)' : 'var(--text-primary)',
                fontWeight: value === option.value ? '600' : '400',
                transition: 'all 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
