import {
  GameState,
  Player,
  PolicyType,
  Role,
  Team,
  Vote,
  ExecutivePower,
  GamePhase,
  PlayerView,
  NightInfo,
  ChatMessage,
  WinCondition,
  ROLE_DISTRIBUTION,
  getFascistTrackPowers,
} from '../../shared/types.ts';

// ─── Helpers ─────────────────────────────────────────────────────

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck(): PolicyType[] {
  const deck: PolicyType[] = [];
  for (let i = 0; i < 6; i++) deck.push('liberal');
  for (let i = 0; i < 11; i++) deck.push('fascist');
  return shuffle(deck);
}

function makeChatId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function systemMessage(game: GameState, text: string): void {
  game.chatMessages.push({
    id: makeChatId(),
    playerId: 'system',
    playerName: 'System',
    text,
    timestamp: Date.now(),
    isSystem: true,
  });
}

// ─── Create Lobby ────────────────────────────────────────────────

export function createLobby(hostId: string, hostName: string): GameState {
  return {
    lobbyCode: generateLobbyCode(),
    phase: 'lobby',
    players: [
      {
        id: hostId,
        name: hostName,
        isAlive: true,
        isHost: true,
        connected: true,
        hasBeenInvestigated: false,
      },
    ],
    liberalPoliciesEnacted: 0,
    fascistPoliciesEnacted: 0,
    drawPile: [],
    discardPile: [],
    electionTracker: 0,
    presidentIndex: -1,
    chancellorCandidateId: null,
    lastElectedPresidentId: null,
    lastElectedChancellorId: null,
    specialElectionPresidentIndex: null,
    votes: [],
    votingComplete: false,
    presidentialPolicies: [],
    chancellorPolicies: [],
    vetoRequested: false,
    pendingExecutiveAction: null,
    investigationResult: null,
    policyPeekCards: [],
    lastEnactedPolicy: null,
    nightReadyPlayers: [],
    winner: null,
    winCondition: null,
    chatMessages: [],
    createdAt: Date.now(),
    gameStartedAt: null,
  };
}

// ─── Join Lobby ──────────────────────────────────────────────────

export function addPlayer(game: GameState, playerId: string, playerName: string): string | null {
  if (game.phase !== 'lobby') return 'Game already in progress';
  if (game.players.length >= 10) return 'Lobby is full (max 10 players)';
  if (game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase()))
    return 'Name already taken';

  game.players.push({
    id: playerId,
    name: playerName,
    isAlive: true,
    isHost: false,
    connected: true,
    hasBeenInvestigated: false,
  });
  systemMessage(game, `${playerName} joined the lobby.`);
  return null;
}

// ─── Remove Player ───────────────────────────────────────────────

export function removePlayer(game: GameState, playerId: string): void {
  const idx = game.players.findIndex(p => p.id === playerId);
  if (idx === -1) return;

  const player = game.players[idx];

  if (game.phase === 'lobby') {
    game.players.splice(idx, 1);
    // If host left, reassign
    if (player.isHost && game.players.length > 0) {
      game.players[0].isHost = true;
    }
    systemMessage(game, `${player.name} left the lobby.`);
  } else {
    // During game, mark disconnected
    player.connected = false;
    systemMessage(game, `${player.name} disconnected.`);
  }
}

// ─── Reconnect ───────────────────────────────────────────────────

export function reconnectPlayer(game: GameState, newSocketId: string, playerName: string): Player | null {
  const player = game.players.find(
    p => p.name.toLowerCase() === playerName.toLowerCase() && !p.connected
  );
  if (!player) return null;

  player.id = newSocketId;
  player.connected = true;
  systemMessage(game, `${player.name} reconnected.`);
  return player;
}

// ─── Start Game ──────────────────────────────────────────────────

