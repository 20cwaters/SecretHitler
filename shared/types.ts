// ─── Roles & Teams ───────────────────────────────────────────────

export type Team = 'liberal' | 'fascist';
export type Role = 'liberal' | 'fascist' | 'hitler';
export type PolicyType = 'liberal' | 'fascist';

// ─── Player ──────────────────────────────────────────────────────

export interface Player {
  id: string; // socket ID
  name: string;
  role?: Role;
  team?: Team;
  isAlive: boolean;
  isHost: boolean;
  connected: boolean;
  hasBeenInvestigated: boolean;
}

// ─── Game Phases ─────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'
  | 'night' // role reveal / night phase
  | 'nomination' // president picks chancellor
  | 'election' // all players vote
  | 'election_results' // brief pause showing votes
  | 'legislative_president' // president discards 1 of 3
  | 'legislative_chancellor' // chancellor discards 1 of 2
  | 'veto_requested' // chancellor proposes veto
  | 'policy_enacted' // brief pause showing enacted policy
  | 'executive_action' // president uses power
  | 'investigate' // president sees a player's party
  | 'special_election' // president picks next president
  | 'policy_peek' // president sees top 3
  | 'execution' // president kills a player
  | 'game_over';

// ─── Executive Powers ────────────────────────────────────────────

export type ExecutivePower =
  | null
  | 'investigate'
  | 'special_election'
  | 'policy_peek'
  | 'execution';

// ─── Vote ────────────────────────────────────────────────────────

export interface Vote {
  playerId: string;
  vote: 'ja' | 'nein';
}

// ─── Chat ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

// ─── Win Condition ───────────────────────────────────────────────

export type WinCondition =
  | 'liberal_policies' // 5 liberal policies enacted
  | 'hitler_executed' // hitler was killed
  | 'fascist_policies' // 6 fascist policies enacted
  | 'hitler_chancellor'; // hitler elected chancellor after 3+ fascist

// ─── Game State ──────────────────────────────────────────────────

export interface GameState {
  lobbyCode: string;
  phase: GamePhase;
  players: Player[];

  // Policy tracks
  liberalPoliciesEnacted: number;
  fascistPoliciesEnacted: number;

  // Deck
  drawPile: PolicyType[];
  discardPile: PolicyType[];

  // Election
  electionTracker: number;
  presidentIndex: number; // index in players array
  chancellorCandidateId: string | null;
  lastElectedPresidentId: string | null;
  lastElectedChancellorId: string | null;
  specialElectionPresidentIndex: number | null; // to resume rotation after

  // Votes
  votes: Vote[];
  votingComplete: boolean;

  // Legislative
  presidentialPolicies: PolicyType[]; // 3 drawn by president
  chancellorPolicies: PolicyType[]; // 2 passed to chancellor
  vetoRequested: boolean;

  // Executive action
  pendingExecutiveAction: ExecutivePower;
  investigationResult: Team | null;
  policyPeekCards: PolicyType[];

  // Last enacted policy (for display)
  lastEnactedPolicy: PolicyType | null;

  // Night phase readiness
  nightReadyPlayers: string[];

  // Game end
  winner: Team | null;
  winCondition: WinCondition | null;

  // Chat
  chatMessages: ChatMessage[];

  // Metadata
  createdAt: number;
  gameStartedAt: number | null;
}

// ─── Role Distribution Table ─────────────────────────────────────

export const ROLE_DISTRIBUTION: Record<number, { liberals: number; fascists: number }> = {
  5:  { liberals: 3, fascists: 1 },  // +Hitler
  6:  { liberals: 4, fascists: 1 },
  7:  { liberals: 4, fascists: 2 },
  8:  { liberals: 5, fascists: 2 },
  9:  { liberals: 5, fascists: 3 },
  10: { liberals: 6, fascists: 3 },
};

// ─── Fascist Track Powers by Player Count ────────────────────────
// Index = fascist policy slot (0-based), value = power granted

