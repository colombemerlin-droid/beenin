import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { TabMapIcon, TabFeedIcon, TabNotificationsIcon, TabProfileIcon, PlusIcon } from '../ui/icons';
import type { TabKind } from '../state/types';

export function TabBar() {
  const { state, dispatch } = useStore();

  function color(tab: TabKind) {
    return state.tab === tab ? 'var(--coral-dark)' : 'var(--ink-40)';
  }

  return (
    <div
      className="tab-bar bottom-safe"
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'flex-start',
        padding: '0 4px 34px',
        borderTop: '1px solid var(--stone)',
        background: 'rgba(250,246,240,.86)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <TabButton icon={<TabMapIcon />} label="Map" active={color('map')} onClick={() => dispatch({ type: 'SET_TAB', tab: 'map' })} />
      <TabButton icon={<TabFeedIcon />} label="Feed" active={color('feed')} onClick={() => dispatch({ type: 'SET_TAB', tab: 'feed' })} />
      <div style={{ flex: 1, height: 64, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <button
          onClick={() => dispatch({ type: 'OPEN_STORY' })}
          style={{
            width: 52,
            height: 52,
            marginTop: -2,
            borderRadius: '50%',
            border: 0,
            background: 'var(--coral)',
            color: '#FFF8F2',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 0 rgba(194,90,69,.25), 0 6px 12px rgba(194,90,69,.18)',
          }}
        >
          <PlusIcon />
        </button>
      </div>
      <TabButton icon={<TabNotificationsIcon />} label="Notifications" active={color('notifications')} onClick={() => dispatch({ type: 'SET_TAB', tab: 'notifications' })} />
      <TabButton icon={<TabProfileIcon />} label="Profile" active={color('profile')} onClick={() => dispatch({ type: 'SET_TAB', tab: 'profile' })} />
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: 64,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: 0,
        color: active,
        transition: 'color 180ms',
      }}
    >
      {icon}
      <span style={{ font: '500 10px/1.3 Inter, sans-serif' }}>{label}</span>
    </button>
  );
}
