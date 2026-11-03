import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { GamePhase, GameSettings, Player, TossResult, CoinPhysicsState } from '../types/game';
import { FantaSceneManager } from '../graphics/FantaScene';
import {
  createAirTossCoins,
  createLineThrowCoin,
  updateCoinPhysics,
} from '../physics/coinPhysics';
import { sounds } from '../audio/soundEffects';

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p-1', name: 'Stefan', isBot: false, color: '#3b82f6', metal: 'gold', score: 0, roundsWon: 0, totalCoinsWon: 0 },
  { id: 'p-2', name: 'Marko', isBot: false, color: '#ef4444', metal: 'silver', score: 0, roundsWon: 0, totalCoinsWon: 0 },
  { id: 'p-3', name: 'Nikola', isBot: false, color: '#10b981', metal: 'bronze', score: 0, roundsWon: 0, totalCoinsWon: 0 },
  { id: 'p-4', name: 'Miloš', isBot: false, color: '#f59e0b', metal: 'brass', score: 0, roundsWon: 0, totalCoinsWon: 0 },
  { id: 'p-5', name: 'Luka', isBot: false, color: '#8b5cf6', metal: 'copper', score: 0, roundsWon: 0, totalCoinsWon: 0 },
];

const DEFAULT_SETTINGS: GameSettings = {
  playerCount: 5,
  coinsPerPlayer: 1,
  soundEnabled: true,
  botDelayMs: 0,
};

const DEFAULT_POWER = 0.63;
const MIN_AIM_ANGLE = -0.25;
const MAX_AIM_ANGLE = 0.25;

