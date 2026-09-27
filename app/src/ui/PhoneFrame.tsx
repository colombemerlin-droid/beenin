import type { ReactNode } from 'react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-frame-outer">
      <div className="phone-frame-header">
        <div className="label">Been In</div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.15, maxWidth: 340 }}>
          Ditch the red flags. Collect the world’s.
        </div>
      </div>

      <div className="phone-frame-box">{children}</div>
    </div>
  );
}

// Space above the app content: the real status bar / notch on a phone
// (safe-area inset), a little breathing room in the desktop preview frame.
export function TopInset() {
  return <div className="top-inset" />;
}
