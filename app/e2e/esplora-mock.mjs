// Minimal Esplora mock: addresses listed in funded.json have one incoming tx each.
import http from 'node:http';
import fs from 'node:fs';
const file = new URL('./out/funded.json', import.meta.url);
const funded = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
const zero = { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 };
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  const m = req.url.match(/^\/api\/address\/([a-z0-9]+)(\/txs)?$/);
  if (!m) { res.statusCode = 404; return res.end('{}'); }
  const f = funded()[m[1]];
  if (m[2]) return res.end(JSON.stringify(f ? [{ txid: f.txid, fee: 141, status: { confirmed: true, block_height: 100, block_time: 1793700000 }, vin: [{ prevout: { scriptpubkey_address: 'tb1qsomeoneelse', value: f.value + 141 } }], vout: [{ scriptpubkey_address: m[1], value: f.value }] }] : []));
  res.end(JSON.stringify({ chain_stats: f ? { funded_txo_sum: f.value, spent_txo_sum: 0, tx_count: 1 } : zero, mempool_stats: zero }));
}).listen(3002, '127.0.0.1', () => console.log('esplora mock on 3002'));
