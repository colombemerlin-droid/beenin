import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import { colorFor, displayInitials } from '../lib/identity';

interface AvatarProps {
  token: string;
  size?: number;
  style?: CSSProperties;
  as?: 'span' | 'button';
  onClick?: () => void;
}

export function Avatar({ token, size = 34, style, as = 'span', onClick }: AvatarProps) {
  const { state } = useStore();
  const label = displayInitials(token, state.profile.name);
  const bg = colorFor(token);
  const common: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: bg,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: `600 ${Math.round(size * 0.42)}px/1 Inter, sans-serif`,
    flex: 'none',
    border: 0,
    padding: 0,
    ...(onClick ? { cursor: 'pointer' } : {}),
    ...style,
  };
  if (as === 'button') {
    return (
      <button onClick={onClick} style={common}>
        {label}
      </button>
    );
  }
  return <span style={common}>{label}</span>;
}
