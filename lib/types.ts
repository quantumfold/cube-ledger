export type Role = "player" | "organizer" | "admin";

export type Player = {
  id: string;
  googleId?: string;
  displayName: string;
  email: string;
  profileImageUrl?: string;
  role: Role;
};

export type DraftParticipant = {
  id: string;
  draftEventId: string;
  playerId: string;
  displayNameSnapshot: string;
  seatOrder: number;
  deckArchetype: string;
  colors: string[];
  strategy: string;
  deckNotes: string;
  decklist?: string;
  deckImages?: DeckImage[];
  team?: "A" | "B";
};

export type DeckImage = {
  id: string;
  draftEventId: string;
  participantId: string;
  uploadedBy?: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  caption?: string;
  createdAt: string;
  signedUrl?: string;
};

export type Match = {
  id: string;
  draftEventId: string;
  roundLabel: string;
  tableNumber?: number;
  playerAId: string;
  playerBId: string;
  playerAWins: number;
  playerBWins: number;
  draws: number;
  notes?: string;
  sidebetCents: number;
  sidebetWinnerParticipantId?: string;
};

export type MoneyResult = {
  id: string;
  draftEventId: string;
  participantId: string;
  netCents: number;
  notes?: string;
};

export type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  changedAt: string;
  summary: string;
};

export type DraftEvent = {
  id: string;
  title: string;
  eventDate: string;
  format: "Individual" | "Team";
  draftType: string;
  winningTeam?: "A" | "B";
  defaultStakeCents: number;
  notes: string;
  createdBy: string;
  version: number;
  participants: DraftParticipant[];
  matches: Match[];
  moneyResults: MoneyResult[];
  auditLog: AuditLogEntry[];
};

export type PlayerStats = {
  playerId: string;
  displayName: string;
  profileImageUrl?: string;
  draftsPlayed: number;
  matchesPlayed: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  firstPlaces: number;
  teamDraftsPlayed: number;
  teamDraftWins: number;
  totalMoneyCents: number;
  winRate: number;
  gameWinRate: number;
  teamDraftWinRate: number;
  averageMoneyCents: number;
};

export type Standing = {
  participantId: string;
  playerId: string;
  displayName: string;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  points: number;
  moneyCents: number;
  deckArchetype: string;
  colors: string[];
};

export type HeadToHead = {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  moneyCents: number;
};

export type Achievement = {
  title: string;
  playerName: string;
  value: string;
  detail: string;
};
