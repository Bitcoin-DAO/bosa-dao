# btc-dao protocol v1 (draft)

This document defines the data a btc-dao DAO publishes and how any client rebuilds the DAO's state from it. A second, independent client written from this document alone should reach the same state as the reference app. Where this draft and `spec.md` differ, this document is the more precise and the spec will be brought in line.

**Status: draft.** Kind numbers are provisional (see [Kinds](#kinds)). Nothing here is final until phase 1 test cases (requirement S4) pass.

## 1. Building blocks

### 1.1 Nostr events

Every DAO action is a signed Nostr event as defined in NIP-01: `id`, `pubkey`, `created_at`, `kind`, `tags`, `content`, `sig`. The `content` field holds a JSON object serialised as a string. Events are published to every relay listed in the DAO's config; clients query all of them and de-duplicate by `id`.

### 1.2 Common tags

Every event carries:

| Tag | Value | Purpose |
| --- | --- | --- |
| `["D", <dao_id>]` | 64-char hex | Which DAO. Single-letter tags are indexed by relays, so clients can filter `{"#D": [dao_id]}` |
| `["v", "1"]` | protocol version | Clients ignore events with a version they don't support, and say so |

Events that refer to another event add `["e", <event id>]`. Events about a person's key add `["p", <hex pubkey>]`.

### 1.3 Hashing and the DAO id

- **Canonical JSON:** objects are hashed after canonicalisation with RFC 8785 (JSON Canonicalization Scheme).
- **Hash:** SHA-256, lower-case hex.
- **DAO id:** `dao_id = sha256(JCS(genesis config))`, where the genesis config is the content of `dao.config.json` at creation. It never changes, even when later rosters or rules do.

### 1.4 Keys

| Key | Curve and form | Used for |
| --- | --- | --- |
| Identity key | secp256k1, x-only public key (hex) as in Nostr | Signing every event below |
| Treasury key | BIP-32 xpub at `m/48'/0'/0'/2'` (mainnet) or `m/48'/1'/0'/2'` (signet), with its 4-byte fingerprint | Signing PSBTs only |

A council member has both. The config maps each council member's identity key to their xpub and fingerprint, so a client can check that a `dao.sign` event's PSBT signature comes from the treasury key of the person who signed the event.

### 1.5 Identity key and passkey

The identity key is a random secp256k1 secret generated in the browser when the member joins. The member's passkey protects it but does not create it, so a new passkey on any device or domain can take on the same key.

1. `salt = sha256("btc-dao/identity/v1/" || dao_id)`, so one passkey's outputs cannot be linked across DAOs.
2. `prf = WebAuthn PRF output(salt)` (32 bytes) for the member's credential.
3. `wrap_key = HKDF-SHA256(ikm = prf, salt = "", info = "btc-dao identity wrap v1", length = 32)`.
4. `ciphertext = XChaCha20-Poly1305(wrap_key, nonce, secret)`, with a random 24-byte nonce.

The ciphertext is kept in the browser and published as a `dao.keywrap` event (section 5.4), so a synced passkey on another device can fetch and open it. A member may register several passkeys, for example a phone and a YubiKey; each has its own `dao.keywrap`.

Where the phone has no PRF support, the secret stays in that browser's storage and the member uses their identity card (section 1.7) on other devices. Nostr users may instead sign with their existing key through a NIP-07 browser extension and back it up their own way.

The WebAuthn relying-party id is the config's `passkeyDomain`, set to the DAO's registrable domain (for BOSA DAO, `bosadao.it`), not to the full host. Pages on any subdomain, such as `signet.bosadao.it` for the trial, then use the same passkeys. The signet and mainnet DAOs have different DAO ids, so each member has a separate identity in each.

A passkey only works on its own domain. If the DAO moves to a new address (section 7.2), members restore from their identity cards there and register new passkeys. Their identity keys, and so the roster and history, are unchanged.

### 1.6 Short code

The code read aloud at onboarding is derived from the candidate's public key:

`short_code = Crockford-base32(first 40 bits of sha256(pubkey bytes))` → 8 characters, shown as `XXXX · XXXX`.

A key swapped in transit gives a different short code, which is the whole point of reading it aloud.

### 1.7 Identity cards

Identity cards are the member's paper backup of their identity key: one card for an ordinary member (optional), two for a council member (required before the key ceremony). There are no passwords. Cards are printed straight from the browser and never saved as files.

| Card | QR payload |
| --- | --- |
| Member card | `BTCDAO:1:M:<dao8>:<secret>` |
| Council card 1 | `BTCDAO:1:C1:<dao8>:<share1>:<pair>` |
| Council card 2 | `BTCDAO:1:C2:<dao8>:<share2>:<pair>` |

- `dao8` is the first 8 hex characters of the DAO id; `secret`, `share1` and `share2` are 64 hex characters; `pair` is 8 random hex characters shared by both cards of one printing. All hex is upper case, so the payload fits QR alphanumeric mode (version 5 or smaller, about 3 cm square in print).
- `share1` is 32 random bytes and `share2 = secret XOR share1`. Either share alone is uniformly random and reveals nothing about the key.
- Reprinting council cards draws a new `share1` and `pair`, so an old card no longer combines with a new one, and the app rejects mismatched `pair` values at once.
- The printed text beside the QR (never inside it) gives the DAO name, the member's pseudonym, their short code, the card label ("Card 1 of 2") and the print date.

Restoring: the app scans the card (council: both), rebuilds the secret, checks it is between 1 and n−1, derives the public key and shows its short code. It continues only if that key is on the current roster, or has a valid `dao.verify` for a candidate. It then registers a new passkey and publishes a `dao.keywrap` for it.

## 2. Kinds

All DAO events are **regular** events (kinds 1000–9999), so relays keep every one and the full history stays auditable. The numbers below are a provisional block (3570–3586) and must be checked against the Nostr kind registry before v1.

| Kind | Name | Signed by | Section |
| --- | --- | --- | --- |
| 3570 | `dao.genesis` | Founding council member | 3.1 |
| 3571 | `dao.endorse` | Council member | 3.2 |
| 3572 | `dao.roster` | Council member | 3.3 |
| 3573 | `dao.rules` | Council member | 3.4 |
| 3574 | `dao.proposal` | Member | 4.1 |
| 3575 | `dao.confirm` | Payout recipient | 4.2 |
| 3576 | `dao.vote` | Member | 4.3 |
| 3577 | `dao.tally` | Council member | 4.4 |
| 3578 | `dao.verify` | Council member | 5.1 |
| 3579 | `dao.rekey` | Council member | 5.2 |
| 3580 | `dao.leave` | Member | 5.3 |
| 3581 | `dao.round` | Council member | 6.1 |
| 3582 | `dao.sign` | Council member | 6.2 |
| 3583 | `dao.receipt` | Council member | 6.3 |
| 3584 | `dao.anchor` | Any member | 7.1 |
| 3585 | `dao.listing` | Council member | 7.2 |
| 3586 | `dao.keywrap` | Member | 5.4 |

Compared with the spec v0.1 event table, this adds `dao.rules` (rules versions get their own event, like rosters), `dao.confirm` (recipient address confirmation), `dao.tally` (requirement S3), the three onboarding events and `dao.keywrap` (passkey-protected identity keys).

## 3. Foundation: genesis, endorsements, rosters, rules

### 3.1 `dao.genesis`

```json
{
  "kind": 3570,
  "tags": [["D", "<dao_id>"], ["v", "1"]],
  "content": "<the genesis config, as in config/bosa-dao.signet.example.json>"
}
```

Valid when `sha256(JCS(content)) == dao_id` and it is endorsed (`dao.endorse`, object `genesis`) by at least `threshold` of the council identity keys listed in the config itself.

### 3.2 `dao.endorse`

```json
{
  "kind": 3571,
  "tags": [["D", "<dao_id>"], ["v", "1"], ["e", "<endorsed event id>"]],
  "content": "{\"object\":\"roster\",\"hash\":\"<sha256 of the endorsed content>\",\"version\":6}"
}
```

`object` is one of `genesis`, `roster`, `rules`, `rekey`, `listing`. Valid when the signer is on the council in effect when the endorsed object was published, and `hash` matches the endorsed event's content. An object takes effect once it has `threshold` valid endorsements from distinct council members; its effective time is the `created_at` of the endorsement that completed the threshold.

### 3.3 `dao.roster`

```json
{
  "version": 6,
  "prev": "<sha256 of roster version 5 content>",
  "basis": ["<id of the dao.proposal or dao.leave or dao.rekey that caused this version>"],
  "members": [
    {"key": "<hex pubkey>", "name": "@anna", "since": "2026-09-01", "verified": "in_person", "council": true},
    {"key": "<hex pubkey>", "name": "@nina", "since": "2026-10-20", "verified": "remote", "council": false}
  ]
}
```

Rosters form a chain: each `prev` is the hash of the previous version, and version numbers increase by one. Version 1 is implied by the genesis config's council plus founding members. A roster version is valid only if every change from the previous version is justified by an item in `basis`: a passed and tallied add or remove proposal, a valid `dao.leave`, or an endorsed `dao.rekey`. Clients reject a roster that adds or drops anyone without a basis.

### 3.4 `dao.rules`

```json
{
  "version": 2,
  "prev": "<sha256 of rules version 1 content>",
  "basis": ["<id of the passed change_rules proposal>"],
  "rules": { "votingPeriodDays": 7, "quorum": "1/3", "maxFeePerRoundSats": 5000, "...": "..." }
}
```

Version 1 is the `rules` object of the genesis config. Same chain and basis rules as rosters.

## 4. Governance

### 4.1 `dao.proposal`

```json
{
  "type": "payout",
  "title": "Stampa dei volantini per il meetup di dicembre",
  "summary": "500 volantini A5 per invitare commercianti e residenti al meetup del 14 dicembre.",
  "link": {"url": "https://example.org/volantini", "sha256": "<hash of the page at submission>"},
  "lang": "it",
  "payload": {
    "recipient": "Tipografia locale",
    "outputs": [{"address": "tb1q4f8kw3zr7c9mpdl0h5x2nt6yegsva8u3jq2xmp", "amount_sat": 120000}]
  }
}
```

Common fields: `type`, `title` (≤ 80 characters), `summary` (≤ 500 characters; the binding text), `link` (optional), `lang`. `payload` depends on `type`:

| `type` | `payload` |
| --- | --- |
| `payout` | `recipient` (display name), `outputs`: one or more `{address, amount_sat}` |
| `statement` | `{}` |
| `add_member` | `candidate_key`, `name`, `verify`: ids of the `dao.verify` events |
| `remove_member` | `member_key`, `reason` |
| `change_rules` | `changes`: list of `{path, from, to}` |
| `change_council` | `out_key`, `in_key`, `in_xpub`, `in_fingerprint`, `threshold`, `new_descriptor` |

The human-readable number (`BOSA-0007`) is not in the event. Clients derive it by sorting all valid proposals by `created_at`, then by `id`, and numbering from 1, so every client shows the same numbers without a coordinator.

Valid when:
- the signer is on the roster in effect at `created_at`;
- the content matches the schema for its type;
- for payouts, every address is valid for the DAO's network, is not a treasury address, and every amount is above the dust limit;
- for `add_member`, every listed `dao.verify` is valid: one in-person verification, or two remote verifications by distinct council members, with the same `candidate_key`.

### 4.2 `dao.confirm`

Tags: `["e", <proposal id>]`. Content: `{"address": "<address being confirmed>"}`, optionally with `"bip322": "<signature>"` when the recipient's wallet can sign a message with that address.

Valid when the address appears in the proposal's outputs. A payout whose recipient is not the proposer needs a valid `dao.confirm` for each output before it can enter a round. There is no deadline: confirming is the recipient's responsibility, and it may come before, during or after the vote. A passed payout that is still unconfirmed waits, and lapses under the usual rule if it is not made binding within the lapse limit (2 rounds for BOSA DAO). A BIP-322 signature proves control of the address; without it, the confirmation shows only that someone with the confirmation link agreed.

### 4.3 `dao.vote`

Tags: `["e", <proposal id>]`. Content: `{"choice": "yes" | "no" | "abstain"}`.

- **Eligible voters:** members on the roster in effect when the proposal was published, minus anyone whose `dao.leave` or removal took effect before the close.
- **Recipient exclusion:** for payouts to a member, that member's vote is not counted.
- **Changing a vote:** the latest vote per member counts, by `created_at`, then by `id`.
- **Close time:** proposal `created_at` + voting period, or earlier if the result can no longer change.

### 4.4 `dao.tally` (requirement S3)

```json
{
  "proposal": "<proposal id>",
  "closed_at": 1762300800,
  "roster_version": 5,
  "rules_version": 1,
  "counted": ["<vote event id>", "..."],
  "excluded": [{"id": "<vote event id>", "reason": "late"}],
  "result": {"yes": 9, "no": 2, "abstain": 1, "quorum_met": true, "passed": true}
}
```

Tags: `["e", <proposal id>]`. Signed by a council member after the close. Exclusion reasons: `late`, `not_eligible`, `superseded`, `recipient`.

Nostr timestamps are chosen by the signer, so a vote could be backdated after the close. The tally settles which votes count: once published and anchored, clients use it instead of recounting. A client that holds a vote dated before `closed_at` that the tally neither counts nor excludes shows a warning on the proposal. A second, conflicting tally makes the proposal **disputed** until `threshold` council members endorse one tally (`dao.endorse`, object `tally`).

Payouts, roster changes and rule changes act only on proposals with a valid, undisputed tally.

## 5. Membership

### 5.1 `dao.verify`

Tags: `["p", <candidate key>]`. Content: `{"candidate_key": "<hex>", "mode": "in_person" | "remote", "short_code": "7F3K29QD"}`.

Valid when the signer is on the council and `short_code` matches the one derived from `candidate_key` (section 1.6).

### 5.2 `dao.rekey`

Tags: `["p", <old key>]`, `["p", <new key>]`. Content: `{"old_key": "<hex>", "new_key": "<hex>", "mode": "in_person" | "remote", "short_code": "<of the new key>"}`.

Takes effect with `threshold` endorsements (object `rekey`); remote mode also needs a second council member's `dao.verify` of the new key. From the effective time, events signed with the old key are ignored; earlier ones stay valid.

### 5.3 `dao.leave`

Content: `{}`. Signed by the member leaving. Not valid for council members, who leave through a `change_council` proposal. From its `created_at`, the member's votes on still-open proposals are withdrawn; the next roster version drops them.

### 5.4 `dao.keywrap`

Tags: `["c", <sha256 of the passkey credential id, hex>]`. Content: `{"nonce": "<24-byte hex>", "ct": "<hex ciphertext>"}` as in section 1.5.

Signed by the identity key it protects, which shows the publisher held that key. Valid when the signer is on the roster or is a candidate with a valid `dao.verify`. The latest event per `c` tag counts. After a passkey sign-in, a client fetches it with the filter `{"kinds": [3586], "#D": [dao_id], "#c": [sha256(credential id)]}` and opens it with the PRF output. The ciphertext is public; its security rests on the 32-byte PRF output, which never leaves the passkey's device.

## 6. Treasury

### 6.1 `dao.round`

```json
{
  "round": "2026-12",
  "proposals": ["<proposal id>", "<proposal id>"],
  "psbt": "<base64 BIP-174 PSBT>",
  "fee_rate_sat_vb": 3,
  "fee_sat": 1100
}
```

Every client that shows the round rebuilds the expected outputs and refuses to offer signing unless all of these hold:
- the outputs are exactly the payout outputs of the listed proposals, with nothing added;
- each listed proposal is passed, tallied, confirmed where needed, not yet paid, and not lapsed;
- any other output is change to the treasury's change branch (`/1/*`) at an unused index;
- inputs are unspent treasury outputs;
- `fee_sat` matches the PSBT and is at most `maxFeePerRoundSats` from the rules (requirement S5);
- for a `change_council` migration round, the single output pays the full balance, minus fee, to the first receive address of `new_descriptor`.

PSBT requirements, so hardware signers can verify everything: PSBT version 0; each input carries its `witness_utxo`, `witness_script` and `bip32_derivation` for all five keys; the change output carries its `witness_script` and `bip32_derivation` for all five keys. PSBTs move to and from SeedSigner as animated QR codes in the UR `crypto-psbt` format.

### 6.2 `dao.sign`

Tags: `["e", <round id>]`. Content: `{"psbt": "<base64 PSBT with this member's partial signatures>"}` or `{"decline": "<reason>"}`.

Valid when the signer is a council member and every new partial signature in the PSBT verifies against that member's treasury key from the config. When a client holds `threshold` valid partial signatures for every input, it finalises the transaction and broadcasts it through the configured chain API. Any client may do this; broadcasting the same transaction twice is harmless.

### 6.3 `dao.receipt`

Tags: `["e", <round id>]`. Content: `{"txid": "<hex>", "block_height": 1234567}`. Valid when the chain API confirms that transaction at that height and that it spends the round's inputs to the round's outputs. The round's proposals then show as paid.

## 7. Record and discovery

### 7.1 `dao.anchor`

Tags: `["e", <tally id>]`. Content: `{"digest": "<sha256>", "covers": ["<event id>", "..."], "ots": "<base64 OpenTimestamps proof>"}`.

`digest = sha256(JCS(sorted list of the covered event ids))`, where `covers` is the proposal, its votes, its confirmations and its tally. The proof shows the record existed, unchanged, at a Bitcoin block. An incomplete proof can be replaced by an upgraded one in a later `dao.anchor` with the same digest.

### 7.2 `dao.listing`

Content: `{"name": "BOSA DAO", "site": "https://...", "relays": ["wss://..."], "descriptor": "<public descriptor>", "software": "btc-dao 0.1.0"}`. Takes effect with `threshold` endorsements. Dashboards list only endorsed listings.

The `site` of the latest endorsed listing is the DAO's address. Moving the DAO to a new domain is done by publishing a new listing and collecting `threshold` endorsements; no member needs re-verifying. The card-restore screen shows the endorsed address and its endorsements, and clients warn when they are opened at any other address. Members should never scan an identity card on an address the council has not endorsed.

## 8. Rebuilding state

A client rebuilds a DAO in this order, from events filtered by `#D` and from the chain:

1. Verify the genesis event and its endorsements; load council, descriptor, relays and rules version 1.
2. Follow the roster and rules chains, accepting each version only with a valid basis and enough endorsements.
3. Collect proposals, confirmations, votes and tallies; derive proposal numbers and statuses.
4. Apply verify, rekey and leave events to membership as of each moment that matters.
5. Collect rounds, signatures and receipts; check each against the chain.
6. Compute the treasury balance and history from the descriptor and the chain API, linking each payout to its round and proposals.

Events that fail validation are kept and shown in a "rejected" view with the reason, never silently dropped, so a disagreement between clients can be investigated.

## 9. Open points for phase 1

- Confirm the kind numbers and the `D` tag do not collide with existing NIPs.
- Test cases for every validity rule above (S4), including duplicate and out-of-order events and events from other DAOs.
- Confirm passkey PRF support on members' phones, including with a YubiKey over USB and NFC (section 1.5).
- Confirm phones can print an identity card straight from the browser without leaving a saved PDF (section 1.7).
- Confirm SeedSigner accepts the PSBT layout in section 6.1 and verifies change against the loaded descriptor (S7).
- Decide whether the OpenTimestamps step runs in the browser or needs a small helper.
