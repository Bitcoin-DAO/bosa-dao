# Decisions and open questions

## Decided (design stage, November 2026)

| Topic | Decision |
| --- | --- |
| Chain | Bitcoin only; no tokens, no token-weighted voting, no function calls |
| Model | One DAO per codebase; each DAO forks this repo. A separate read-only dashboard lists DAOs that opt in |
| Treasury | P2WSH 3-of-5 sorted multisig; payouts are PSBTs; council signatures are the binding approval |
| Lightning | Not in v1. Later: payouts to Lightning by swap, then a capped Lightning "Purse" |
| Roles | Members vote; council members hold treasury keys. Voting and signing rights are separated by keys, not only by policy |
| Member identity | A random Nostr key, encrypted by the member's passkey (PRF) and kept in the browser and on the relays, so a synced passkey opens it on any device |
| Identity cards | Paper backup of the identity key as QR codes, printed straight from the browser, no passwords, no files. Ordinary members: one card, optional. Council: two cards, each holding one random half of the key, both needed, required before the key ceremony |
| Moving address | If the domain is lost, the council endorses a new address in a `dao.listing`; members scan their cards there and make a new passkey. Same identities, no re-verification. Members find the new address on btcdao.tech (a separate domain) or from the council; every card carries that fallback line. The DAO relay on the lost domain is replaced, and public relays bridge the gap |
| Signing (BOSA trial) | One shared SeedSigner plus a spare; each council member has their own verified SD card, a 12-word CompactSeedQR card (21x21) and a steel plate at home. No passphrase in the trial |
| Addresses | Shown as SeedSigner shows them: first 7 and last 7 characters highlighted, middle in full; compared in full |
| Proposals | Short binding summary plus optional link with a fingerprint; wallet address in its own validated field; recipient confirms the address, with no deadline: an unconfirmed passed payout waits and lapses after 2 rounds |
| Vote counting | A council member signs the final tally at close; the tally is anchored with OpenTimestamps |
| Onboarding | Sponsor plus council verification, in person or by video call (two council members for remote); consent to public record and age 18+ |
| Leaving and key loss | Members leave without a vote; lost keys are replaced after re-verification and 3 council endorsements |
| Recovery | Recovery sheet with the descriptor is essential: 3 seeds alone cannot recover a multisig |
| Repo | `btc-dao` under the Bitcoin-DAO organisation; BOSA DAO is the first instance. Licence added last |
| Protocol | Defined in `protocol.md`: Nostr events in a provisional kind block 3570–3585, all regular so history is kept; every event tagged with the DAO id |
| DAO id | SHA-256 of the canonical (RFC 8785) genesis config; never changes |
| Identity per DAO | The passkey-derived key is salted with the DAO id, so one passkey gives unlinkable identities in different DAOs |
| Domain | Chosen once and kept: passkeys are bound to the domain, so a move means every member replaces their key |
| Domains | `btcdao.tech` for the project (about, guides, fork kit, read-only dashboard); `bosadao.it` for BOSA DAO, with the trial at `signet.bosadao.it` and the relay at `relay.bosadao.it`. Passkeys are tied to `bosadao.it` so all its subdomains share them |
| Domain care | Several years paid with auto-renew; two council members can reach the registrar account. A lapsed domain locks members out of signing in |
| Proposal numbers | Not stored in events; every client derives them by sorting proposals by time, then id |

## Open questions

- [ ] Who are the five BOSA DAO council members, and who are the founding members?
- [ ] Is a quorum of one third right for a small founding group?
- [ ] Should member votes on payouts be public by name, or tallies only?
- [ ] Where is the DAO relay hosted, and by whom?
- [ ] Which free static host?
- [ ] Who registers bosadao.it? The DAO has no legal entity, so a .it registrant must be a person or organisation that qualifies; record who, and plan how it passes on
- [ ] Can OpenTimestamps calendars be reached from the browser, or is a small helper needed?
- [ ] Does SeedSigner's current firmware verify change against a loaded P2WSH multisig descriptor? Test before phase 2
- [ ] Is passkey PRF supported on the phones BOSA members use?
- [ ] Are kinds 3570–3585 and the `D` tag free in the Nostr registry?
- [ ] Legal check (Italy, UK): confirm keyless coordination software is not custody
- [ ] Founding charter text, and the "first wallet in 5 minutes" guide
