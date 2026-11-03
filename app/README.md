# btc-dao app

The DAO's website: one static page that members open on their phones. It holds no keys that can move funds and talks only to the DAO's relays and its chain API. Everything it shows is rebuilt in the browser from signed events (`docs/protocol.md` section 8).

**Stage 1 of the testnet4 prototype** (this version):

- founder sign-up with a passkey and a random identity key, the short code and the founder QR code;
- the council's setup page: basics, council (identity plus trial treasury key), founders, publish the genesis, endorsements;
- the passkey wrap of each founder's key (`dao.keywrap`) once the DAO is founded, passkey sign-in on any synced device;
- identity cards printed straight from the browser, and restoring from a card on a new phone;
- the treasury page: balance, donation address (one at a time, none at the cap), movements, from the descriptor and the chain API;
- members and rules pages, with the charter checked against its hash.

Stage 2 adds proposals, votes, tallies and membership changes; stage 3 adds payout rounds and signing.

For the trial, each council member's phone also creates a **test treasury key** (12 words, testnet4 only) and shares its xpub in the founder code. On the setup page any council key can be swapped for one from Sparrow, Nunchuk or SeedSigner (`[fingerprint/48h/1h/0h/2h]tpub…`). The mainnet DAO uses SeedSigner only.

## Layout

| Path | What it holds |
| --- | --- |
| `src/core/` | The protocol, with no browser code: canonical JSON, short codes, events, descriptors and addresses, identity keys and cards, rebuilding state, the treasury from an Esplora API. Unit tests in `core.test.ts` |
| `src/lib/` | Browser parts: passkeys (WebAuthn PRF), relays, QR drawing and scanning, IndexedDB storage |
| `src/ui/` | The screens, following `design/mockups` |
| `src/i18n.ts` | Italian and English text |
| `e2e/` | End-to-end tests with a local relay, a mock chain API and virtual passkeys |

## Config

The build reads the DAO's config file and serves it as `dao.json` beside the page. It takes `DAO_CONFIG` if set, then `config/dao.json` (an instance's own file), then the example. Placeholders in square brackets are ignored. After founding, add `"daoId": "<id>"` to the instance's file so the app goes straight to that DAO.

The page's content security policy is built from the same file: it can connect only to the listed relays and chain APIs.

## Develop and test

```sh
npm ci
npm test            # protocol unit tests
npm run dev         # local site; passkeys bind to localhost
npm run build       # type check and build into dist/
bash e2e/run.sh     # end to end (needs relay/ installed, Playwright with Chromium, ffmpeg)
```

The end-to-end run founds a DAO with five council phones and two founders (one remote), checks the identity card's QR, funds the treasury in a mock chain API, signs out and back in with the passkey, restores on a new phone from the card, and reads a card through a fake camera.

## Deploy

`.github/workflows/pages.yml` builds and publishes the site to GitHub Pages whenever the repository has a `config/dao.json`, so it runs in a DAO's own copy (such as `Bitcoin-DAO/bosa-dao`) and not in `btc-dao` itself. In the copy, set Settings → Pages → Source to "GitHub Actions".
