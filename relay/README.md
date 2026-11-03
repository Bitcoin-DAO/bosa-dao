# DAO relay

BOSA DAO's own Nostr relay: [Nosflare](https://github.com/Spl0itable/nosflare) 7.9.45 (MIT, see `LICENSE-nosflare`), set up for the policy in `docs/protocol.md` §7.3. It runs on Cloudflare's free Workers plan, with a D1 database and Durable Objects.

## What was changed from Nosflare

All in `src/config.ts` unless noted:

| Setting | Nosflare default | Here |
| --- | --- | --- |
| Event kinds | all | only 3570–3586 |
| `D` tag | not checked | required on every event (new `hasDaoTag`, checked in `src/durable-object.ts`); any 64-hex value until `REQUIRED_DAO_ID` is set, then only the DAO id |
| Pay to relay | on | off |
| Sign-in to read or write (NIP-42) | required | not required: anyone can read, any key can publish |
| Pruning | deletes old events above 9 GB | off: every event is kept |
| Deletion requests (kind 5) | honoured | rejected, as kind 5 is not allowed |
| Rate limits per connection | 10 events, 50 requests a minute | 60 events (bursts of 120), 120 requests a minute |
| Relay name, contact | Nosflare's | BOSA DAO's |
| `wrangler.toml` | `cpu_ms` limit, Nosflare's database | no limit (needed on the free plan); worker and database named `bosa-dao-relay` |

Tested locally with `wrangler dev`: a kind 3572 event with a `D` tag is saved and read back with a `#D` filter; a kind 1 note, an event without a `D` tag, one with a malformed `D` tag, and a kind 5 deletion are all refused.

## Deploying (Cloudflare dashboard, once)

1. **Database.** Storage & databases → D1 → Create database. Name it `bosa-dao-relay`, location Western Europe. Copy its **Database ID** into `database_id` in `wrangler.toml` and commit.
2. **Worker from GitHub.** Workers & Pages → Create → Import a repository. Connect GitHub and allow the Cloudflare app on the Bitcoin-DAO organisation, for the `btc-dao` repository only. Choose `btc-dao`, then:
   - Project name: `bosa-dao-relay` (must match `name` in `wrangler.toml`)
   - Root directory (under Advanced): `relay`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Build watch paths, include: `relay/*`, so only relay changes redeploy it
3. **Deploy**, then open the `workers.dev` address in a browser once: that creates the database tables. The page should say "BOSA DAO relay".
4. Put the address, as `wss://bosa-dao-relay.<account>.workers.dev`, first in `relays` in the DAO config.

## After founding

Once the genesis exists, set `REQUIRED_DAO_ID` in `src/config.ts` to the DAO id, run `npm run build` and commit. Cloudflare redeploys by itself.

## Mainnet

Add `relay.bosadao.it` under the worker's Settings → Domains & Routes once `bosadao.it` is on Cloudflare, and list it in the mainnet config.