export function getFascistTrackPowers(playerCount: number): ExecutivePower[] {
  if (playerCount <= 6) {
    // 5-6 players
    return [null, null, 'policy_peek', 'execution', 'execution'];
  } else if (playerCount <= 8) {
    // 7-8 players
    return ['investigate', 'investigate', 'special_election', 'execution', 'execution'];
  } else {
    // 9-10 players
    return ['investigate', 'investigate', 'special_election', 'execution', 'execution'];
  }
}

// ─── Client → Server Events ─────────────────────────────────────

export interface ClientEvents {
  create_lobby: (data: { playerName: string }) => void;
  join_lobby: (data: { lobbyCode: string; playerName: string }) => void;
  start_game: () => void;
  night_ready: () => void;
  nominate_chancellor: (data: { playerId: string }) => void;
  cast_vote: (data: { vote: 'ja' | 'nein' }) => void;
  president_discard: (data: { policyIndex: number }) => void;
  chancellor_discard: (data: { policyIndex: number }) => void;
  request_veto: () => void;
  respond_veto: (data: { accept: boolean }) => void;
  investigate_player: (data: { playerId: string }) => void;
  acknowledge_investigation: () => void;
  special_election_pick: (data: { playerId: string }) => void;
  acknowledge_peek: () => void;
  execute_player: (data: { playerId: string }) => void;
  send_chat: (data: { text: string }) => void;
  kick_player: (data: { playerId: string }) => void;
  end_game: () => void;
  return_to_lobby: () => void;
  force_advance: () => void;
  reconnect_lobby: (data: { lobbyCode: string; playerName: string }) => void;
}

// ─── Server → Client Events ─────────────────────────────────────

export interface PlayerView {
  // Filtered game state — only what this player should see
  lobbyCode: string;
  phase: GamePhase;
  players: Array<{
    id: string;
    name: string;
    isAlive: boolean;
    isHost: boolean;
    connected: boolean;
    // Role/team only included for self or during game_over or night reveals
    role?: Role;
    team?: Team;
    hasBeenInvestigated: boolean;
  }>;

  liberalPoliciesEnacted: number;
  fascistPoliciesEnacted: number;

  drawPileCount: number;
  discardPileCount: number;

  electionTracker: number;
  presidentId: string | null;
  chancellorCandidateId: string | null;
  lastElectedPresidentId: string | null;
  lastElectedChancellorId: string | null;

  // Votes — only shown after voting complete
  votes: Vote[] | null;
  votingComplete: boolean;
  hasVoted: boolean; // whether THIS player has voted

  // Legislative — only shown to relevant player
  presidentialPolicies: PolicyType[] | null;
  chancellorPolicies: PolicyType[] | null;
  vetoRequested: boolean;

  // Executive action
  pendingExecutiveAction: ExecutivePower;
  investigationResult: Team | null;
  policyPeekCards: PolicyType[] | null;
  lastEnactedPolicy: PolicyType | null;

  // Night phase
  nightReady: boolean;
  allNightReady: boolean;
  nightInfo: NightInfo | null;

  // Game end
  winner: Team | null;
  winCondition: WinCondition | null;

  // Self info
  myId: string;
  myRole: Role | null;
  myTeam: Team | null;
  isHost: boolean;

  // Chat
  chatMessages: ChatMessage[];

  // Player count config
  playerCount: number;

  // Fascist track powers for this game
  fascistTrackPowers: ExecutivePower[];
}

export interface NightInfo {
  yourRole: Role;
  yourTeam: Team;
  // Fascists see other fascists + hitler
  // Hitler sees fascists only in 5-6 player games
  knownFascists: Array<{ id: string; name: string; role: Role }>;
}

export interface ServerEvents {
  game_state: (view: PlayerView) => void;
  error: (data: { message: string }) => void;
  lobby_created: (data: { lobbyCode: string }) => void;
  player_joined: (data: { playerName: string }) => void;
  player_left: (data: { playerName: string }) => void;
  chat_message: (msg: ChatMessage) => void;
}
