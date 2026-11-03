// Treasury balance, donation address and movements from an Esplora-compatible API (protocol 6.4, 8.6).
import type { Network } from './config';
import { treasuryAddress, type ParsedDescriptor } from './descriptor';

const GAP = 20;

interface AddrStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
  tx_count: number;
}

interface EsploraTx {
  txid: string;
  status: { confirmed: boolean; block_height?: number; block_time?: number };
  vin: { prevout: { scriptpubkey_address?: string; value: number } | null }[];
  vout: { scriptpubkey_address?: string; value: number }[];
  fee: number;
}

export interface Movement {
  txid: string;
  net: number; // sats, + in, − out
  fee: number;
  confirmed: boolean;
  time?: number;
}

export interface TreasuryView {
  balance: number; // confirmed + unconfirmed
  unconfirmed: number;
  donationAddress: string;
  donationIndex: number;
  movements: Movement[];
}

export type Fetcher = (url: string) => Promise<unknown>;

const defaultFetch: Fetcher = async url => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

/** Try each API in turn. */
async function get<T>(apis: string[], path: string, f: Fetcher): Promise<T> {
  let last: unknown;
  for (const api of apis) {
    try {
      return (await f(api.replace(/\/$/, '') + path)) as T;
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error('no chain API');
}

export async function loadTreasury(d: ParsedDescriptor, network: Network, apis: string[], f: Fetcher = defaultFetch): Promise<TreasuryView> {
  let balance = 0;
  let unconfirmed = 0;
  const used: string[] = [];
  let donationAddress = '';
  let donationIndex = -1;

  for (const branch of [0, 1] as const) {
    let gap = 0;
    for (let i = 0; gap < GAP; i += 5) {
      const batch = Array.from({ length: 5 }, (_, k) => treasuryAddress(d, network, branch, i + k).address);
      const stats = await Promise.all(
        batch.map(a => get<{ chain_stats: AddrStats; mempool_stats: AddrStats }>(apis, `/address/${a}`, f)),
      );
      stats.forEach((s, k) => {
        const txs = s.chain_stats.tx_count + s.mempool_stats.tx_count;
        if (txs === 0) {
          gap++;
          if (branch === 0 && donationIndex < 0) {
            donationIndex = i + k;
            donationAddress = batch[k];
          }
          return;
        }
        gap = 0;
        used.push(batch[k]);
        balance += s.chain_stats.funded_txo_sum - s.chain_stats.spent_txo_sum;
        const mem = s.mempool_stats.funded_txo_sum - s.mempool_stats.spent_txo_sum;
        balance += mem;
        unconfirmed += mem;
      });
    }
  }

  const mine = new Set(used);
  const txs = new Map<string, EsploraTx>();
  for (const a of used) for (const tx of await get<EsploraTx[]>(apis, `/address/${a}/txs`, f)) txs.set(tx.txid, tx);
  const movements: Movement[] = [...txs.values()]
    .map(tx => {
      const out = tx.vout.filter(o => o.scriptpubkey_address && mine.has(o.scriptpubkey_address)).reduce((s, o) => s + o.value, 0);
      const inp = tx.vin.filter(i => i.prevout?.scriptpubkey_address && mine.has(i.prevout.scriptpubkey_address)).reduce((s, i) => s + i.prevout!.value, 0);
      return { txid: tx.txid, net: out - inp, fee: tx.fee, confirmed: tx.status.confirmed, time: tx.status.block_time };
    })
    .sort((a, b) => (b.time ?? 4e9) - (a.time ?? 4e9)); // unconfirmed first

  return { balance, unconfirmed, donationAddress, donationIndex, movements };
}
