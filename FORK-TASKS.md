# Fork tasks

This repo counts as released only when every item below is done, the code is field-tested by BOSA DAO, and the licence has been added (last step).

## Code and protocol
- [ ] `docs/protocol.md`: every event format as exact JSON, with kind numbers and versioning
- [ ] Config schema, validated on load; no secrets in the config
- [ ] State rules written down, with test cases for edge cases (requirement S4)
- [ ] Code and config kept apart, so forks can merge upstream fixes cleanly
- [ ] Bundled, pinned dependencies; no third-party scripts at runtime (S2)
- [ ] Signed releases with published hashes; reproducible build (S2)

## Security gates
- [ ] S1 to S6 met and tested on signet (phase 1)
- [ ] S7: change verified against the loaded descriptor on SeedSigner (phase 2, hard gate)
- [ ] Independent code review before mainnet funds
- [ ] S8 and S9 in place for the BOSA DAO mainnet trial

## Field test
- [ ] BOSA DAO restores and spends its signet treasury in Sparrow without the website
- [ ] BOSA DAO completes three monthly mainnet rounds without developer help

## Fork kit
- [ ] Setup wizard produces the config and the recovery sheet
- [ ] Template repo and one-click deploy to free static hosting
- [ ] Dashboard listing via `dao.listing`
- [ ] A second group deploys its own DAO from the kit and runs one signet round

## Last
- [ ] Licence chosen and added
