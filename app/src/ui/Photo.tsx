import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import * as api from '../lib/api';

const stripes = 'repeating-linear-gradient(135deg, rgba(226,114,91,.1) 0 7px, transparent 7px 14px)';

function useSignedUrl(path: string): string {
  // Keyed by path, so a stale URL is never shown for a new path.
  const [got, setGot] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    api
      .photoUrl(path)
      .then((url) => live && setGot({ path, url }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);
  return got && got.path === path ? got.url : '';
}

// A stored entry photo. Shows the striped placeholder until the signed URL loads.
export function EntryPhoto({ path, height, radius = 14 }: { path: string; height: number; radius?: number }) {
  const url = useSignedUrl(path);
  return (
    <span
      style={{
        display: 'block',
        height,
        borderRadius: radius,
        border: '1px solid var(--stone)',
        backgroundColor: 'var(--paper)',
        backgroundImage: url ? `url("${url}")` : stripes,
        backgroundSize: url ? 'cover' : undefined,
        backgroundPosition: 'center',
      }}
    />
  );
}

// Tap-to-add photo field for the story and backfill forms. Uploads straight
// away (under the entry's id, which drafts always have) and reports the stored
// path; the entry itself is written on publish/commit.
export function PhotoField({ entryId, path, onChange }: { entryId: string; path: string; onChange: (path: string) => void }) {
  const { state, dispatch } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState('');
  const url = useSignedUrl(preview ? '' : path);
  const shown = preview || url;

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    if (!file || !state.authUserId) return;
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      onChange(await api.uploadPhoto(state.authUserId, entryId, file));
    } catch {
      setPreview('');
      dispatch({ type: 'SHOW_TOAST', message: "couldn't upload that photo — try a smaller one." });
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPreview('');
    onChange('');
  }

  const has = !!path || busy;

  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />
      <button
        onClick={() => (has && !busy ? clear() : !busy && input.current?.click())}
        style={{
          width: '100%',
          height: 132,
          borderRadius: 14,
          border: '1px solid var(--stone)',
          backgroundColor: 'var(--paper)',
          backgroundImage: shown ? `url("${shown}")` : has ? stripes : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          cursor: busy ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink)',
        }}
      >
        <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: 'var(--ink-body)', background: 'var(--cream-lighter)', borderRadius: 4, padding: '4px 8px' }}>
          {busy ? 'uploading…' : has ? 'photo attached · tap to remove' : 'tap to add a photo'}
        </span>
      </button>
    </>
  );
}
