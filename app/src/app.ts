// App state: the site file, the DAO rebuilt from relays, this device's identity, the treasury.
import { useEffect, useState } from 'preact/hooks';
import { usable, type SiteConfig } from './core/config';
import { KIND, sign, template, type Event } from './core/events';
import { rebuild, type DaoState, type Member } from './core/state';
import { parseDescriptor } from './core/descriptor';
import { loadTreasury, type TreasuryView } from './core/chain';
import { prfSalt, pubkeyOf, unwrapSecret, wrapSecret } from './core/identity';
import { parseJson } from './core/util';
import { query, publish, type PublishResult } from './lib/relays';
import { createPasskey, credTagOf, getPrf } from './lib/passkey';
import { prefs, session, store, type LocalIdentity, type PendingFounder } from './lib/store';

export type Lang = 'it' | 'en';

export interface AppState {
  site?: SiteConfig;
  loadError?: string;
  loading: boolean;
  events: Event[];
  dao?: DaoState;
  daoId?: string;
  pending?: PendingFounder;
  identity?: LocalIdentity;
  secret?: string; // unlocked identity key, this tab only
  me?: Member;
  treasury?: TreasuryView;
  treasuryError?: string;
  lang: Lang;
  lastSync?: number;
}

let state: AppState = { loading: true, events: [], lang: prefs.lang() ?? (navigator.language?.startsWith('it') ? 'it' : 'en') };
const listeners = new Set<() => void>();

export const getState = () => state;

export function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

export function useApp(): AppState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

export const relaysOf = (site: SiteConfig) => usable(site.relays);

async function fetchEvents(site: SiteConfig): Promise<Event[]> {
  const relays = relaysOf(site);
  if (site.daoId) return query(relays, { '#D': [site.daoId], limit: 5000 });
  const gens = await query(relays, { kinds: [KIND.genesis], limit: 500 });
  const ids = [
    ...new Set(
      gens
        .filter(g => parseJson<{ site?: string }>(g.content)?.site === site.site)
        .map(g => g.tags.find(t => t[0] === 'D')?.[1])
        .filter((x): x is string => !!x),
    ),
  ];
  if (!ids.length) return gens;
  const rest = await query(relays, { '#D': ids, limit: 5000 });
  return [...gens, ...rest];
}

function derive(events: Event[], extra: Partial<AppState> = {}) {
  const site = state.site!;
  const dao = rebuild(site, events, (extra.pending ?? state.pending)?.pubkey);
  const daoId = dao.founded?.daoId;
  const s = { ...state, ...extra };
  const pubkey = s.secret ? pubkeyOf(s.secret) : s.identity?.pubkey;
  const me = pubkey ? dao.members.find(m => m.key === pubkey) : undefined;
  setState({ ...extra, events, dao, daoId, me, lastSync: Date.now() });
}