export function startGame(game: GameState): string | null {
  if (game.players.length < 5) return 'Need at least 5 players';
  if (game.players.length > 10) return 'Too many players (max 10)';

  const count = game.players.length;
  const dist = ROLE_DISTRIBUTION[count];
  if (!dist) return 'Invalid player count';

  // Build role array
  const roles: Role[] = [];
  for (let i = 0; i < dist.liberals; i++) roles.push('liberal');
  for (let i = 0; i < dist.fascists; i++) roles.push('fascist');
  roles.push('hitler');

  const shuffledRoles = shuffle(roles);

  // Assign roles
  for (let i = 0; i < game.players.length; i++) {
    game.players[i].role = shuffledRoles[i];
    game.players[i].team = shuffledRoles[i] === 'liberal' ? 'liberal' : 'fascist';
    game.players[i].isAlive = true;
    game.players[i].hasBeenInvestigated = false;
  }

  // Shuffle player order for seating
  game.players = shuffle(game.players);

  // Set up deck
  game.drawPile = createDeck();
  game.discardPile = [];

  // Pick random starting president
  game.presidentIndex = Math.floor(Math.random() * game.players.length);

  // Reset everything
  game.liberalPoliciesEnacted = 0;
  game.fascistPoliciesEnacted = 0;
  game.electionTracker = 0;
  game.chancellorCandidateId = null;
  game.lastElectedPresidentId = null;
  game.lastElectedChancellorId = null;
  game.specialElectionPresidentIndex = null;
  game.votes = [];
  game.votingComplete = false;
  game.presidentialPolicies = [];
  game.chancellorPolicies = [];
  game.vetoRequested = false;
  game.pendingExecutiveAction = null;
  game.investigationResult = null;
  game.policyPeekCards = [];
  game.nightReadyPlayers = [];
  game.winner = null;
  game.winCondition = null;
  game.gameStartedAt = Date.now();

  // Enter night phase
  game.phase = 'night';
  systemMessage(game, 'The game has begun! Review your secret role.');

  return null;
}

// ─── Night Phase ─────────────────────────────────────────────────

export function markNightReady(game: GameState, playerId: string): void {
  if (game.phase !== 'night') return;
  if (!game.nightReadyPlayers.includes(playerId)) {
    game.nightReadyPlayers.push(playerId);
  }

  // Check if all alive players are ready
  const alivePlayers = game.players.filter(p => p.isAlive && p.connected);
  if (game.nightReadyPlayers.length >= alivePlayers.length) {
    advanceToNomination(game);
  }
}

function advanceToNomination(game: GameState): void {
  game.phase = 'nomination';
  game.nightReadyPlayers = [];
  game.votes = [];
  game.votingComplete = false;
  game.chancellorCandidateId = null;

  const president = game.players[game.presidentIndex];
  systemMessage(game, `${president.name} is the Presidential Candidate. Choose a Chancellor.`);
}

// ─── Nomination ──────────────────────────────────────────────────

export function getEligibleChancellors(game: GameState): string[] {
  const presidentId = game.players[game.presidentIndex].id;
  const alivePlayers = game.players.filter(p => p.isAlive && p.id !== presidentId);
  const aliveCount = game.players.filter(p => p.isAlive).length;

  return alivePlayers
    .filter(p => {
      // Last elected chancellor is always ineligible
      if (p.id === game.lastElectedChancellorId) return false;
      // Last elected president ineligible UNLESS 5 or fewer alive players
      if (aliveCount > 5 && p.id === game.lastElectedPresidentId) return false;
      return true;
    })
    .map(p => p.id);
}

export function nominateChancellor(game: GameState, presidentId: string, nomineeId: string): string | null {
  if (game.phase !== 'nomination') return 'Not in nomination phase';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';

  const eligible = getEligibleChancellors(game);
  if (!eligible.includes(nomineeId)) return 'That player is not eligible for Chancellor';

  game.chancellorCandidateId = nomineeId;
  game.phase = 'election';
  game.votes = [];
  game.votingComplete = false;

  const nominee = game.players.find(p => p.id === nomineeId)!;
  systemMessage(game, `${president.name} nominated ${nominee.name} for Chancellor. Vote now!`);

  return null;
}

// ─── Election ────────────────────────────────────────────────────

