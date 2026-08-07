/**
 * One-time seed of sample communities for the primary test account only.
 * Safe to ship — email + UID gate; never runs for other users.
 */
import { prepareItemForSave } from './userDataSave';
import { OWNER_SELF } from './buddies';
import { DEV_TEST_UID } from './devSubscriptionOverride';

export const DEV_COMMUNITY_EMAIL = 'lebrockmaldonado@gmail.com';
const SEED_FLAG = 'tpp_dev_communities_seeded_v1';
const SEED_ID_PREFIX = 'dev-seed-community-';

const SEED_DEFS = [
  {
    platform: 'reddit',
    name: 'r/Peptides',
    handle: 'r/Peptides',
    url: 'https://reddit.com/r/Peptides',
    notes: 'Dev seed — Reddit',
  },
  {
    platform: 'discord',
    name: 'Peptide Lab Discord',
    handle: 'peptidelab',
    url: 'https://discord.gg/example',
    notes: 'Dev seed — Discord',
  },
  {
    platform: 'telegram',
    name: 'Research Chat TG',
    handle: '@peptidechat',
    url: 'https://t.me/peptidechat',
    notes: 'Dev seed — Telegram',
  },
  {
    platform: 'facebook',
    name: 'Peptide Research Group',
    handle: 'https://facebook.com/groups/example',
    url: 'https://facebook.com/groups/example',
    notes: 'Dev seed — Facebook',
  },
  {
    platform: 'twitter',
    name: 'Pep Science on X',
    handle: '@pepscience',
    url: 'https://x.com/pepscience',
    notes: 'Dev seed — X / Twitter',
  },
  {
    platform: 'youtube',
    name: 'Peptide Protocols YT',
    handle: '@peptideprotocols',
    url: 'https://youtube.com/@peptideprotocols',
    notes: 'Dev seed — YouTube',
  },
  {
    platform: 'forum',
    name: 'Longevity Forum',
    handle: 'https://forum.example.com/longevity',
    url: 'https://forum.example.com/longevity',
    notes: 'Dev seed — Forum',
  },
  {
    platform: 'other',
    name: 'Private Signal Circle',
    handle: 'https://signal.example.com/join/demo',
    url: 'https://signal.example.com/join/demo',
    notes: 'Dev seed — Other',
  },
];

function isDevCommunityAccount(user) {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase().trim();
  if (email === DEV_COMMUNITY_EMAIL) return true;
  if (user.uid && user.uid === DEV_TEST_UID) return true;
  return false;
}

function alreadySeeded() {
  try {
    return localStorage.getItem(SEED_FLAG) === '1';
  } catch {
    return true;
  }
}

function markSeeded() {
  try {
    localStorage.setItem(SEED_FLAG, '1');
  } catch { /* ignore */ }
}

export function buildDevCommunitySeeds() {
  const now = new Date().toISOString();
  return SEED_DEFS.map((def) =>
    prepareItemForSave(
      {
        ...def,
        id: `${SEED_ID_PREFIX}${def.platform}`,
        section: 'community',
        ownerId: OWNER_SELF,
        createdAt: now,
      },
      { isNew: true }
    )
  );
}

/**
 * If this is the test account and seeds haven't been applied, merge missing
 * seed communities into the list and persist. Returns the next list or null
 * if nothing changed.
 */
export function maybeSeedDevCommunities(user, currentList) {
  if (!isDevCommunityAccount(user)) return null;
  if (alreadySeeded()) return null;

  const list = Array.isArray(currentList) ? [...currentList] : [];
  const byId = new Set(list.map((c) => c?.id).filter(Boolean));
  const seeds = buildDevCommunitySeeds();
  let added = 0;
  seeds.forEach((seed) => {
    if (!byId.has(seed.id)) {
      list.unshift(seed);
      byId.add(seed.id);
      added += 1;
    }
  });
  markSeeded();
  return added > 0 ? list : null;
}
