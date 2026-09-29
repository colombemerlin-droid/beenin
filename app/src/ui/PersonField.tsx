import { useState, type CSSProperties } from 'react';
import { Avatar } from './Avatar';
import { inputStyle } from './Picker';
import { natFlagOf } from '../data/countries';
import type { Companion } from '../types';

// Type-ahead over the remembered people. Suggestions drop down only while
// typing (never a list that's always showing); tapping one picks that person.
// Whatever doesn't match anyone simply stands as a new name.
export function PersonField({
  value,
  people,
  onChange,
  onPick,
  placeholder,
  style,
}: {
  value: string;
  people: Companion[];
  onChange: (text: string) => void;
  onPick: (person: Companion) => void;
  placeholder: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const matches = q ? people.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6) : [];
  // Nothing to suggest once the text is exactly one person's name.
  const settled = matches.length === 1 && matches[0].name.trim().toLowerCase() === q;
  const show = open && matches.length > 0 && !settled;

  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        autoCapitalize="words"
        autoComplete="off"
        style={inputStyle}
      />
      {show && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 5,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--stone)',
            background: 'var(--paper)',
            boxShadow: '0 2px 6px rgba(31,26,23,.08), 0 12px 28px rgba(31,26,23,.12)',
          }}
        >
          {matches.map((c) => (
            <button
              key={c.id}
              role="option"
              // mousedown, not click: fires before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(c);
                setOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid var(--stone)',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--ink)',
              }}
            >
              <Avatar token={c.initials} size={28} />
              <span style={{ flex: 1, minWidth: 0, font: '500 14px/1.3 Inter, sans-serif' }}>{c.name}</span>
              {c.nationalities.length > 0 && (
                <span style={{ flex: 'none', font: '400 12px/1 Inter, sans-serif', color: 'var(--ink-40)' }}>{c.nationalities.map(natFlagOf).join(' ')}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