export function castVote(game: GameState, playerId: string, vote: 'ja' | 'nein'): string | null {
  if (game.phase !== 'election') return 'Not in election phase';

  const player = game.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return 'Invalid voter';
  if (game.votes.some(v => v.playerId === playerId)) return 'Already voted';

  game.votes.push({ playerId, vote });

  // Check if all alive players have voted
  const aliveCount = game.players.filter(p => p.isAlive).length;
  if (game.votes.length >= aliveCount) {
    resolveElection(game);
  }

  return null;
}

function resolveElection(game: GameState): void {
  game.votingComplete = true;
  game.phase = 'election_results';

  const jaVotes = game.votes.filter(v => v.vote === 'ja').length;
  const neinVotes = game.votes.filter(v => v.vote === 'nein').length;
  const passed = jaVotes > neinVotes;

  if (passed) {
    const chancellor = game.players.find(p => p.id === game.chancellorCandidateId)!;
    systemMessage(game, `Election passed (${jaVotes} Ja / ${neinVotes} Nein). ${chancellor.name} is Chancellor!`);
  } else {
    systemMessage(game, `Election failed (${jaVotes} Ja / ${neinVotes} Nein).`);
  }
  // Phase stays at election_results — server handler schedules continueAfterElection
}

export function continueAfterElection(game: GameState): void {
  if (game.phase !== 'election_results') return;

  const jaVotes = game.votes.filter(v => v.vote === 'ja').length;
  const neinVotes = game.votes.filter(v => v.vote === 'nein').length;
  const passed = jaVotes > neinVotes;

  if (passed) {
    const chancellor = game.players.find(p => p.id === game.chancellorCandidateId)!;
    const president = game.players[game.presidentIndex];

    // Check Hitler win condition
    if (game.fascistPoliciesEnacted >= 3 && chancellor.role === 'hitler') {
      game.winner = 'fascist';
      game.winCondition = 'hitler_chancellor';
      game.phase = 'game_over';
      systemMessage(game, 'Hitler was elected Chancellor! Fascists win!');
      return;
    }

    // Update term limits
    game.lastElectedPresidentId = president.id;
    game.lastElectedChancellorId = chancellor.id;
    game.electionTracker = 0;

    startLegislativeSession(game);
  } else {
    advanceElectionTracker(game);
  }
}

function advanceElectionTracker(game: GameState): void {
  game.electionTracker++;

  if (game.electionTracker >= 3) {
    // Chaos: enact top policy
    ensureDeckHasCards(game, 1);
    const policy = game.drawPile.shift()!;
    enactPolicy(game, policy, true);
    game.electionTracker = 0;
    // Clear term limits on chaos
    game.lastElectedPresidentId = null;
    game.lastElectedChancellorId = null;
    systemMessage(game, `Three elections failed! The country is in chaos. A ${policy} policy was enacted!`);
    // Phase is now policy_enacted — server will schedule continueAfterPolicyEnacted
    // which handles win check and advancing (chaos never triggers executive powers)
  } else {
    advancePresidentAndNominate(game);
  }
}

// ─── Legislative Session ─────────────────────────────────────────

function startLegislativeSession(game: GameState): void {
  ensureDeckHasCards(game, 3);
  game.presidentialPolicies = game.drawPile.splice(0, 3);
  game.chancellorPolicies = [];
  game.vetoRequested = false;
  game.phase = 'legislative_president';

  const president = game.players[game.presidentIndex];
  systemMessage(game, `${president.name} is reviewing policies...`);
}

export function presidentDiscard(game: GameState, presidentId: string, policyIndex: number): string | null {
  if (game.phase !== 'legislative_president') return 'Not in presidential legislative phase';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';
  if (policyIndex < 0 || policyIndex >= game.presidentialPolicies.length) return 'Invalid policy index';

  // Discard one, pass two to chancellor
  const discarded = game.presidentialPolicies.splice(policyIndex, 1)[0];
  game.discardPile.push(discarded);
  game.chancellorPolicies = [...game.presidentialPolicies];
  game.presidentialPolicies = [];
  game.phase = 'legislative_chancellor';

  const chancellor = game.players.find(p => p.id === game.chancellorCandidateId)!;
  systemMessage(game, `${chancellor.name} is choosing a policy to enact...`);

  return null;
}

