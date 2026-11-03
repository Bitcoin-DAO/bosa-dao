# Protocol test cases (draft)

These cases define what a correct btc-dao client must do with each kind of event (requirement S4). Each case gives the starting state, the events or input, and the expected result, with the protocol section it tests. Phase 1 turns every row into an automated test with real signed fixtures; a client is ready for BOSA DAO only when all of them pass.

Cases marked **Gap** expose a rule `protocol.md` does not settle yet. They are collected, with a proposed fix, under [Findings](#findings).

## Conventions

- **Base state** unless a case says otherwise: BOSA DAO on signet; council A, B, C, D, E (threshold 3); founders F1, F2; rules version 1 (7-day vote, quorum 1/3, majority as in the config, monthly rounds, lapse after 2 rounds, fee cap 5,000 sats); roster version 1 = council + founders.
- `t0` is the time of the event under test; days are counted from it.
- "Rejected" means the event is kept, shown in the rejected view with the reason, and has no effect on state (section 8). "Ignored" means the client never treats it as part of this DAO.
- Every result must be the same whatever order the events arrive in, and whichever relays they come from.

## 1. All events

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| G-01 | The same event (same `id`) arrives from three relays | Counted once | 1.1 |
| G-02 | Event with a bad signature or an `id` that does not match its content | Rejected: invalid event | 1.1 |
| G-03 | Valid event whose `D` tag is another DAO's id | Ignored, not shown as rejected | 1.2 |
| G-04 | Event with no `D` tag, or two `D` tags | Ignored | 1.2 |
| G-05 | Event with `["v","2"]` | Not applied; the client says it needs an update | 1.2 |
| G-06 | `content` that is not valid JSON, or valid JSON missing a required field | Rejected: malformed | 1.1 |
| G-07 | All events delivered newest first, then in random order | Same state as when delivered oldest first | 8 |

## 2. Genesis and endorsements

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| F-01 | Genesis whose content hashes to its `D` tag, endorsed by A, B, C | DAO exists; roster v1 = A–E + F1, F2; rules v1 from config | 3.1, 3.5 |
| F-02 | Same genesis endorsed by A and B only | DAO not yet founded; founders' apps keep waiting | 3.1 |
| F-03 | Genesis content changed by one character after the DAO id was fixed | Rejected: hash does not match `D` | 1.3, 3.1 |
| F-04 | Endorsement of the genesis by a key not in its `council` | Does not count | 3.2 |
| F-05 | A endorses the genesis twice | Counts once | 3.2 |
| F-06 | Endorsement whose `hash` does not match the endorsed event's content | Rejected | 3.2 |
| F-07 | Genesis published by F1 (a founder not on the council) | **Gap 1**: proposed Rejected | 3.1 |
| F-08 | Founder's browser holds a key not listed in the endorsed genesis | No keywrap and no card offered; app says to contact the council | 3.5 |
| F-09 | Founder's browser sees the endorsed genesis | Publishes one `dao.keywrap`; card offered with the right `dao8` | 3.5 |

## 3. Rosters and rules

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| R-01 | Roster v2 adds member M, basis = passed and tallied add-member proposal, endorsed by 3 | Accepted; M is a member from the third endorsement | 3.3 |
| R-02 | Roster v2 adds M with no basis | Rejected | 3.3 |
| R-03 | Roster v2 adds M and also drops F2, basis covers only M | Rejected as a whole | 3.3 |
| R-04 | Roster v3 published while v2 does not exist | Rejected: version gap | 3.3 |
| R-05 | Roster v2 whose `prev` is not the hash of v1 | Rejected | 3.3 |
| R-06 | Roster v2 endorsed by only 2 council members | Not in effect | 3.2, 3.3 |
| R-07 | Two different roster v2 events, each with 3 endorsements (one council member endorsed both) | **Gap 2**: proposed both disputed until the council endorses a v3 that names one as `prev` | 3.3 |
| R-08 | Roster v2 drops F2, basis = F2's valid `dao.leave` | Accepted | 3.3, 5.3 |
| R-09 | Roster v2 replaces F1's key, basis = endorsed `dao.rekey` | Accepted; F1 keeps name, `since` and history | 3.3, 5.2 |
| R-10 | Roster changes council flags after a passed change-council proposal | **Gap 3**: the basis list does not include change-council proposals | 3.3 |
| R-11 | Rules v2, basis = passed and tallied change-rules proposal, endorsed by 3 | Accepted from the third endorsement; proposals published earlier keep the rules version they started under | 3.4 |
| R-12 | Rules v2 changes a value the proposal did not name | Rejected | 3.4 |

## 4. Proposals

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| P-01 | Valid payout proposal by member F1 | Accepted; numbered by `created_at`, then `id` | 4.1 |
| P-02 | Proposal by a key not on the roster | Rejected | 4.1 |
| P-03 | Proposal by F2, dated after F2's `dao.leave` | Rejected | 4.1, 5.3 |
| P-04 | Title of 81 characters, or summary of 501 | Rejected | 4.1 |
| P-05 | Payout to a mainnet address in the signet DAO | Rejected: wrong network | 4.1 |
| P-06 | Payout to one of the treasury's own addresses | Rejected | 4.1 |
| P-07 | Payout output below the dust limit | Rejected | 4.1 |
| P-08 | Two proposals with the same `created_at` | Numbered in order of `id` | 4.1 |
| P-09 | A proposal dated three days ago appears after proposal 7 was published | **Gap 4**: it would renumber every later proposal; proposed Rejected if dated before the most recent tallied proposal, otherwise accepted and flagged as backdated | 4.1 |
| P-10 | Add-member proposal with one in-person `dao.verify` | Accepted | 4.1, 5.1 |
| P-11 | Add-member proposal with two remote verifications, both by A | Rejected: two distinct council members needed | 4.1 |
| P-12 | Add-member proposal whose verification is for a different key | Rejected | 4.1 |
| P-13 | Payout to a member (recipient is F1) | F1's vote excluded with reason `recipient` (needs **Gap 5**: the payload has no recipient key) | 4.3 |

## 5. Recipient confirmations

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| C-01 | Confirmation of an address in the proposal's outputs | Accepted | 4.2 |
| C-02 | Confirmation of an address not in the outputs | Rejected | 4.2 |
| C-03 | Payout to a non-proposer passes with no confirmation | Not eligible for a round; status "waiting for confirmation" | 4.2 |
| C-04 | Confirmation arrives after the payout passed | Payout joins the next round | 4.2 |
| C-05 | Still unconfirmed when the lapse limit is reached | Status Lapsed (needs **Gap 6**: when the lapse count starts) | 4.2 |
| C-06 | Confirmation with a valid BIP-322 signature | Shown as "address proven" | 4.2 |
| C-07 | Confirmation with an invalid BIP-322 signature | Accepted as a plain confirmation, with a warning | 4.2 |

## 6. Votes

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| V-01 | Member votes yes, then no, both before the close | No counts; yes is `superseded` | 4.3 |
| V-02 | Two votes by one member with the same `created_at` | The one with the higher `id` counts | 4.3 |
| V-03 | Vote by member M admitted after the proposal was published | Not eligible | 4.3 |
| V-04 | F2 votes, then leaves before the close | F2's vote withdrawn | 4.3, 5.3 |
| V-05 | F2 leaves after the close | F2's vote counts | 4.3 |
| V-06 | Vote from a key not on any roster | Not eligible | 4.3 |
| V-07 | F1 votes, F1's key is replaced, then F1 votes again with the new key on the same proposal | **Gap 7**: the new key was not on the roster when the proposal was published; proposed: it counts and replaces the old vote | 4.3, 5.2 |
| V-08 | Vote dated after the close | Excluded: `late` | 4.3, 4.4 |
| V-09 | Quorum is exactly one third | **Gap 8**: "active member" is undefined; proposed quorum = ceiling of one third of eligible voters | 4.3 |
| V-10 | Early close: every eligible member has voted yes on day 2 | **Gap 9**: votes can still change, so the result is never final before the period ends; proposed: drop early close | 4.3 |

## 7. Tallies

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| T-01 | Tally by A matching an independent recount | Accepted; proposal Passed or Rejected | 4.4 |
| T-02 | Tally by F1 (not on the council) | Rejected | 4.4 |
| T-03 | Tally counting a vote from a non-eligible key | Rejected | 4.4 |
| T-04 | Tally whose `result` does not add up from `counted` | Rejected | 4.4 |
| T-05 | Tally whose `closed_at` differs from the computed close | Rejected | 4.4 |
| T-06 | Client holds a vote dated before the close that the tally neither counts nor excludes | Tally stands; proposal shows a warning | 4.4 |
| T-07 | Second, different tally by B | Proposal Disputed; no payout, roster or rules change acts on it | 4.4 |
| T-08 | Disputed proposal, then 3 council endorsements of B's tally | B's tally stands (needs **Gap 10**: `tally` is missing from the endorsement objects in 3.2) | 3.2, 4.4 |
| T-09 | A publishes the same tally twice | Counts once; not a dispute | 4.4 |

## 8. Verification, key replacement, leaving

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| M-01 | `dao.verify` by A with the correct short code | Accepted | 5.1 |
| M-02 | `dao.verify` whose short code does not match the key | Rejected | 1.6, 5.1 |
| M-03 | `dao.verify` by F1 | Rejected: not on the council | 5.1 |
| M-04 | In-person rekey of F1, 3 endorsements | In effect from the third; F1's old-key events after that are ignored, earlier ones stay | 5.2 |
| M-05 | Remote rekey with 3 endorsements but no second council verification | Not in effect | 5.2 |
| M-06 | F2 leaves | Accepted; dropped from the next roster without a vote | 5.3 |
| M-07 | A (council) signs `dao.leave` | Rejected | 5.3 |
| M-08 | F2 signs a second `dao.leave` | No further effect | 5.3 |

## 9. Passkey-protected keys

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| K-01 | Keywrap signed by F1 with a new credential tag | Accepted | 5.4 |
| K-02 | Keywrap signed by a key not on the roster and with no verification | Rejected | 5.4 |
| K-03 | Two keywraps for the same credential | The later one counts | 5.4 |
| K-04 | Passkey sign-in on a new phone; keywrap fetched and opened | Same identity key; nothing to type | 1.5 |
| K-05 | Keywrap opened with a different passkey's output | Decryption fails; app offers the card or key replacement | 1.5 |
| K-06 | Keywrap events of another DAO with the same credential | Not used; the salt differs per DAO | 1.5 |

## 10. Identity cards

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| I-01 | Card of member F1 scanned at the endorsed address | Short code shown; new passkey registered; keywrap published | 1.7 |
| I-02 | Card whose `dao8` belongs to another DAO | Refused: wrong DAO | 1.7 |
| I-03 | Card whose secret is 0, or not below n | Refused: unreadable card | 1.7 |
| I-04 | Old card of F1 after F1's key was replaced | Refused: key no longer on the roster | 1.7, 5.2 |
| I-05 | Card of a candidate with a valid `dao.verify`, before admission | Accepted | 1.7 |
| I-06 | Card scanned on an address with no endorsed listing | Warning shown before scanning | 7.2 |
| I-07 | Payload in lower case, or with extra spaces | **Gap 11**: proposed accept any case and trim; the printed format stays upper case | 1.7 |

## 11. Payout rounds

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| P-R01 | Round paying exactly two passed, tallied, confirmed payouts, change to `/1/*` at an unused index, fee under the cap | Sign offered | 6.1 |
| P-R02 | One output 1 sat less than the proposal | Sign refused | 6.1 |
| P-R03 | An extra output not in any listed proposal | Sign refused | 6.1 |
| P-R04 | Change sent to a receive address (`/0/*`) or a used index | Sign refused | 6.1 |
| P-R05 | Change to an address outside the treasury | Sign refused | 6.1 |
| P-R06 | Fee of 5,001 sats | Sign refused (S5) | 6.1 |
| P-R07 | `fee_sat` differs from the PSBT's real fee | Sign refused | 6.1 |
| P-R08 | Round includes a rejected, disputed, lapsed, unconfirmed or already-paid proposal | Sign refused | 6.1 |
| P-R09 | An input that is not a treasury output, or already spent | Sign refused | 6.1 |
| P-R10 | An input missing `bip32_derivation` for one of the five keys | Sign refused | 6.1 |
| P-R11 | Round with no proposals | Rejected | 6.1 |
| P-R12 | Two open rounds both include the same proposal, with different inputs | **Gap 12**: both could confirm and pay twice; proposed one open round at a time | 6.1 |
| P-R13 | Change-council migration round sending everything to the new descriptor | Sign offered (needs **Gap 3** settled for where the new descriptor lives) | 6.1 |

## 12. Signatures and receipts

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| S-01 | `dao.sign` by A with a valid partial signature from A's treasury key | Accepted | 6.2 |
| S-02 | `dao.sign` by A carrying B's partial signature | Rejected | 6.2 |
| S-03 | `dao.sign` by F1 | Rejected | 6.2 |
| S-04 | Third valid signature arrives | Any client finalises and broadcasts; a second broadcast is harmless | 6.2 |
| S-05 | `dao.sign` with a decline and a reason | Shown on the round; counts toward nothing | 6.2 |
| S-06 | Receipt whose transaction matches the round | Proposals Paid | 6.3 |
| S-07 | Receipt naming a transaction that pays different outputs | Rejected | 6.3 |
| S-08 | Receipt with the wrong block height | Rejected | 6.3 |

## 13. Anchors and listings

| ID | Case | Expected | § |
| --- | --- | --- | --- |
| A-01 | Anchor whose digest matches the sorted covered ids and whose proof verifies | Shown as anchored at that block | 7.1 |
| A-02 | Anchor whose `covers` leaves out a counted vote | Rejected | 7.1 |
| A-03 | Pending proof replaced by an upgraded one with the same digest | Upgraded proof used | 7.1 |
| L-01 | New listing with a new `site`, 3 endorsements | New address in effect; dashboard and restore screen show it | 7.2 |
| L-02 | New listing with 2 endorsements | Old address stays | 7.2 |
| L-03 | Client opened at an address that is not the endorsed `site` | Warning shown | 7.2 |

## Test vectors

Keys 1, 2 and 3 are well-known test keys: never use them for anything real.

| Secret (hex) | Public key (x-only hex) | Short code |
| --- | --- | --- |
| `…0001` | `79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798` | `2CQK · KACC` |
| `…0002` | `c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5` | `04TX · MBWA` |
| `…0003` | `f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9` | `FHWZ · 61RY` |

Identity card payload for secret 3 in a DAO whose id starts `a41c9e07`:

```
BTCDAO:1:A41C9E07:0000000000000000000000000000000000000000000000000000000000000003
```

82 characters, all in the QR alphanumeric set.

Phase 1 adds full signed fixtures for every case above: a genesis, rosters, proposals, votes, tallies and a signet PSBT round, each as raw Nostr events.

## Findings

Writing the cases turned up twelve rules the protocol does not settle yet. Each needs a decision before phase 1 code.

| Gap | Problem | Proposed fix |
| --- | --- | --- |
| 1 | Anyone could publish a genesis | Only a key in the genesis `council` may publish it |
| 2 | Two different versions of the roster or rules can each reach 3 endorsements if one council member endorses both | Both are disputed until the council endorses a next version that names one as `prev`; endorsing two conflicting versions is flagged |
| 3 | After a council change, nothing records the new council keys and descriptor, and the roster basis list does not include change-council proposals | Add the council and descriptor to the endorsed versioned record (the rules chain, renamed "settings"), and add change-council to the roster basis list |
| 4 | Proposal numbers follow `created_at`, which the proposer chooses, so a backdated proposal renumbers later ones | Each tally records its proposal's number, which then never changes; a proposal dated before the most recent tallied proposal is rejected. Numbers can then shift only among proposals still open, and only through an obvious backdating that the app flags |
| 5 | The payout payload has no recipient key, so "payout to a member" cannot be detected | Add an optional `recipient_key` to payouts; set automatically when the recipient is a member |
| 6 | "Lapse after 2 rounds" has no starting point | Count round dates (the 1st of each month) after the tally |
| 7 | A member whose key was replaced mid-vote cannot vote with the new key | Eligibility follows the person through key replacements: the new key inherits the old key's eligibility and its latest vote |
| 8 | "Active member" in the quorum is undefined | Quorum = one third of eligible voters, rounded up; drop "active" until there is a rule for it |
| 9 | Early close conflicts with changing votes | Drop early close: every vote runs its full period |
| 10 | Tally endorsements are used in 4.4 but `tally` is not an endorsement object in 3.2 | Add `tally` to the objects in 3.2 |
| 11 | Card payload case and spacing are not specified for scanning | Scanners accept any case and trim spaces; printing stays upper case |
| 12 | Two open rounds can include the same proposal and both confirm | Only one open round at a time: a new round is valid only after the previous one has a receipt or the council marks it abandoned, and a replacement round spends at least one of the same inputs so both can never confirm |
