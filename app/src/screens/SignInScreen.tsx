import { useEffect, useState } from 'react';
import * as api from '../lib/api';

// A sign-in link that failed (expired, already used) redirects back here with
// the reason in the URL instead of a session. Read it once so it isn't silent.
function linkError(): string {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  const code = params.get('error_code');
  if (!params.get('error') && !code) return '';
  if (code === 'otp_expired') return 'that sign-in link has expired or was already used — send yourself a new one.';
  return params.get('error_description')?.replace(/\+/g, ' ') || 'that sign-in link didn’t work — send yourself a new one.';
}

function sendError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : '';
  if (status === 429 || /rate limit/i.test(message)) {
    return 'too many sign-in emails in the last hour — use the newest link you already got, or try again later.';
  }
  return message ? `couldn't send that link: ${message}` : "couldn't send that link — check the address and try again.";
}

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError);

  // Drop the error from the address bar so a reload starts clean.
  useEffect(() => {
    if (window.location.hash || window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function withGoogle() {
    setError('');
    try {
      await api.signInWithGoogle();
      // Browser redirects away to Google now; nothing else to do here.
    } catch {
      setError("couldn't reach Google sign-in — try again.");
    }
  }

  async function sendLink() {
    const addr = email.trim();
    if (!addr || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.signInWithEmailOtp(addr);
      setSent(true);
    } catch (err) {
      setError(sendError(err));
    } finally {
      setBusy(false);
    }
  }

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
        {sent ? (
          <div style={{ font: '400 14px/1.5 Inter, sans-serif', color: 'var(--ink-body)', textAlign: 'center', padding: '15px 0' }}>
            Check {email.trim()} for a sign-in link.
          </div>
        ) : (
          <>
            <button onClick={withGoogle} style={googleBtnStyle}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.6 9.2c0-.6-.05-1.2-.16-1.75H9v3.32h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.66-3.86 2.66-6.55Z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.95v2.34A9 9 0 0 0 9 18Z" fill="#34A853" />
                <path d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.95a9 9 0 0 0 0 8.1l3-2.34Z" fill="#FBBC05" />
                <path d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.57C13.46.9 11.43 0 9 0A9 9 0 0 0 .95 4.95l3 2.34C4.66 5.16 6.65 3.58 9 3.58Z" fill="#EA4335" />
              </svg>
              <span>Sign in with Google</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendLink()}
                type="email"
                placeholder="you@email.com"
                style={{ flex: 1, minWidth: 0, padding: 15, borderRadius: 8, border: '1px solid var(--stone)', background: 'var(--paper)', font: '400 15px/1 Inter, sans-serif', color: 'var(--ink)' }}
              />
            </div>
            <button onClick={sendLink} disabled={busy || !email.trim()} style={{ ...emailBtnStyle, opacity: busy || !email.trim() ? 0.6 : 1, cursor: busy || !email.trim() ? 'default' : 'pointer' }}>
              {busy ? 'Sending…' : 'Continue with email'}
            </button>
            {error && <div style={{ font: '400 13px/1.4 Inter, sans-serif', color: 'var(--coral-dark)', textAlign: 'center' }}>{error}</div>}
          </>
        )}
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
const emailBtnStyle = { ...baseBtn, border: 0, background: 'var(--coral)', color: '#FFF8F2' };