export function chancellorDiscard(game: GameState, chancellorId: string, policyIndex: number): string | null {
  if (game.phase !== 'legislative_chancellor') return 'Not in chancellor legislative phase';

  const chancellor = game.players.find(p => p.id === game.chancellorCandidateId);
  if (!chancellor || chancellor.id !== chancellorId) return 'You are not the Chancellor';
  if (policyIndex < 0 || policyIndex >= game.chancellorPolicies.length) return 'Invalid policy index';

  const discarded = game.chancellorPolicies.splice(policyIndex, 1)[0];
  game.discardPile.push(discarded);
  const enacted = game.chancellorPolicies[0];
  game.chancellorPolicies = [];

  enactPolicy(game, enacted, false);
  systemMessage(game, `A ${enacted} policy has been enacted!`);

  // Phase is now 'policy_enacted' — server handler will schedule continueAfterPolicyEnacted
  return null;
}

export function continueAfterPolicyEnacted(game: GameState): void {
  if (game.phase !== 'policy_enacted') return;

  if (checkWinConditions(game)) return;

  // Check for executive action on fascist policy
  if (game.lastEnactedPolicy === 'fascist') {
    const powers = getFascistTrackPowers(game.players.length);
    const power = powers[game.fascistPoliciesEnacted - 1];
    if (power) {
      game.pendingExecutiveAction = power;
      const president = game.players[game.presidentIndex];
      systemMessage(game, `${president.name} must use their executive power: ${formatPower(power)}.`);
      beginExecutiveAction(game);
      return;
    }
  }

  advancePresidentAndNominate(game);
}

// ─── Veto Power ──────────────────────────────────────────────────

export function requestVeto(game: GameState, chancellorId: string): string | null {
  if (game.phase !== 'legislative_chancellor') return 'Not in chancellor legislative phase';
  if (game.fascistPoliciesEnacted < 5) return 'Veto power not yet unlocked';

  const chancellor = game.players.find(p => p.id === game.chancellorCandidateId);
  if (!chancellor || chancellor.id !== chancellorId) return 'You are not the Chancellor';

  game.vetoRequested = true;
  game.phase = 'veto_requested';

  const president = game.players[game.presidentIndex];
  systemMessage(game, `${chancellor.name} proposed a veto! ${president.name} must decide.`);

  return null;
}

export function respondToVeto(game: GameState, presidentId: string, accept: boolean): string | null {
  if (game.phase !== 'veto_requested') return 'No veto pending';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';

  if (accept) {
    // Discard all policies
    game.discardPile.push(...game.chancellorPolicies);
    game.chancellorPolicies = [];
    game.vetoRequested = false;

    systemMessage(game, 'The veto was accepted. All policies discarded.');
    advanceElectionTracker(game);
  } else {
    // Chancellor must enact
    game.vetoRequested = false;
    game.phase = 'legislative_chancellor';
    systemMessage(game, 'The veto was rejected. The Chancellor must enact a policy.');
  }

  return null;
}

// ─── Executive Actions ───────────────────────────────────────────

export function investigatePlayer(game: GameState, presidentId: string, targetId: string): string | null {
  if (game.phase !== 'executive_action' || game.pendingExecutiveAction !== 'investigate')
    return 'Not in investigate phase';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';

  const target = game.players.find(p => p.id === targetId);
  if (!target) return 'Player not found';
  if (!target.isAlive) return 'Cannot investigate a dead player';
  if (target.id === presidentId) return 'Cannot investigate yourself';
  if (target.hasBeenInvestigated) return 'Player already investigated';

  target.hasBeenInvestigated = true;
  game.investigationResult = target.team!;
  game.phase = 'investigate';

  systemMessage(game, `${president.name} investigated ${target.name}'s loyalty.`);

  return null;
}