export function useFantaGame() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<FantaSceneManager | null>(null);
  const activeCoinsRef = useRef<CoinPhysicsState[]>([]);
  const landedCoinsRef = useRef<CoinPhysicsState[]>([]);
  const simulatingRef = useRef(false);
  const powerChargeDirectionRef = useRef(1);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const roundGenerationRef = useRef(0);

  const [phase, setPhase] = useState<GamePhase>('AIM_LINE');
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [flipWinnerIndex, setFlipWinnerIndex] = useState(0);
  const [failedTosserIds, setFailedTosserIds] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [tossResult, setTossResult] = useState<TossResult | null>(null);
  const [extraCoinsPocketed, setExtraCoinsPocketed] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(DEFAULT_POWER);
  const [isCharging, setIsCharging] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Refs keep animation and timeout callbacks aligned with the latest React state.
  const phaseRef = useRef(phase);
  const playersRef = useRef(players);
  const settingsRef = useRef(settings);
  const activePlayerIndexRef = useRef(activePlayerIndex);
  const flipWinnerIndexRef = useRef(flipWinnerIndex);
  const failedTosserIdsRef = useRef(failedTosserIds);
  const aimAngleRef = useRef(aimAngle);
  const powerRef = useRef(power);
  const soundEnabledRef = useRef(soundEnabled);

  const changePhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const changePlayers = useCallback((next: Player[]) => {
    playersRef.current = next;
    setPlayers(next);
  }, []);

  const changeSettings = useCallback((next: GameSettings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  const changeActivePlayerIndex = useCallback((next: number) => {
    activePlayerIndexRef.current = next;
    setActivePlayerIndex(next);
  }, []);

  const changeFlipWinnerIndex = useCallback((next: number) => {
    flipWinnerIndexRef.current = next;
    setFlipWinnerIndex(next);
  }, []);

  const changeFailedTosserIds = useCallback((next: string[]) => {
    failedTosserIdsRef.current = next;
    setFailedTosserIds(next);
  }, []);

  const changeAimAngle = useCallback((next: number | ((previous: number) => number)) => {
    setAimAngle((previous) => {
      const value = typeof next === 'function' ? next(previous) : next;
      aimAngleRef.current = value;
      return value;
    });
  }, []);

  const changePower = useCallback((next: number | ((previous: number) => number)) => {
    setPower((previous) => {
      const value = typeof next === 'function' ? next(previous) : next;
      powerRef.current = value;
      return value;
    });
  }, []);

  const schedule = useCallback((callback: () => void, delay: number, generation = roundGenerationRef.current) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      if (generation === roundGenerationRef.current) callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const clearScheduledWork = useCallback(() => {
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current.clear();
    roundGenerationRef.current += 1;
  }, []);

  const handlePhysicsRestComplete = useCallback(() => {
    const currentPhase = phaseRef.current;

    if (currentPhase === 'THROW_LINE') {
      const coin = activeCoinsRef.current[0];
      if (!coin) return;
      landedCoinsRef.current.push(coin);

      const currentPlayers = playersRef.current;
      const currentIndex = activePlayerIndexRef.current;
      const player = currentPlayers[currentIndex];
      if (!player) return;

      const updatedPlayers = currentPlayers.map((item, index) =>
        index === currentIndex
          ? { ...item, lastDistanceMeters: coin.distanceToLine ?? 0 }
          : item
      );
      changePlayers(updatedPlayers);

      if (currentIndex + 1 < updatedPlayers.length) {
        schedule(() => {
          const nextIndex = currentIndex + 1;
          changeActivePlayerIndex(nextIndex);
          changePhase('AIM_LINE');
          changeAimAngle(0);
          changePower(DEFAULT_POWER);
          sceneManagerRef.current?.positionBoysForThrow(nextIndex);
          sceneManagerRef.current?.setCameraMode('LINE_AIM');
          sceneManagerRef.current?.setAimHelpersVisible(true);
        }, 450);
        return;
      }

      const generation = roundGenerationRef.current;
      schedule(() => {
        const rankedPlayers = [...updatedPlayers].sort(
          (a, b) => (a.lastDistanceMeters ?? Infinity) - (b.lastDistanceMeters ?? Infinity)
        );
        const winnerId = rankedPlayers[0]?.id;
        const winnerIndex = Math.max(0, updatedPlayers.findIndex((item) => item.id === winnerId));
        changeFlipWinnerIndex(winnerIndex);
        changeFailedTosserIds([]);

        const scene = sceneManagerRef.current;
        if (!scene) {
          changePhase('LINE_RESULTS');
          return;
        }

        landedCoinsRef.current.forEach((landedCoin) => {
          const owner = updatedPlayers.find((item) => item.id === landedCoin.playerId);
          const rank = rankedPlayers.findIndex((item) => item.id === landedCoin.playerId) + 1;
          if (owner) scene.showDistanceMarker(landedCoin, rank, owner.name, owner.color);
        });

        scene.boysGatherAroundLine(
          updatedPlayers,
          winnerIndex,
          () => {
            if (generation !== roundGenerationRef.current) return;
            const pot = updatedPlayers.length * settingsRef.current.coinsPerPlayer;
            const extra = Math.max(0, pot - 5);
            setExtraCoinsPocketed(extra);

            if (extra > 0) {
              const awardedPlayers = updatedPlayers.map((item, index) =>
                index === winnerIndex
                  ? { ...item, totalCoinsWon: item.totalCoinsWon + extra }
                  : item
              );
              changePlayers(awardedPlayers);
              sounds.playVictory();
            }
            sceneManagerRef.current?.clearCoins();
          },
          () => {
            if (generation === roundGenerationRef.current) changePhase('LINE_RESULTS');
          }
        );
      }, 400);
      return;
    }

    if (currentPhase !== 'FLIP_AIR') return;

    const coins = activeCoinsRef.current;
    const headsCount = coins.filter((coin) => coin.face === 'HEADS').length;
    const tailsCount = coins.length - headsCount;
    const isWinner = headsCount >= 3;
    const result: TossResult = {
      headsCount,
      tailsCount,
      totalCoins: coins.length,
      isWinner,
      coins: coins.map(({ id, metal, face }) => ({ id, metal, face })),
    };
    setTossResult(result);

    if (!isWinner) {
      sounds.playMiss();
      changePhase('FLIP_RESULTS');
      return;
    }

    sounds.playVictory();
    confetti({ particleCount: 110, spread: 80, origin: { y: 0.55 } });
    const winnerIndex = flipWinnerIndexRef.current;
    changePlayers(
      playersRef.current.map((player, index) =>
        index === winnerIndex
          ? {
              ...player,
              roundsWon: player.roundsWon + 1,
              totalCoinsWon: player.totalCoinsWon + Math.min(5, coins.length),
            }
          : player
      )
    );
    changePhase('ROUND_WINNER');
  }, [changeActivePlayerIndex, changeAimAngle, changeFailedTosserIds, changeFlipWinnerIndex, changePhase, changePlayers, changePower, schedule]);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const scene = new FantaSceneManager(mount);
    sceneManagerRef.current = scene;
    scene.initBoys(playersRef.current);
    scene.updateAimPreview(aimAngleRef.current, powerRef.current);

    return () => {
      clearScheduledWork();
      scene.dispose();
      if (sceneManagerRef.current === scene) sceneManagerRef.current = null;
    };
  }, [clearScheduledWork]);

  useEffect(() => {
    const scene = sceneManagerRef.current;
    if (scene && phase === 'AIM_LINE') {
      scene.updateAimPreview(aimAngle, power);
      scene.setAimHelpersVisible(true);
    }
  }, [aimAngle, power, phase]);

  useEffect(() => {
    if (!isCharging) return;
    let animationFrame = 0;
    let previousTime = performance.now();

    const charge = () => {
      const now = performance.now();
      const deltaSeconds = (now - previousTime) / 1000;
      previousTime = now;
      changePower((previous) => {
        let next = previous + powerChargeDirectionRef.current * 1.1 * deltaSeconds;
        if (next >= 1) {
          next = 1;
          powerChargeDirectionRef.current = -1;
        } else if (next <= 0.2) {
          next = 0.2;
          powerChargeDirectionRef.current = 1;
        }
        return next;
      });
      animationFrame = requestAnimationFrame(charge);
    };

    animationFrame = requestAnimationFrame(charge);
    return () => cancelAnimationFrame(animationFrame);
  }, [changePower, isCharging]);

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = Math.min((now - previousTime) / 1000, 0.04);
      previousTime = now;

      if (simulatingRef.current && activeCoinsRef.current.length > 0) {
        let allResting = true;
        for (const coin of activeCoinsRef.current) {
          if (updateCoinPhysics(coin, delta, soundEnabledRef.current)) allResting = false;
        }

        const scene = sceneManagerRef.current;
        if (scene) {
          if (phaseRef.current === 'THROW_LINE') {
            scene.syncCoins([...landedCoinsRef.current, ...activeCoinsRef.current]);
            scene.setCameraMode('LINE_FOLLOW', activeCoinsRef.current[0]);
          } else if (phaseRef.current === 'FLIP_AIR') {
            scene.syncCoins(activeCoinsRef.current);
          }
        }

        if (allResting) {
          simulatingRef.current = false;
          handlePhysicsRestComplete();
        }
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [handlePhysicsRestComplete]);

  useEffect(() => {
    if (sceneManagerRef.current && phase === 'AIM_LINE') {
      sceneManagerRef.current.positionBoysForThrow(activePlayerIndex);
    }
  }, [activePlayerIndex, phase]);

  const handleThrow = useCallback(() => {
    if (phaseRef.current !== 'AIM_LINE' || simulatingRef.current) return;
    const player = playersRef.current[activePlayerIndexRef.current];
    if (!player) return;

    const generation = roundGenerationRef.current;
    const releaseCoin = () => {
      if (generation !== roundGenerationRef.current || phaseRef.current !== 'AIM_LINE') return;
      sounds.playThrow();
      const coin = createLineThrowCoin(
        Date.now(), player.id, player.name, player.metal,
        aimAngleRef.current, powerRef.current, 0.28
      );
      activeCoinsRef.current = [coin];
      simulatingRef.current = true;
      changePhase('THROW_LINE');
      sceneManagerRef.current?.setCameraMode('LINE_FOLLOW', coin);
    };

    sceneManagerRef.current?.setAimHelpersVisible(false);
    sceneManagerRef.current
      ? sceneManagerRef.current.playThrowAnimation(activePlayerIndexRef.current, releaseCoin)
      : releaseCoin();
  }, [changePhase]);

  const handleTriggerAirFlip = useCallback(() => {
    if (!['LINE_RESULTS', 'FLIP_PREPARE'].includes(phaseRef.current) || simulatingRef.current) return;
    const winnerIndex = flipWinnerIndexRef.current;
    const currentPlayers = playersRef.current;
    const winner = currentPlayers[winnerIndex];
    if (!winner) return;

    const generation = roundGenerationRef.current;
    const releaseCoins = () => {
      if (generation !== roundGenerationRef.current || !['LINE_RESULTS', 'FLIP_PREPARE'].includes(phaseRef.current)) return;
      sounds.playFlipLaunch();
      const tossCount = Math.min(5, Math.max(currentPlayers.length * settingsRef.current.coinsPerPlayer, 3));
      const coins = createAirTossCoins(tossCount, winner.metal, currentPlayers.map((player) => player.metal));
      activeCoinsRef.current = coins;
      simulatingRef.current = true;
      changePhase('FLIP_AIR');
      sceneManagerRef.current?.syncCoins(coins);
    };

    const scene = sceneManagerRef.current;
    scene?.clearDistanceLabels();
    scene?.setAimHelpersVisible(false);
    scene?.setCameraMode('AIR_TOSS');
    if (scene) scene.playAirTossAnimation(winnerIndex, releaseCoins);
    else releaseCoins();
  }, [changePhase]);

  const resetRoundState = useCallback(() => {
    clearScheduledWork();
    activeCoinsRef.current = [];
    landedCoinsRef.current = [];
    simulatingRef.current = false;
    setIsCharging(false);
    changeAimAngle(0);
    changePower(DEFAULT_POWER);
    setTossResult(null);
    setExtraCoinsPocketed(0);
    changeFailedTosserIds([]);
    changePhase('AIM_LINE');
    changePlayers(
      playersRef.current.map((player) => ({
        ...player,
        lastDistanceMeters: undefined,
        lastDistanceRank: undefined,
      }))
    );

    const scene = sceneManagerRef.current;
    scene?.clearCoins();
    scene?.clearDistanceLabels();
    scene?.positionBoysForThrow(0);
    scene?.setCameraMode('LINE_AIM');
    scene?.setAimHelpersVisible(true);
    scene?.updateAimPreview(0, DEFAULT_POWER);
  }, [changeAimAngle, changeFailedTosserIds, changePhase, changePlayers, changePower, clearScheduledWork]);

  const handleNextRound = useCallback(() => {
    sounds.playClick();
    setCurrentRound((round) => round + 1);
    changeActivePlayerIndex(0);
    changeFlipWinnerIndex(0);
    resetRoundState();
  }, [changeActivePlayerIndex, changeFlipWinnerIndex, resetRoundState]);

  const handleNextTosser = useCallback(() => {
    sounds.playClick();
    const currentTosser = playersRef.current[flipWinnerIndexRef.current];
    if (!currentTosser) return;

    const nextFailed = [...failedTosserIdsRef.current, currentTosser.id];
    changeFailedTosserIds(nextFailed);
    const orderedPlayers = [...playersRef.current].sort(
      (a, b) => (a.lastDistanceMeters ?? Infinity) - (b.lastDistanceMeters ?? Infinity)
    );
    const nextPlayer = orderedPlayers.find((player) => !nextFailed.includes(player.id));

    if (!nextPlayer) {
      handleNextRound();
      return;
    }

    changeFlipWinnerIndex(playersRef.current.findIndex((player) => player.id === nextPlayer.id));
    setTossResult(null);
    changePhase('FLIP_PREPARE');
    sceneManagerRef.current?.setCameraMode('AIR_TOSS');
  }, [changeFailedTosserIds, changeFlipWinnerIndex, changePhase, handleNextRound]);

  const handleRestartGame = useCallback(() => {
    sounds.playClick();
    setCurrentRound(1);
    changeActivePlayerIndex(0);
    changeFlipWinnerIndex(0);
    changePlayers(
      playersRef.current.map((player) => ({
        ...player,
        score: 0,
        roundsWon: 0,
        totalCoinsWon: 0,
        lastDistanceMeters: undefined,
        lastDistanceRank: undefined,
      }))
    );
    resetRoundState();
  }, [changeActivePlayerIndex, changeFlipWinnerIndex, changePlayers, resetRoundState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, select, textarea, button, [contenteditable="true"]')) return;

      if (event.code === 'ArrowLeft' && phaseRef.current === 'AIM_LINE') {
        event.preventDefault();
        changeAimAngle((angle) => Math.max(MIN_AIM_ANGLE, angle - 0.02));
      } else if (event.code === 'ArrowRight' && phaseRef.current === 'AIM_LINE') {
        event.preventDefault();
        changeAimAngle((angle) => Math.min(MAX_AIM_ANGLE, angle + 0.02));
      } else if (event.code === 'Space') {
        event.preventDefault();
        if (phaseRef.current === 'AIM_LINE') handleThrow();
        else if (phaseRef.current === 'FLIP_PREPARE' || phaseRef.current === 'LINE_RESULTS') handleTriggerAirFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeAimAngle, handleThrow, handleTriggerAirFlip]);

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    sounds.setMuted(!next);
  }, []);

  const handleApplyPlayersMenu = useCallback((nextPlayers: Player[], nextSettings: GameSettings) => {
    changePlayers(nextPlayers);
    changeSettings(nextSettings);
    sceneManagerRef.current?.initBoys(nextPlayers);
    handleRestartGame();
  }, [changePlayers, changeSettings, handleRestartGame]);

  const totalPotCoins = players.length * settings.coinsPerPlayer;

  return {
    canvasMountRef,
    phase,
    players,
    settings,
    activePlayerIndex,
    flipWinnerIndex,
    aimAngle,
    power,
    isCharging,
    soundEnabled,
    isRulesOpen,
    isMenuOpen,
    currentRound,
    tossResult,
    extraCoinsPocketed,
    totalPotCoins,
    setAimAngle: changeAimAngle,
    setPower: changePower,
    setIsCharging,
    setIsRulesOpen,
    setIsMenuOpen,
    handleThrow,
    handleTriggerAirFlip,
    handleNextRound,
    handleNextTosser,
    handleToggleSound,
    handleRestartGame,
    handleApplyPlayersMenu,
  };
}

export { DEFAULT_PLAYERS, DEFAULT_SETTINGS };
