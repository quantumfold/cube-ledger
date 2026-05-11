import assert from "node:assert/strict";
import test from "node:test";
import { headToHeadForPlayer, playerStats, standingsForDraft } from "../lib/stats.ts";
import type { DraftEvent, Player } from "../lib/types.ts";

const players: Player[] = [
  { id: "p1", displayName: "Lucas", email: "lucas@example.com", role: "admin" },
  { id: "p2", displayName: "David", email: "david@example.com", role: "organizer" }
];

const draft: DraftEvent = {
  id: "d1",
  title: "Test Draft",
  eventDate: "2026-05-01",
  format: "Individual",
  draftType: "Vintage",
  defaultStakeCents: 5000,
  notes: "",
  createdBy: "p1",
  version: 1,
  participants: [
    { id: "dp1", draftEventId: "d1", playerId: "p1", displayNameSnapshot: "Lucas", seatOrder: 1, deckArchetype: "Control", colors: ["U"], strategy: "", deckNotes: "" },
    { id: "dp2", draftEventId: "d1", playerId: "p2", displayNameSnapshot: "David", seatOrder: 2, deckArchetype: "Aggro", colors: ["R"], strategy: "", deckNotes: "" }
  ],
  matches: [
    {
      id: "m1",
      draftEventId: "d1",
      roundLabel: "Round 1",
      playerAId: "dp1",
      playerBId: "dp2",
      playerAWins: 2,
      playerBWins: 1,
      draws: 0,
      sidebetCents: 1000,
      sidebetWinnerParticipantId: undefined
    }
  ],
  moneyResults: [
    { id: "mr1", draftEventId: "d1", participantId: "dp1", netCents: 0 },
    { id: "mr2", draftEventId: "d1", participantId: "dp2", netCents: 0 }
  ],
  auditLog: []
};

test("standings roll up match records, games, and sidebets", () => {
  const standings = standingsForDraft(draft);
  assert.equal(standings[0].playerId, "p1");
  assert.equal(standings[0].matchWins, 1);
  assert.equal(standings[0].gamesWon, 2);
  assert.equal(standings[0].moneyCents, 6000);
  assert.equal(standings[1].moneyCents, -6000);
});

test("player stats derive totals from draft data", () => {
  const stats = playerStats(players, [draft]);
  const lucas = stats.find((row) => row.playerId === "p1");
  assert.equal(lucas?.draftsPlayed, 1);
  assert.equal(lucas?.matchesPlayed, 1);
  assert.equal(lucas?.winRate, 1);
  assert.equal(lucas?.totalMoneyCents, 6000);
});

test("team draft wins credit players on the winning team", () => {
  const teamDraft: DraftEvent = {
    ...draft,
    id: "team-draft-win",
    format: "Team",
    winningTeam: "B",
    participants: [
      { ...draft.participants[0], id: "tdwp1", draftEventId: "team-draft-win", team: "A" },
      { ...draft.participants[1], id: "tdwp2", draftEventId: "team-draft-win", team: "B" }
    ],
    matches: [
      {
        id: "tmw1",
        draftEventId: "team-draft-win",
        roundLabel: "Round 1",
        playerAId: "tdwp1",
        playerBId: "tdwp2",
        playerAWins: 2,
        playerBWins: 0,
        draws: 0,
        sidebetCents: 0
      }
    ],
    moneyResults: []
  };
  const stats = playerStats(players, [teamDraft]);
  const lucas = stats.find((row) => row.playerId === "p1");
  const david = stats.find((row) => row.playerId === "p2");
  assert.equal(lucas?.firstPlaces, 0);
  assert.equal(lucas?.teamDraftsPlayed, 1);
  assert.equal(lucas?.teamDraftWins, 0);
  assert.equal(lucas?.teamDraftWinRate, 0);
  assert.equal(david?.firstPlaces, 1);
  assert.equal(david?.teamDraftsPlayed, 1);
  assert.equal(david?.teamDraftWins, 1);
  assert.equal(david?.teamDraftWinRate, 1);
});

test("head-to-head records derive match outcomes", () => {
  const rows = headToHeadForPlayer("p1", players, [draft]);
  assert.equal(rows[0].opponentId, "p2");
  assert.equal(rows[0].wins, 1);
  assert.equal(rows[0].losses, 0);
});

test("team draft money follows team result and team sidebets, not match record", () => {
  const teamDraft: DraftEvent = {
    ...draft,
    id: "team-draft",
    format: "Team",
    winningTeam: "B",
    participants: [
      { ...draft.participants[0], id: "tdp1", draftEventId: "team-draft", team: "A" },
      { ...draft.participants[1], id: "tdp2", draftEventId: "team-draft", team: "B" }
    ],
    matches: [
      {
        id: "tm1",
        draftEventId: "team-draft",
        roundLabel: "Round 1",
        playerAId: "tdp1",
        playerBId: "tdp2",
        playerAWins: 2,
        playerBWins: 0,
        draws: 0,
        sidebetCents: 1000
      }
    ],
    moneyResults: []
  };

  const standings = standingsForDraft(teamDraft);
  const teamA = standings.find((row) => row.participantId === "tdp1");
  const teamB = standings.find((row) => row.participantId === "tdp2");
  assert.equal(teamA?.moneyCents, -6000);
  assert.equal(teamB?.moneyCents, 6000);
});
