// Rebuilding the DAO from events (protocol 8). Stage 1: genesis, endorsements, roster v1, keywraps.
import type { DaoConfig, SiteConfig } from './config';
import { KIND, byTime, tagValue, verified, type Event } from './events';
import { hashJson, parseJson } from './util';

export interface Member {
  key: string;
  name: string;
  council: boolean;
  verified: 'in_person' | 'remote';
  since: number; // unix seconds
}

export interface Rejected {
  event: Event;
  reason: string;
}

export interface GenesisCandidate {
  event: Event;
  config: DaoConfig;
  daoId: string;
  endorsers: { key: string; at: number; eventId: string }[];
  /** Time the threshold was reached, if it was. */
  effectiveAt?: number;
}

export interface DaoState {
  /** The founded DAO, once its genesis has enough endorsements. */
  founded?: GenesisCandidate;
  /** Published but not yet founded (shown to founders while they wait). */
  pending: GenesisCandidate[];
  /** Two or more founded genesis events for this site: shown as a warning. */
  conflict: boolean;
  members: Member[];
  keywraps: Map<string, { pubkey: string; nonce: string; ct: string; at: number }>;
  rejected: Rejected[];
}

function validGenesis(e: Event, rejected: Rejected[]): GenesisCandidate | undefined {
  const config = parseJson<DaoConfig>(e.content);
  if (!config || typeof config !== 'object') return void rejected.push({ event: e, reason: 'genesis: content is not JSON' });
  const daoId = hashJson(config);
  if (tagValue(e, 'D') !== daoId) return void rejected.push({ event: e, reason: 'genesis: D tag is not the hash of its content' });
  if (!Array.isArray(config.council) || !config.council.some(c => c.identityKey === e.pubkey))
    return void rejected.push({ event: e, reason: 'genesis: signer is not on its own council' });
  if (!(config.threshold >= 1 && config.threshold <= config.council.length))
    return void rejected.push({ event: e, reason: 'genesis: bad threshold' });
  return { event: e, config, daoId, endorsers: [] };
}

/** `prefer`: a key this device signed up with; a founded genesis listing it wins over others for the same site. */
export function rebuild(site: SiteConfig, events: Event[], prefer?: string): DaoState {
  const rejected: Rejected[] = [];
  const seen = new Set<string>();
  const all = events
    .filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .filter(e => {
      if (!verified(e)) return rejected.push({ event: e, reason: 'bad signature' }), false;
      if (tagValue(e, 'v') !== '1') return rejected.push({ event: e, reason: 'unsupported protocol version' }), false;
      return true;
    })
    .sort(byTime);

  // 1. Genesis candidates for this site, or the one named in the site file.
  const candidates: GenesisCandidate[] = [];
  for (const e of all.filter(e => e.kind === KIND.genesis)) {
    const g = validGenesis(e, rejected);
    if (!g) continue;
    if (site.daoId ? g.daoId !== site.daoId : g.config.site !== site.site) continue;
    if (g.config.network !== site.network) continue;
    candidates.push(g);
  }

  // 2. Endorsements of each candidate by its own council, distinct signers.
  for (const e of all.filter(e => e.kind === KIND.endorse)) {
    const target = tagValue(e, 'e');
    const g = candidates.find(c => c.event.id === target);
    if (!g) continue;
    const body = parseJson<{ object: string; hash: string }>(e.content);
    if (!body || body.object !== 'genesis' || body.hash !== g.daoId || tagValue(e, 'D') !== g.daoId) {
      rejected.push({ event: e, reason: 'endorse: wrong object or hash' });
      continue;
    }
    if (!g.config.council.some(c => c.identityKey === e.pubkey)) {
      rejected.push({ event: e, reason: 'endorse: signer is not on the council' });
      continue;
    }
    if (g.endorsers.some(x => x.key === e.pubkey)) continue;
    g.endorsers.push({ key: e.pubkey, at: e.created_at, eventId: e.id });
    if (!g.effectiveAt && g.endorsers.length >= g.config.threshold) g.effectiveAt = e.created_at;
  }

  const foundedAll = candidates.filter(c => c.effectiveAt !== undefined).sort((a, b) => a.effectiveAt! - b.effectiveAt!);
  const lists = (g: GenesisCandidate, k: string) =>
    g.config.council.some(c => c.identityKey === k) || g.config.founders?.some(f => f.identityKey === k);
  const founded = (prefer && foundedAll.find(g => lists(g, prefer))) || foundedAll[0];
  const pending = founded ? [] : candidates;

  // 3. Roster version 1: the genesis council plus founders.
  const members: Member[] = [];
  if (founded) {
    const since = founded.effectiveAt!;
    for (const c of founded.config.council) members.push({ key: c.identityKey, name: c.label, council: true, verified: 'in_person', since });
    for (const f of founded.config.founders) members.push({ key: f.identityKey, name: f.name, council: false, verified: f.verified, since });
  }

  // 4. Keywraps: signer on the roster; latest per credential tag.
  const keywraps = new Map<string, { pubkey: string; nonce: string; ct: string; at: number }>();
  if (founded) {
    for (const e of all.filter(e => e.kind === KIND.keywrap && tagValue(e, 'D') === founded.daoId)) {
      const c = tagValue(e, 'c');
      const body = parseJson<{ nonce: string; ct: string }>(e.content);
      if (!c || !body?.nonce || !body?.ct) {
        rejected.push({ event: e, reason: 'keywrap: malformed' });
        continue;
      }
      if (!members.some(m => m.key === e.pubkey)) {
        rejected.push({ event: e, reason: 'keywrap: signer is not on the roster' });
        continue;
      }
      keywraps.set(c, { pubkey: e.pubkey, nonce: body.nonce, ct: body.ct, at: e.created_at });
    }
  }

  return { founded, pending, conflict: foundedAll.length > 1, members, keywraps, rejected };
}
