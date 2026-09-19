import { useStore } from '../state/store';

export function SignInScreen() {
  const { dispatch } = useStore();

  return (
    <div
      className="noscroll"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: 'var(--cream-lighter)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px 0' }}>
        <div className="label" style={{ color: 'var(--coral-dark)' }}>
          Been In
        </div>
        <div className="serif" style={{ fontSize: 34, lineHeight: 1.1, marginTop: 10 }}>
          Ditch the red flags. Collect the world's.
        </div>
        <div style={{ font: '400 14px/1.55 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 12 }}>
          Two maps, one passport, nobody watching but you.
        </div>
      </div>
      <div style={{ flex: 'none', padding: '28px 24px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => dispatch({ type: 'SIGN_IN' })} style={googleBtnStyle}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.6 9.2c0-.6-.05-1.2-.16-1.75H9v3.32h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.66-3.86 2.66-6.55Z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.95v2.34A9 9 0 0 0 9 18Z" fill="#34A853" />
            <path d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.95a9 9 0 0 0 0 8.1l3-2.34Z" fill="#FBBC05" />
            <path d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.57C13.46.9 11.43 0 9 0A9 9 0 0 0 .95 4.95l3 2.34C4.66 5.16 6.65 3.58 9 3.58Z" fill="#EA4335" />
          </svg>
          <span>Sign in with Google</span>
        </button>
        <button onClick={() => dispatch({ type: 'SIGN_IN' })} style={appleBtnStyle}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.4 12.8c0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.9-1.5-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.9-1.6 0-3 .9-3.8 2.4-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.8 3-.8s1.8.8 3 .8 2-1.1 2.8-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.6ZM14.3 5.4c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.5 2.8-1.3Z" />
          </svg>
          <span>Sign in with Apple</span>
        </button>
        <button onClick={() => dispatch({ type: 'SIGN_IN' })} style={emailBtnStyle}>
          Create an account with email
        </button>
        <div style={{ font: '400 12px/1.6 Inter, sans-serif', color: 'var(--ink-40)', textAlign: 'center', marginTop: 8 }}>
          Your maps are private to you. Posts stay inside your friend circle.
        </div>
      </div>
    </div>
  );
}

const baseBtn = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: 15,
  borderRadius: 8,
  cursor: 'pointer',
  font: '600 15px/1 Inter, sans-serif',
} as const;

const googleBtnStyle = { ...baseBtn, border: '1px solid var(--stone)', background: 'var(--paper)', color: 'var(--ink)' };
const appleBtnStyle = { ...baseBtn, border: 0, background: 'var(--ink)', color: 'var(--cream-lighter)' };
const emailBtnStyle = { ...baseBtn, border: 0, background: 'var(--coral)', color: '#FFF8F2' };
