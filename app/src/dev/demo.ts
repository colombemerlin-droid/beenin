// Development-only sample account, for visual QA without signing in.
// Enabled by opening the dev server with `?demo` (or `?demo=handle` /
// `?demo=signup` for the onboarding steps). `import.meta.env.DEV` is false in
// production builds, so none of this ships.
import { ME_KEY } from '../lib/identity';
import type { Entry, Companion, Friend, FriendPost } from '../types';
import type { GroupMap, OnboardingStep, ServerData } from '../state/types';

export function demoStep(): OnboardingStep | null {
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(window.location.search).get('demo');
  if (v === null) return null;
  return v === 'handle' ? 'handle' : v === 'signup' ? 'signup' : 'done';
}

const DAY = 86_400_000;

function entry(p: Partial<Entry> & { id: string }): Entry {
  return {
    country: '',
    nationality: [],
    city: '',
    date: '',
    name: '',
    note: '',
    emoji: '',
    place: '',
    placePub: false,
    photoPath: '',
    pub: false,
    stub: false,
    ord: -(Date.now() - DAY),
    when: '1d',
    kudos: [],
    iK: false,
    comments: [],
    ...p,
  };
}

// Built on demand (not at module load) so production builds can drop it.
function build(): ServerData {
  const now = Date.now();
  const ago = (days: number) => -(now - days * DAY);

  const companions: Companion[] = [
    { id: 'c-marco', name: 'Marco', initials: 'MA', nationalities: ['Italian'] },
    { id: 'c-ines', name: 'Inês Duarte', initials: 'ID', nationalities: ['Portuguese', 'Brazilian'] },
    { id: 'c-kenji', name: 'Kenji', initials: 'KE', nationalities: ['Japanese'] },
  ];

  const entries: Entry[] = [
    entry({
      id: 'e1',
      companionId: 'c-ines',
      country: 'Portugal',
      nationality: ['Portuguese', 'Brazilian'],
      date: '2026-09-20',
      metDateNumber: '3',
      metDateLocation: 'a rooftop bar in Alfama',
      note: 'pastéis de nata at 2am. no regrets.',
      emoji: '🌅',
      pub: true,
      photoPath: 'demo/photo.jpg',
      ord: ago(2),
      when: '2d',
      kudos: ['LT', 'SB'],
      kudosBy: ['Léa Thomas', 'Sam Brennan'],
      comments: [
        { who: 'Léa Thomas', initials: 'LT', text: 'the nata detail 😂', when: '2d' },
        { who: 'Colombe', initials: ME_KEY, text: 'worth it', when: '1d' },
      ],
    }),
    entry({
      id: 'e2',
      companionId: 'c-kenji',
      date: '2026-09-14',
      metDateNumber: '1',
      note: 'first date, ramen, rain. a good omen?',
      emoji: '🍜',
      pub: true,
      hideName: true,
      ord: ago(9),
      when: '1w',
    }),
    entry({
      id: 'e3',
      companionId: 'c-marco',
      country: 'Italy',
      nationality: ['Italian'],
      date: '2024-09-27',
      note: 'Lake Como. still thinking about it.',
      emoji: '🍝',
      pub: false,
      ord: ago(40),
      when: '6w',
    }),
    entry({ id: 'e4', country: 'Mexico', nationality: ['Mexican'], date: '2023-03-11', name: 'Diego', stub: true, ord: 20000, when: 'backfilled' }),
    entry({ id: 'e5', country: 'Ireland', nationality: ['Irish'], date: '', stub: true, ord: 20001, when: 'backfilled' }),
    entry({
      id: 'e6',
      country: 'Morocco',
      nationality: ['French'],
      date: '2025-05-02',
      place: 'Riad in the medina',
      placePub: false,
      note: 'mint tea, sunsets, and a very long taxi ride.',
      emoji: '🐪',
      stub: false,
      ord: 20002,
      when: 'backfilled',
    }),
  ];

  const maps: GroupMap[] = [
    {
      id: 'm-us',
      name: 'Us, Abroad',
      nationalities: ['Portuguese', 'Brazilian'],
      entries: [
        entry({ id: 'me1', country: 'Spain', stub: true, when: 'backfilled', ord: 20010 }),
        entry({ id: 'me2', country: 'Greece', stub: true, when: 'backfilled', ord: 20011 }),
        entry({ id: 'me3', country: 'Portugal', stub: true, when: 'backfilled', ord: 20012 }),
      ],
    },
  ];

  const friends: Friend[] = [
    { id: 'f-lea', name: 'Léa Thomas', handle: 'leat', initials: 'LT', status: '@leat', requestState: 'accepted', requestedAt: now - 30 * DAY },
    { id: 'f-sam', name: 'Sam Brennan', handle: 'sambrennan', initials: 'SB', status: '@sambrennan', requestState: 'accepted', requestedAt: now - 20 * DAY },
    { id: 'f-noor', name: 'Noor Haddad', handle: 'noor_h', initials: 'NH', status: 'wants to be friends', requestState: 'pending_in', requestedAt: now - DAY },
    { id: 'f-ben', name: 'Ben', handle: 'benontour', initials: 'BE', status: 'request sent', requestState: 'pending_out', requestedAt: now - 2 * DAY },
  ];

  const friendPosts: FriendPost[] = [
    {
      id: 'fp1',
      ownerId: 'f-lea',
      who: 'Léa Thomas',
      initials: 'LT',
      country: 'Japan',
      nationality: 'Japanese',
      place: 'Shimokitazawa',
      companionName: 'Haruto',
      metDateNumber: '5',
      metDateLocation: 'a jazz kissa',
      date: '2026-09-25',
      note: 'he knew every record by the first three notes.',
      emoji: '🎷',
      photoPath: '',
      when: '5h',
      ord: ago(0.2),
      kudos: [ME_KEY, 'SB'],
      kudosBy: ['Colombe', 'Sam Brennan'],
      iK: true,
      comments: [{ who: 'Sam Brennan', initials: 'SB', text: 'stop this is so cute', when: '4h' }],
    },
    {
      id: 'fp2',
      ownerId: 'f-sam',
      who: 'Sam Brennan',
      initials: 'SB',
      country: 'Greece',
      nationality: 'Greek',
      place: '',
      date: '2026-09-18',
      note: '',
      emoji: '⛵',
      photoPath: 'demo/photo2.jpg',
      when: '3d',
      ord: ago(3),
      kudos: [],
      iK: false,
      comments: [],
    },
    {
      id: 'fp3',
      ownerId: 'f-sam',
      who: 'Sam Brennan',
      initials: 'SB',
      country: '',
      nationality: '',
      place: '',
      date: '2026-09-10',
      note: 'third date and she brought a board game. marrying her.',
      emoji: '🎲',
      photoPath: '',
      when: '2w',
      ord: ago(14),
      kudos: ['LT'],
      kudosBy: ['Léa Thomas'],
      iK: false,
      comments: [],
    },
  ];

  return { entries, companions, maps, friends, friendPosts };
}

export const demoAccount = {
  userId: 'demo-user',
  displayName: 'Colombe',
  handle: 'colombe',
};

export function demoData(): ServerData {
  return build();
}
