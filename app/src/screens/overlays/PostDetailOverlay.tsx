import { useStore } from '../../state/store';
import { useEntryActions } from '../../state/useEntryActions';
import { flagOf } from '../../data/countries';
import { fmtDate, kudosLabel, plural } from '../../data/format';
import { ME_KEY } from '../../lib/identity';
import { natLabel } from '../../state/selectors';
import { OverlayHeader } from '../../ui/OverlayHeader';
import { Avatar } from '../../ui/Avatar';
import { EntryPhoto } from '../../ui/Photo';
import { ThumbsUpIcon, LockIcon } from '../../ui/icons';

export function PostDetailOverlay() {
  const { state, dispatch } = useStore();
  const { toggleKudos, submitComment } = useEntryActions();
  if (!state.detailOn || !state.detailId) return null;

  const isFeed = state.detailKind === 'feed';
  const close = () => dispatch({ type: 'CLOSE_DETAIL' });

  if (isFeed) {
    const p = state.friendPosts.find((x) => x.id === state.detailId);
    if (!p) return null;
    return (
      <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 45, overflowY: 'auto' }}>
        <OverlayHeader title="Post" onBack={close} />
        <div style={{ padding: '18px 20px 120px' }}>
          <Header token={p.initials} who={p.who} headline={p.country ? `stamped ${flagOf(p.country)} ${p.country}` : 'shared a story'} emoji={p.emoji} />
          {p.nationality && <PassportLine label={p.nationality} />}
          {p.companionName && <InfoLine label="With" value={p.companionName} />}
          <MetLine num={p.metDateNumber} where={p.metDateLocation} />
          {p.place && <PlaceLine place={p.place} />}
          {p.note && <NoteLine note={p.note} />}
          {p.photoPath && <PhotoBlock path={p.photoPath} />}
          <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 12 }}>{p.date ? fmtDate(p.date) : p.when}</div>
          <KudosRow
            iK={p.iK}
            kudos={p.kudos}
            onToggle={() => toggleKudos('feed', p.id)}
          />
          <CommentsBlock
            comments={p.comments}
            note={`stamps and comments here are visible to ${p.who.split(' ')[0]}’s friends only.`}
            commentDraft={state.commentDraft}
            onDraft={(t) => dispatch({ type: 'SET_COMMENT_DRAFT', text: t })}
            onSubmit={submitComment}
          />
        </div>
      </div>
    );
  }

  const e = state.entries.find((x) => x.id === state.detailId);
  if (!e) return null;
  const companion = e.companionId ? state.companions.find((c) => c.id === e.companionId) : undefined;
  const personName = companion?.name || e.name;
  const nameHidden = !e.pub || !!e.hideName;
  const headline = e.country ? `stamped ${flagOf(e.country)} ${e.country}${e.city ? ' · ' + e.city : ''}` : 'shared a story';
  return (
    <div className="noscroll" style={{ position: 'absolute', inset: 0, background: 'var(--cream-lighter)', zIndex: 45, overflowY: 'auto' }}>
      <OverlayHeader title={e.pub ? 'Your post' : 'Private entry'} onBack={close} />
      <div style={{ padding: '18px 20px 120px' }}>
        <Header token={ME_KEY} who={state.profile.name.trim() || 'You'} headline={headline} emoji={e.emoji} />
        {e.nationality.length > 0 && <PassportLine label={natLabel(e)} />}
        <MetLine num={e.metDateNumber} where={e.metDateLocation} />
        {e.place && <PlaceLine place={e.place} tag={e.placePub && e.pub ? 'shared' : 'private'} />}
        {e.note && <NoteLine note={e.note} />}
        {e.photoPath && <PhotoBlock path={e.photoPath} />}
        {nameHidden ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              border: '1px dashed var(--stone-dashed)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ color: 'var(--coral-dark)', display: 'flex' }}>
              <LockIcon size={16} />
            </span>
            <span style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)' }}>
              {e.pub ? `hidden from friends — ${personName || 'no name on file'}` : `for your eyes only — ${personName || 'no name on file'}`}
            </span>
          </div>
        ) : (
          personName && <InfoLine label="With" value={personName} />
        )}
        <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 12 }}>{e.date ? fmtDate(e.date) : e.when}</div>
        <KudosRow iK={e.iK} kudos={e.kudos} onToggle={() => toggleKudos('mine', e.id)} />
        <CommentsBlock
          comments={e.comments}
          note={
            e.pub
              ? e.hideName
                ? 'your friends see the post, its stamps and its comments. the name stays with you.'
                : "your friends see the post, its stamps, its comments — and who it's about."
              : 'private. not on anyone’s feed.'
          }
          commentDraft={state.commentDraft}
          onDraft={(t) => dispatch({ type: 'SET_COMMENT_DRAFT', text: t })}
          onSubmit={submitComment}
        />
      </div>
    </div>
  );
}

