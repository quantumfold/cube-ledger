import { DraftEvent, Player } from "./types";

export const players: Player[] = [
  { id: "p1", googleId: "google-lucas-siow", displayName: "Lucas Siow", email: "lucas.siow@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=47", role: "admin" },
  { id: "p2", googleId: "google-david-ledvinka", displayName: "David Ledvinka", email: "dledvinkamath@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=12", role: "organizer" },
  { id: "p3", googleId: "google-daniel-founier", displayName: "Daniel Founier", email: "tirentu@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=33", role: "organizer" },
  { id: "p4", googleId: "google-jamie-naylor", displayName: "Jamie Naylor", email: "jmbnaylor@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=5", role: "organizer" },
  { id: "p5", googleId: "google-tyler-longo", displayName: "Tyler Longo", email: "tylerlongo77@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=60", role: "organizer" },
  { id: "p6", googleId: "google-maksym-gryn", displayName: "Maksym Gryn", email: "maksg7@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=9", role: "organizer" },
  { id: "p7", googleId: "google-morgan-mclaughlin", displayName: "Morgan McLaughlin", email: "fozefy@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=20", role: "organizer" },
  { id: "p8", googleId: "google-andrew-naylor", displayName: "Andrew Naylor", email: "andrew.s.naylor@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=52", role: "organizer" },
  { id: "p9", googleId: "google-brian-liu", displayName: "Brian Liu", email: "liuwk.brian@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=64", role: "organizer" },
  { id: "p10", googleId: "google-fadi-hirmiz", displayName: "Fadi Hirmiz", email: "zimrih.idaf@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=15", role: "organizer" },
  { id: "p11", googleId: "google-paul-dean", displayName: "Paul Dean", email: "pdean2012@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=58", role: "organizer" },
  { id: "p12", googleId: "google-chris-harabas", displayName: "Chris Harabas", email: "13arabas@gmail.com", profileImageUrl: "https://i.pravatar.cc/80?img=3", role: "organizer" }
];

