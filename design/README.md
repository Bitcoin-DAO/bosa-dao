# Design

`mockups/` holds the clickable mock-up of BOSA DAO, in Italian, one file per screen. All names, amounts, dates and addresses are sample data; addresses are placeholder signet-format strings.

The files are Design Component pages (`.dc.html`) made on a design canvas; they need that canvas's runtime to render, so they are kept here as source. `canvas.json` gives each screen's position and size. PNG exports of each screen are still to be added.

| File | Screen |
| --- | --- |
| `Join.dc.html` | Join or sign in (passkey, code, consents) |
| `Main.dc.html` | Home and public treasury |
| `Proposals.dc.html` | Proposals list |
| `ProposalDetail.dc.html` | One proposal with history, plus the archive |
| `NewProposal.dc.html` | New proposal form, all six types |
| `Confirm.dc.html` | Recipient confirms their address |
| `Signing.dc.html` | Council signs a payout round with SeedSigner |
| `CouncilInbox.dc.html` | Council to-do list |
| `PrepareRound.dc.html` | Council prepares a payout round |
| `Members.dc.html` | Members, council fingerprints, roster history |
| `Rules.dc.html` | Rules in force |
| `RecoverySheet.dc.html` | Printable A4 recovery sheet |
| `SponsorMember.dc.html` | Sponsor proposes a new member, in person or remote |
| `Profile.dc.html` | Member profile and leaving the DAO |
| `ReplaceKey.dc.html` | Council replaces a member's lost key |
