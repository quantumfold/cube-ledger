import assert from "node:assert/strict";
import test from "node:test";
import { filterDashboardDrafts } from "../lib/dashboard.ts";
import { headToHeadForPlayer, playerStats, standingsForDraft } from "../lib/stats.ts";
import type { DraftEvent, Player } from "../lib/types.ts";

const players: Player[] = [
  { id: "p1", displayName: "Lucas", email: "lucas@example.com", role: "admin", loginEnabled: true, showOnLeaderboard: true },
  { id: "p2", displayName: "David", email: "david@example.com", role: "organizer", loginEnabled: true, showOnLeaderboard: true }
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
  sidebets: [],
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
    format: "Teams Before Draft",
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

test("team stats infer team drafts from winning team assignments", () => {
  const teamDraft: DraftEvent = {
    ...draft,
    id: "team-draft-inferred",
    format: "Unknown Team Label" as DraftEvent["format"],
    winningTeam: "A",
    participants: [
      { ...draft.participants[0], id: "tdip1", draftEventId: "team-draft-inferred", team: "A" },
      { ...draft.participants[1], id: "tdip2", draftEventId: "team-draft-inferred", team: "B" }
    ],
    matches: [],
    moneyResults: []
  };

  const stats = playerStats(players, [teamDraft]);
  const lucas = stats.find((row) => row.playerId === "p1");
  const david = stats.find((row) => row.playerId === "p2");
  assert.equal(lucas?.teamDraftsPlayed, 1);
  assert.equal(lucas?.teamDraftWins, 1);
  assert.equal(lucas?.totalMoneyCents, 5000);
  assert.equal(david?.teamDraftsPlayed, 1);
  assert.equal(david?.teamDraftWins, 0);
  assert.equal(david?.totalMoneyCents, -5000);
});

test("team draft win rate ignores drafts with no winner", () => {
  const tiedTeamDraft: DraftEvent = {
    ...draft,
    id: "team-draft-no-winner",
    format: "Teams After Draft",
    winningTeam: undefined,
    participants: [
      { ...draft.participants[0], id: "tdnw1", draftEventId: "team-draft-no-winner", team: "A" },
      { ...draft.participants[1], id: "tdnw2", draftEventId: "team-draft-no-winner", team: "B" }
    ],
    matches: [],
    moneyResults: []
  };

  const stats = playerStats(players, [tiedTeamDraft]);
  const lucas = stats.find((row) => row.playerId === "p1");
  const david = stats.find((row) => row.playerId === "p2");
  assert.equal(lucas?.draftsPlayed, 1);
  assert.equal(lucas?.teamDraftsPlayed, 0);
  assert.equal(lucas?.teamDraftWinRate, 0);
  assert.equal(david?.draftsPlayed, 1);
  assert.equal(david?.teamDraftsPlayed, 0);
  assert.equal(david?.teamDraftWinRate, 0);
});

test("head-to-head records derive match outcomes", () => {
  const rows = headToHeadForPlayer("p1", players, [draft]);
  assert.equal(rows[0].opponentId, "p2");
  assert.equal(rows[0].wins, 1);
  assert.equal(rows[0].losses, 0);
});

for (const format of ["Teams Before Draft", "Teams After Draft"] as const) {
  test(`${format} money follows team result and default stake only`, () => {
    const teamDraft: DraftEvent = {
      ...draft,
      id: `team-draft-${format}`,
      format,
      winningTeam: "B",
      participants: [
        { ...draft.participants[0], id: "tdp1", draftEventId: `team-draft-${format}`, team: "A" },
        { ...draft.participants[1], id: "tdp2", draftEventId: `team-draft-${format}`, team: "B" }
      ],
      matches: [
        {
          id: "tm1",
          draftEventId: `team-draft-${format}`,
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
    assert.equal(teamA?.moneyCents, -5000);
    assert.equal(teamB?.moneyCents, 5000);
  });
}

test("draft-level sidebets can include multiple bets for one player", () => {
  const sidebetDraft: DraftEvent = {
    ...draft,
    participants: [
      ...draft.participants,
      { id: "dp3", draftEventId: "d1", playerId: "p3", displayNameSnapshot: "Maksym", seatOrder: 3, deckArchetype: "", colors: [], strategy: "", deckNotes: "" }
    ],
    sidebets: [
      { id: "sb1", draftEventId: "d1", winnerParticipantId: "dp1", loserParticipantId: "dp2", amountCents: 6000 },
      { id: "sb2", draftEventId: "d1", winnerParticipantId: "dp1", loserParticipantId: "dp3", amountCents: 10000 }
    ]
  };

  const standings = standingsForDraft(sidebetDraft);
  const lucas = standings.find((row) => row.participantId === "dp1");
  const david = standings.find((row) => row.participantId === "dp2");
  const maksym = standings.find((row) => row.participantId === "dp3");
  assert.equal(lucas?.moneyCents, 22000);
  assert.equal(david?.moneyCents, -12000);
  assert.equal(maksym?.moneyCents, -10000);
});

test("dashboard team format filters include both team draft types", () => {
  const beforeDraft: DraftEvent = { ...draft, id: "before", format: "Teams Before Draft" };
  const afterDraft: DraftEvent = { ...draft, id: "after", format: "Teams After Draft" };
  const individualDraft: DraftEvent = { ...draft, id: "individual", format: "Individual" };

  assert.deepEqual(
    filterDashboardDrafts([beforeDraft, afterDraft, individualDraft], { format: "Teams After Draft" }).map((item) => item.id),
    ["before", "after"]
  );
  assert.deepEqual(
    filterDashboardDrafts([beforeDraft, afterDraft, individualDraft], { format: "Teams Before Draft" }).map((item) => item.id),
    ["before", "after"]
  );
  assert.deepEqual(
    filterDashboardDrafts([beforeDraft, afterDraft, individualDraft], { format: "Team" }).map((item) => item.id),
    ["before", "after"]
  );
});

test("dashboard excludes legacy drafts unless requested", () => {
  const legacyDraft: DraftEvent = { ...draft, id: "legacy", eventDate: "2024-01-01" };
  const modernDraft: DraftEvent = { ...draft, id: "modern", eventDate: "2026-01-01" };

  assert.deepEqual(
    filterDashboardDrafts([legacyDraft, modernDraft], {}).map((item) => item.id),
    ["modern"]
  );
  assert.deepEqual(
    filterDashboardDrafts([legacyDraft, modernDraft], { includeLegacy: "1" }).map((item) => item.id),
    ["legacy", "modern"]
  );
});