export const drafts: DraftEvent[] = [
  {
    id: "d1",
    title: "Spring Powered Cube",
    eventDate: "2026-04-26",
    format: "Individual",
    draftType: "Vintage",
    defaultStakeCents: 5000,
    notes: "Fast night with several aggro mirrors and one Storm table kill.",
    createdBy: "p1",
    version: 4,
    participants: [
      { id: "d1p1", draftEventId: "d1", playerId: "p1", displayNameSnapshot: "Lucas Siow", seatOrder: 1, deckArchetype: "Azorius Control", colors: ["W", "U"], strategy: "Control", deckNotes: "Torrential Gearhulk stabilized two matches." },
      { id: "d1p2", draftEventId: "d1", playerId: "p2", displayNameSnapshot: "David Ledvinka", seatOrder: 2, deckArchetype: "Mono-Red Aggro", colors: ["R"], strategy: "Aggro", deckNotes: "Low curve with Sulfuric Vortex." },
      { id: "d1p3", draftEventId: "d1", playerId: "p3", displayNameSnapshot: "Daniel Founier", seatOrder: 3, deckArchetype: "Reanimator", colors: ["B", "U"], strategy: "Combo", deckNotes: "Entomb plus Reanimate overperformed." },
      { id: "d1p4", draftEventId: "d1", playerId: "p4", displayNameSnapshot: "Jamie Naylor", seatOrder: 4, deckArchetype: "Ramp", colors: ["G"], strategy: "Ramp", deckNotes: "Missed fixing for splash removal." }
    ],
    matches: [
      { id: "m1", draftEventId: "d1", roundLabel: "Round 1", tableNumber: 1, playerAId: "d1p1", playerBId: "d1p2", playerAWins: 2, playerBWins: 1, draws: 0, notes: "Game 3 stabilized at 2 life.", sidebetCents: 1000, sidebetWinnerParticipantId: "d1p1" },
      { id: "m2", draftEventId: "d1", roundLabel: "Round 1", tableNumber: 2, playerAId: "d1p3", playerBId: "d1p4", playerAWins: 2, playerBWins: 0, draws: 0, sidebetCents: 0 },
      { id: "m3", draftEventId: "d1", roundLabel: "Round 2", tableNumber: 1, playerAId: "d1p1", playerBId: "d1p3", playerAWins: 1, playerBWins: 2, draws: 0, sidebetCents: 0 },
      { id: "m4", draftEventId: "d1", roundLabel: "Round 2", tableNumber: 2, playerAId: "d1p2", playerBId: "d1p4", playerAWins: 2, playerBWins: 0, draws: 0, sidebetCents: 500, sidebetWinnerParticipantId: "d1p2" },
      { id: "m5", draftEventId: "d1", roundLabel: "Round 3", tableNumber: 1, playerAId: "d1p3", playerBId: "d1p2", playerAWins: 2, playerBWins: 1, draws: 0, sidebetCents: 0 },
      { id: "m6", draftEventId: "d1", roundLabel: "Round 3", tableNumber: 2, playerAId: "d1p1", playerBId: "d1p4", playerAWins: 2, playerBWins: 0, draws: 0, sidebetCents: 0 }
    ],
    moneyResults: [
      { id: "mr1", draftEventId: "d1", participantId: "d1p1", netCents: 5000 },
      { id: "mr2", draftEventId: "d1", participantId: "d1p2", netCents: -5000 },
      { id: "mr3", draftEventId: "d1", participantId: "d1p3", netCents: 10000 },
      { id: "mr4", draftEventId: "d1", participantId: "d1p4", netCents: -10000 }
    ],
    auditLog: [
      { id: "a1", entityType: "DraftEvent", entityId: "d1", action: "created", changedBy: "p1", changedAt: "2026-04-26T23:10:00Z", summary: "Created draft with four participants." },
      { id: "a2", entityType: "Match", entityId: "m5", action: "updated", changedBy: "p2", changedAt: "2026-04-27T00:02:00Z", summary: "Corrected Round 3 result to 2-1." }
    ]
  },
  {
    id: "d2",
    title: "Team Draft After Dark",
    eventDate: "2026-04-12",
    format: "Teams After Draft",
    draftType: "Andrew Cube",
    winningTeam: "A",
    defaultStakeCents: 5000,
    notes: "Teams settled money manually after the final round.",
    createdBy: "p2",
    version: 2,
    participants: [
      { id: "d2p1", draftEventId: "d2", playerId: "p1", displayNameSnapshot: "Lucas Siow", seatOrder: 1, deckArchetype: "Esper Midrange", colors: ["W", "U", "B"], strategy: "Midrange", deckNotes: "Planeswalkers were excellent.", team: "A" },
      { id: "d2p2", draftEventId: "d2", playerId: "p2", displayNameSnapshot: "David Ledvinka", seatOrder: 2, deckArchetype: "Gruul Monsters", colors: ["R", "G"], strategy: "Midrange", deckNotes: "Top end was clunky.", team: "B" },
      { id: "d2p3", draftEventId: "d2", playerId: "p5", displayNameSnapshot: "Tyler Longo", seatOrder: 3, deckArchetype: "Storm", colors: ["U", "R"], strategy: "Combo", deckNotes: "Killed from seven storm twice.", team: "A" },
      { id: "d2p4", draftEventId: "d2", playerId: "p6", displayNameSnapshot: "Maksym Gryn", seatOrder: 4, deckArchetype: "Orzhov Tokens", colors: ["W", "B"], strategy: "Go Wide", deckNotes: "Skullclamp carried.", team: "B" }
    ],
    matches: [
      { id: "m7", draftEventId: "d2", roundLabel: "Round 1", playerAId: "d2p1", playerBId: "d2p2", playerAWins: 2, playerBWins: 0, draws: 0, sidebetCents: 0 },
      { id: "m8", draftEventId: "d2", roundLabel: "Round 1", playerAId: "d2p3", playerBId: "d2p4", playerAWins: 1, playerBWins: 1, draws: 1, sidebetCents: 0 },
      { id: "m9", draftEventId: "d2", roundLabel: "Round 2", playerAId: "d2p1", playerBId: "d2p3", playerAWins: 0, playerBWins: 2, draws: 0, sidebetCents: 0 },
      { id: "m10", draftEventId: "d2", roundLabel: "Round 2", playerAId: "d2p2", playerBId: "d2p4", playerAWins: 1, playerBWins: 2, draws: 0, sidebetCents: 1500, sidebetWinnerParticipantId: "d2p4" }
    ],
    moneyResults: [
      { id: "mr5", draftEventId: "d2", participantId: "d2p1", netCents: 0 },
      { id: "mr6", draftEventId: "d2", participantId: "d2p2", netCents: -5000 },
      { id: "mr7", draftEventId: "d2", participantId: "d2p3", netCents: 10000 },
      { id: "mr8", draftEventId: "d2", participantId: "d2p4", netCents: -5000 }
    ],
    auditLog: [{ id: "a3", entityType: "MoneyResult", entityId: "mr7", action: "updated", changedBy: "p2", changedAt: "2026-04-12T22:45:00Z", summary: "Entered final team draft payout." }]
  }
];