export async function init() {
  try {
    const r = await fetch('./dao.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`dao.json ${r.status}`);
    const site = (await r.json()) as SiteConfig;
    setState({ site, pending: await store.getPending(site.site) });
    await sync();
  } catch (e) {
    setState({ loading: false, loadError: String((e as Error).message ?? e) });
  }
}

export async function sync() {
  const site = state.site;
  if (!site) return;
  const events = await fetchEvents(site);
  const pending = await store.getPending(site.site);
  const dao = rebuild(site, events, pending?.pubkey);
  const daoId = dao.founded?.daoId;
  let identity: LocalIdentity | undefined;
  let secret: string | undefined;
  if (daoId) {
    identity = await store.getIdentity(daoId);
    secret = session.get(daoId) ?? identity?.plain;
  }
  derive(events, { identity, secret, loading: false, pending });
  if (daoId && !state.treasury) void refreshTreasury();
}

export async function refreshTreasury() {
  const cfg = state.dao?.founded?.config;
  if (!cfg) return;
  try {
    const d = parseDescriptor(cfg.descriptor, cfg.network);
    setState({ treasury: await loadTreasury(d, cfg.network, usable(cfg.chainApi)), treasuryError: undefined });
  } catch (e) {
    setState({ treasuryError: String((e as Error).message ?? e) });
  }
}

/** Sign with the unlocked key, publish to every relay, and fold the event into local state. */
export async function signAndPublish(kind: number, content: unknown, tags: string[][] = [], secret = state.secret, daoId = state.daoId): Promise<{ event: Event; result: PublishResult }> {
  if (!secret || !daoId || !state.site) throw new Error('not-signed-in');
  const event = sign(template(kind, daoId, content, tags), secret);
  const result = await publish(relaysOf(state.site), event);
  if (!result.ok.length) throw new Error('publish-failed: ' + result.failed.map(f => f.reason).join('; '));
  derive([...state.events, event]);
  return { event, result };
}

/** Publish an event that is already signed (genesis, endorsements during founding). */
export async function publishSigned(event: Event): Promise<PublishResult> {
  const result = await publish(relaysOf(state.site!), event);
  if (!result.ok.length) throw new Error('publish-failed: ' + result.failed.map(f => f.reason).join('; '));
  derive([...state.events, event]);
  return result;
}

/** After founding: protect the founder's key with the passkey and publish dao.keywrap (protocol 3.5 step 5). */
export async function completeFounding(): Promise<void> {
  const { pending, daoId, site } = state;
  if (!pending || !daoId || !site) throw new Error('no-pending');
  let identity: LocalIdentity = { daoId, pubkey: pending.pubkey, credId: pending.credId, treasury: pending.treasury };
  if (pending.credId && pending.prfSupported) {
    const a = await getPrf({ passkeyDomain: site.passkeyDomain, salt: prfSalt(daoId), credId: pending.credId });
    if (!a.prf) throw new Error('no-prf');
    const wrapped = wrapSecret(a.prf, pending.secret);
    identity = { ...identity, wrapped };
    await store.setIdentity(identity);
    session.set(daoId, pending.secret);
    setState({ identity, secret: pending.secret });
    await signAndPublish(KIND.keywrap, wrapped, [['c', a.credTag]]);
  } else {
    identity = { ...identity, plain: pending.secret };
    await store.setIdentity(identity);
    setState({ identity, secret: pending.secret });
  }
  await store.clearPending(site.site);
  derive(state.events, { pending: undefined });
}

/** Passkey sign-in: find this credential's dao.keywrap and open it. */
export async function signIn(): Promise<'ok' | 'no-prf' | 'not-found'> {
  const { site, daoId } = state;
  if (!site || !daoId) throw new Error('not-founded');
  const a = await getPrf({ passkeyDomain: site.passkeyDomain, salt: prfSalt(daoId) });
  if (!a.prf) return 'no-prf';
  let kw = state.dao?.keywraps.get(a.credTag);
  if (!kw) {
    const evs = await query(relaysOf(site), { kinds: [KIND.keywrap], '#D': [daoId], '#c': [a.credTag] });
    derive([...state.events, ...evs]);
    kw = state.dao?.keywraps.get(a.credTag);
  }
  if (!kw) return 'not-found';
  const secret = unwrapSecret(a.prf, kw);
  if (pubkeyOf(secret) !== kw.pubkey) return 'not-found';
  const existing = await store.getIdentity(daoId);
  const identity: LocalIdentity = { ...existing, daoId, pubkey: kw.pubkey, credId: a.credId, wrapped: { nonce: kw.nonce, ct: kw.ct } };
  await store.setIdentity(identity);
  session.set(daoId, secret);
  derive(state.events, { identity, secret });
  return 'ok';
}

/** Identity card restore (protocol 1.7): new passkey, same key, new dao.keywrap. */
export async function restoreFromCard(secret: string, name: string): Promise<'wrapped' | 'local'> {
  const { site, daoId } = state;
  if (!site || !daoId) throw new Error('not-founded');
  const pubkey = pubkeyOf(secret);
  if (!state.dao?.members.some(m => m.key === pubkey)) throw new Error('not-member');
  const salt = prfSalt(daoId);
  const created = await createPasskey({ passkeyDomain: site.passkeyDomain, rpName: site.name, userName: name, salt });
  const existing = await store.getIdentity(daoId);
  let prf = created.prf;
  if (!prf && created.prfSupported) prf = (await getPrf({ passkeyDomain: site.passkeyDomain, salt, credId: created.credId })).prf;
  session.set(daoId, secret);
  if (!prf) {
    const identity: LocalIdentity = { ...existing, daoId, pubkey, credId: created.credId, plain: secret, wrapped: undefined };
    await store.setIdentity(identity);
    derive(state.events, { identity, secret });
    return 'local';
  }
  const wrapped = wrapSecret(prf, secret);
  const identity: LocalIdentity = { ...existing, daoId, pubkey, credId: created.credId, wrapped, plain: undefined };
  await store.setIdentity(identity);
  derive(state.events, { identity, secret });
  await signAndPublish(KIND.keywrap, wrapped, [['c', credTagOf(created.credId)]]);
  return 'wrapped';
}

export function signOut() {
  if (state.daoId) session.clear(state.daoId);
  derive(state.events, { secret: state.identity?.plain });
}

export function setLang(lang: Lang) {
  prefs.setLang(lang);
  document.documentElement.lang = lang;
  setState({ lang });
}