function Header({ token, who, headline, emoji }: { token: string; who: string; headline: string; emoji: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar token={token} size={42} style={{ font: '600 17px/1 Inter, sans-serif' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 16px/1.3 Inter, sans-serif' }}>{who}</div>
        <div style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', marginTop: 1 }}>{headline}</div>
      </div>
      {emoji && <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>}
    </div>
  );
}

function PassportLine({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
      <span className="label">Passport</span>
      <span style={{ font: '500 15px/1.3 Inter, sans-serif' }}>{label}</span>
    </div>
  );
}

function PlaceLine({ place, tag }: { place: string; tag?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--ink-body)' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
      <span style={{ font: '400 14px/1.45 Inter, sans-serif' }}>{place}</span>
      {tag && <span style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)' }}>{tag}</span>}
    </div>
  );
}

function NoteLine({ note }: { note: string }) {
  return <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 21, lineHeight: 1.4, marginTop: 12 }}>“{note}”</div>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: 'var(--ink-body)' }}>
      <span className="label">{label}</span>
      <span style={{ font: '500 14px/1.3 Inter, sans-serif' }}>{value}</span>
    </div>
  );
}

function MetLine({ num, where }: { num?: string; where?: string }) {
  if (!num && !where) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--ink-body)' }}>
      <span className="label">We met</span>
      <span style={{ font: '400 14px/1.45 Inter, sans-serif' }}>{[num ? `date #${num}` : '', where].filter(Boolean).join(' · ')}</span>
    </div>
  );
}

function PhotoBlock({ path }: { path: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <EntryPhoto path={path} height={260} />
    </div>
  );
}

function KudosRow({ iK, kudos, onToggle }: { iK: boolean; kudos: string[]; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '14px 0', borderTop: '1px solid var(--stone)', borderBottom: '1px solid var(--stone)' }}>
      <button
        onClick={onToggle}
        style={{
          width: 38,
          height: 38,
          flex: 'none',
          borderRadius: '50%',
          border: `1px solid ${iK ? 'var(--coral)' : 'var(--stone)'}`,
          background: iK ? 'var(--coral-tint)' : 'transparent',
          color: iK ? 'var(--coral-dark)' : 'var(--ink-40)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 180ms',
        }}
      >
        <ThumbsUpIcon size={19} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {kudos.slice(0, 3).map((k, i) => (
          <Avatar key={i} token={k} size={28} style={{ marginRight: -8, border: '1.5px solid var(--cream-lighter)' }} />
        ))}
      </div>
      <span style={{ font: '400 13px/1.45 Inter, sans-serif', color: 'var(--ink-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, marginLeft: 12 }}>{kudosLabel(kudos.length)}</span>
    </div>
  );
}

function CommentsBlock({
  comments,
  note,
  commentDraft,
  onDraft,
  onSubmit,
}: {
  comments: { who: string; initials: string; text: string; when: string }[];
  note: string;
  commentDraft: string;
  onDraft: (t: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="label" style={{ margin: '20px 0 14px' }}>
        {comments.length ? plural(comments.length, 'comment', 'comments') : 'no comments yet'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {comments.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 10 }}>
            <Avatar token={c.initials} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '400 14px/1.5 Inter, sans-serif' }}>
                <b style={{ fontWeight: 600 }}>{c.who}</b> {c.text}
              </div>
              <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 2 }}>{c.when}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <input
          value={commentDraft}
          onChange={(e) => onDraft(e.target.value)}
          placeholder="say something witty…"
          style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--stone)', background: 'var(--paper)', font: '400 15px/1.4 Inter, sans-serif', color: 'var(--ink)' }}
        />
        <button onClick={onSubmit} style={{ padding: '12px 16px', borderRadius: 8, border: 0, background: 'var(--coral)', color: '#FFF8F2', font: '600 15px/1 Inter, sans-serif', cursor: 'pointer' }}>
          Send
        </button>
      </div>
      <div style={{ font: '400 12px/1.4 Inter, sans-serif', color: 'var(--ink-40)', marginTop: 10 }}>{note}</div>
    </>
  );
}