export function acknowledgeInvestigation(game: GameState, presidentId: string): string | null {
  if (game.phase !== 'investigate') return 'Not in investigation reveal phase';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';

  game.investigationResult = null;
  game.pendingExecutiveAction = null;
  advancePresidentAndNominate(game);

  return null;
}

export function pickSpecialElection(game: GameState, presidentId: string, targetId: string): string | null {
  if (game.phase !== 'executive_action' || game.pendingExecutiveAction !== 'special_election')
    return 'Not in special election phase';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';

  const target = game.players.find(p => p.id === targetId);
  if (!target) return 'Player not found';
  if (!target.isAlive) return 'Cannot pick a dead player';
  if (target.id === presidentId) return 'Cannot pick yourself';

  const targetIndex = game.players.indexOf(target);

  // Save current position so rotation resumes after
  game.specialElectionPresidentIndex = game.presidentIndex;
  game.presidentIndex = targetIndex;
  game.pendingExecutiveAction = null;

  systemMessage(game, `${president.name} called a Special Election! ${target.name} is the next Presidential Candidate.`);

  advanceToNomination(game);

  return null;
}

export function acknowledgePeek(game: GameState, presidentId: string): string | null {
  if (game.phase !== 'policy_peek') return 'Not in policy peek phase';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';

  game.policyPeekCards = [];
  game.pendingExecutiveAction = null;
  advancePresidentAndNominate(game);

  return null;
}

export function executePlayer(game: GameState, presidentId: string, targetId: string): string | null {
  if (game.phase !== 'executive_action' || game.pendingExecutiveAction !== 'execution')
    return 'Not in execution phase';

  const president = game.players[game.presidentIndex];
  if (president.id !== presidentId) return 'You are not the President';

  const target = game.players.find(p => p.id === targetId);
  if (!target) return 'Player not found';
  if (!target.isAlive) return 'Player is already dead';
  if (target.id === presidentId) return 'Cannot execute yourself';

  target.isAlive = false;
  game.pendingExecutiveAction = null;

  systemMessage(game, `${president.name} executed ${target.name}!`);

  // Check if Hitler was killed
  if (target.role === 'hitler') {
    game.winner = 'liberal';
    game.winCondition = 'hitler_executed';
    game.phase = 'game_over';
    systemMessage(game, 'Hitler has been executed! Liberals win!');
    return null;
  }

  advancePresidentAndNominate(game);
  return null;
}

// ─── Policy Helpers ──────────────────────────────────────────────

function enactPolicy(game: GameState, policy: PolicyType, isChaos: boolean): void {
  if (policy === 'liberal') {
    game.liberalPoliciesEnacted++;
  } else {
    game.fascistPoliciesEnacted++;
  }
  game.lastEnactedPolicy = policy;
  game.phase = 'policy_enacted';
}

function ensureDeckHasCards(game: GameState, count: number): void {
  if (game.drawPile.length < count) {
    game.drawPile = shuffle([...game.drawPile, ...game.discardPile]);
    game.discardPile = [];
    systemMessage(game, 'The deck has been reshuffled.');
  }
}

function checkWinConditions(game: GameState): boolean {
  if (game.liberalPoliciesEnacted >= 5) {
    game.winner = 'liberal';
    game.winCondition = 'liberal_policies';
    game.phase = 'game_over';
    systemMessage(game, 'Five Liberal policies enacted! Liberals win!');
    return true;
  }
  if (game.fascistPoliciesEnacted >= 6) {
    game.winner = 'fascist';
    game.winCondition = 'fascist_policies';
    game.phase = 'game_over';
    systemMessage(game, 'Six Fascist policies enacted! Fascists win!');
    return true;
  }
  return false;
}

// ─── President Advancement ───────────────────────────────────────

function advancePresidentAndNominate(game: GameState): void {
  // If returning from special election, resume from saved position
  if (game.specialElectionPresidentIndex !== null) {
    game.presidentIndex = game.specialElectionPresidentIndex;
    game.specialElectionPresidentIndex = null;
  }

  // Advance to next alive player
  let nextIndex = (game.presidentIndex + 1) % game.players.length;
  let safety = 0;
  while (!game.players[nextIndex].isAlive && safety < game.players.length) {
    nextIndex = (nextIndex + 1) % game.players.length;
    safety++;
  }
  game.presidentIndex = nextIndex;

  advanceToNomination(game);
}

