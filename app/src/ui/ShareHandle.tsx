import { useStore } from '../state/store';

// The viewer's own @handle, tappable to share it: the native share sheet on
// phones, the clipboard elsewhere. Friends can only add each other by handle,
// so this is how people swap them.
export function ShareHandle({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useStore();
  const handle = state.profile.handle;
  if (!handle) return null;

  async function share() {
    const text = `Add me on Been In: @${handle}`;
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} — ${url}`);
      dispatch({ type: 'SHOW_TOAST', message: `copied — send @${handle} to a friend.` });
    } catch (err) {
      // Closing the share sheet isn't an error worth reporting.
      if (err instanceof Error && err.name === 'AbortError') return;
      dispatch({ type: 'SHOW_TOAST', message: `your handle is @${handle}` });
    }
  }

  return (
    <button
      onClick={share}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? 0 : '8px 12px',
        borderRadius: 999,
        border: compact ? 0 : '1px solid var(--stone)',
        background: compact ? 'transparent' : 'var(--paper)',
        cursor: 'pointer',
        color: 'var(--ink-body)',
        font: '500 13px/1.3 Inter, sans-serif',
      }}
    >
      <span>@{handle}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 3v13" />
        <path d="m7 8 5-5 5 5" />
      </svg>
    </button>
  );
}
