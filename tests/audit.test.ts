import assert from "node:assert/strict";
import test from "node:test";

import { summarizeAuditEntry } from "../lib/audit.ts";

test("audit summary names concrete participant and match edits", () => {
  const before = {
    title: "Friday Draft",
    eventDate: "2026-05-01",
    format: "Individual",
    draftType: "Vintage",
    winningTeam: null,
    defaultStakeCents: 5000,
    notes: "",
    participants: [
      { id: "p1", displayNameSnapshot: "Lucas Siow", team: null, deckArchetype: "Storm", colors: ["U", "R"], strategy: "", deckNotes: "", decklist: "" },
      { id: "p2", displayNameSnapshot: "David Ledvinka", team: null, deckArchetype: "Reanimator", colors: ["B"], strategy: "", deckNotes: "", decklist: "" }
    ],
    matches: [
      { id: "m1", playerAId: "p1", playerBId: "p2", playerAWins: 2, playerBWins: 1, draws: 0, sidebetCents: 0, notes: "" }
    ]
  };
  const after = {
    ...before,
    defaultStakeCents: 10000,
    participants: [
      { id: "p1", team: "A", deckArchetype: "Storm", colors: ["U", "R"], strategy: "", deckNotes: "", decklist: "", moneyCents: 0 },
      { id: "p2", team: "B", deckArchetype: "Reanimator", colors: ["B", "R"], strategy: "", deckNotes: "Mulligan better", decklist: "", moneyCents: 0 }
    ],
    matches: [
      { id: "m1", playerAWins: 1, playerBWins: 2, draws: 0, sidebetCents: 2500, notes: "Corrected score" }
    ],
    removedMatchIds: [],
    newMatches: []
  };

  assert.equal(
    summarizeAuditEntry("updated", before, after),
    "Updated stake $50 -> $100; Lucas Siow team blank -> A; David Ledvinka team blank -> B; David Ledvinka colors B -> BR; David Ledvinka deck notes added; Lucas Siow vs David Ledvinka score 2-1-0 -> 1-2-0; Lucas Siow vs David Ledvinka sidebet $0 -> +$25; Lucas Siow vs David Ledvinka notes added."
  );
});

test("audit summary names added and removed matches", () => {
  const before = {
    participants: [
      { id: "p1", displayNameSnapshot: "Lucas Siow" },
      { id: "p2", displayNameSnapshot: "David Ledvinka" }
    ],
    matches: [
      { id: "m1", playerAId: "p1", playerBId: "p2", playerAWins: 2, playerBWins: 0, draws: 0, sidebetCents: 0, notes: "" }
    ]
  };
  const after = {
    participants: before.participants,
    matches: [],
    removedMatchIds: ["m1"],
    newMatches: [
      { playerAId: "p2", playerBId: "p1", playerAWins: 2, playerBWins: 1, draws: 0, sidebetCents: 0, notes: "" }
    ]
  };

  assert.equal(
    summarizeAuditEntry("updated", before, after),
    "Updated removed Lucas Siow vs David Ledvinka; added David Ledvinka vs Lucas Siow 2-1-0."
  );
});