// ─── Policy Peek ─────────────────────────────────────────────────

export function startPolicyPeek(game: GameState): void {
  ensureDeckHasCards(game, 3);
  game.policyPeekCards = game.drawPile.slice(0, 3); // peek, don't remove
  game.phase = 'policy_peek';
  const president = game.players[game.presidentIndex];
  systemMessage(game, `${president.name} is peeking at the top 3 policies...`);
}

// ─── Executive Action Dispatch ───────────────────────────────────

export function beginExecutiveAction(game: GameState): void {
  switch (game.pendingExecutiveAction) {
    case 'investigate':
      game.phase = 'executive_action';
      break;
    case 'special_election':
      game.phase = 'executive_action';
      break;
    case 'policy_peek':
      startPolicyPeek(game);
      break;
    case 'execution':
      game.phase = 'executive_action';
      break;
  }
}

// ─── Format Power Name ──────────────────────────────────────────

function formatPower(power: ExecutivePower): string {
  switch (power) {
    case 'investigate': return 'Investigate Loyalty';
    case 'special_election': return 'Call Special Election';
    case 'policy_peek': return 'Policy Peek';
    case 'execution': return 'Execution';
    default: return '';
  }
}

// ─── Build Player View (SECURITY: filters state per player) ─────

export function buildPlayerView(game: GameState, playerId: string): PlayerView {
  const self = game.players.find(p => p.id === playerId);
  const isHost = self?.isHost ?? false;
  const presidentPlayer = game.presidentIndex >= 0 ? game.players[game.presidentIndex] : null;
  const isPresident = presidentPlayer?.id === playerId;
  const isChancellor = game.chancellorCandidateId === playerId;

  // Build filtered player list
  const players = game.players.map(p => {
    const base = {
      id: p.id,
      name: p.name,
      isAlive: p.isAlive,
      isHost: p.isHost,
      connected: p.connected,
      hasBeenInvestigated: p.hasBeenInvestigated,
    };

    // Reveal roles at game over
    if (game.phase === 'game_over') {
      return { ...base, role: p.role, team: p.team };
    }

    // Self always sees own role
    if (p.id === playerId) {
      return { ...base, role: p.role, team: p.team };
    }

    return base;
  });

  // Night info — fascists see each other, hitler conditional
  let nightInfo: NightInfo | null = null;
  if (game.phase === 'night' && self?.role && self?.team) {
    const knownFascists: NightInfo['knownFascists'] = [];
    const playerCount = game.players.length;

    if (self.role === 'fascist') {
      // Fascists see all other fascists and hitler
      for (const p of game.players) {
        if (p.id !== playerId && (p.role === 'fascist' || p.role === 'hitler')) {
          knownFascists.push({ id: p.id, name: p.name, role: p.role! });
        }
      }
    } else if (self.role === 'hitler' && playerCount <= 6) {
      // Hitler sees fascists only in 5-6 player games
      for (const p of game.players) {
        if (p.id !== playerId && p.role === 'fascist') {
          knownFascists.push({ id: p.id, name: p.name, role: p.role! });
        }
      }
    }

    nightInfo = {
      yourRole: self.role,
      yourTeam: self.team,
      knownFascists,
    };
  }

  const lastEnactedPolicy = game.lastEnactedPolicy;

  return {
    lobbyCode: game.lobbyCode,
    phase: game.phase,
    players,
    liberalPoliciesEnacted: game.liberalPoliciesEnacted,
    fascistPoliciesEnacted: game.fascistPoliciesEnacted,
    drawPileCount: game.drawPile.length,
    discardPileCount: game.discardPile.length,
    electionTracker: game.electionTracker,
    presidentId: presidentPlayer?.id ?? null,
    chancellorCandidateId: game.chancellorCandidateId,
    lastElectedPresidentId: game.lastElectedPresidentId,
    lastElectedChancellorId: game.lastElectedChancellorId,

    // Votes only visible after all votes cast
    votes: game.votingComplete ? game.votes : null,
    votingComplete: game.votingComplete,
    hasVoted: game.votes.some(v => v.playerId === playerId),

    // Legislative — only the relevant player sees policies
    presidentialPolicies:
      (game.phase === 'legislative_president' && isPresident)
        ? game.presidentialPolicies
        : null,
    chancellorPolicies:
      ((game.phase === 'legislative_chancellor' || game.phase === 'veto_requested') && isChancellor)
        ? game.chancellorPolicies
        : null,
    vetoRequested: game.vetoRequested,

    // Executive
    pendingExecutiveAction: game.pendingExecutiveAction,
    investigationResult: (game.phase === 'investigate' && isPresident) ? game.investigationResult : null,
    policyPeekCards: (game.phase === 'policy_peek' && isPresident) ? game.policyPeekCards : null,
    lastEnactedPolicy,

    // Night
    nightReady: game.nightReadyPlayers.includes(playerId),
    allNightReady: false,
    nightInfo,

    // Game end
    winner: game.winner,
    winCondition: game.winCondition,

    // Self
    myId: playerId,
    myRole: self?.role ?? null,
    myTeam: self?.team ?? null,
    isHost,

    // Chat — dead players see chat but are muted (enforced server-side)
    chatMessages: game.chatMessages.slice(-100),

    playerCount: game.players.length,
    fascistTrackPowers: getFascistTrackPowers(game.players.length),
  };
}

// ─── Return to Lobby ─────────────────────────────────────────────

export function returnToLobby(game: GameState): void {
  game.phase = 'lobby';
  game.winner = null;
  game.winCondition = null;
  game.nightReadyPlayers = [];
  game.votes = [];
  game.votingComplete = false;
  game.presidentIndex = -1;
  game.chancellorCandidateId = null;
  game.lastElectedPresidentId = null;
  game.lastElectedChancellorId = null;
  game.specialElectionPresidentIndex = null;
  game.presidentialPolicies = [];
  game.chancellorPolicies = [];
  game.vetoRequested = false;
  game.pendingExecutiveAction = null;
  game.investigationResult = null;
  game.policyPeekCards = [];
  game.liberalPoliciesEnacted = 0;
  game.fascistPoliciesEnacted = 0;
  game.drawPile = [];
  game.discardPile = [];
  game.electionTracker = 0;
  game.lastEnactedPolicy = null;
  game.gameStartedAt = null;

  // Reset player state but keep them in lobby
  for (const p of game.players) {
    p.role = undefined;
    p.team = undefined;
    p.isAlive = true;
    p.hasBeenInvestigated = false;
  }

  // Remove disconnected players
  game.players = game.players.filter(p => p.connected);

  systemMessage(game, 'Returned to lobby. Host can start a new game.');
}

// ─── Force Advance (Host Admin) ──────────────────────────────────

export function forceAdvance(game: GameState): void {
  switch (game.phase) {
    case 'night':
      advanceToNomination(game);
      break;
    case 'nomination':
    case 'election':
    case 'election_results':
      advancePresidentAndNominate(game);
      break;
    case 'legislative_president':
    case 'legislative_chancellor':
    case 'veto_requested':
      // Auto-enact top card
      ensureDeckHasCards(game, 1);
      const policy = game.drawPile.shift()!;
      enactPolicy(game, policy, true);
      game.presidentialPolicies = [];
      game.chancellorPolicies = [];
      systemMessage(game, `Host force-advanced. A ${policy} policy was enacted.`);
      if (!checkWinConditions(game)) {
        advancePresidentAndNominate(game);
      }
      break;
    case 'executive_action':
    case 'investigate':
    case 'special_election':
    case 'policy_peek':
    case 'execution':
      game.pendingExecutiveAction = null;
      game.investigationResult = null;
      game.policyPeekCards = [];
      advancePresidentAndNominate(game);
      break;
    case 'policy_enacted':
      advancePresidentAndNominate(game);
      break;
    default:
      break;
  }
}
