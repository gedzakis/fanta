/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { GamePhase, GameSettings, Player, TossResult, CoinPhysicsState } from './types/game';
import { FantaSceneManager } from './graphics/FantaScene';
import {
  createLineThrowCoin,
  createAirTossCoins,
  updateCoinPhysics,
} from './physics/coinPhysics';
import { sounds } from './audio/soundEffects';
import { GameHUD } from './components/GameHUD';
import { RulesModal } from './components/RulesModal';
import { PlayersMenuModal } from './components/PlayersMenuModal';

// 5 Balkan neighborhood boys by default
const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'p-1',
    name: 'Stefan',
    isBot: false,
    color: '#3b82f6',
    metal: 'gold',
    score: 0,
    roundsWon: 0,
    totalCoinsWon: 0,
  },
  {
    id: 'p-2',
    name: 'Marko',
    isBot: false,
    color: '#ef4444',
    metal: 'silver',
    score: 0,
    roundsWon: 0,
    totalCoinsWon: 0,
  },
  {
    id: 'p-3',
    name: 'Nikola',
    isBot: false,
    color: '#10b981',
    metal: 'bronze',
    score: 0,
    roundsWon: 0,
    totalCoinsWon: 0,
  },
  {
    id: 'p-4',
    name: 'Miloš',
    isBot: false,
    color: '#f59e0b',
    metal: 'brass',
    score: 0,
    roundsWon: 0,
    totalCoinsWon: 0,
  },
  {
    id: 'p-5',
    name: 'Luka',
    isBot: false,
    color: '#8b5cf6',
    metal: 'copper',
    score: 0,
    roundsWon: 0,
    totalCoinsWon: 0,
  },
];

const DEFAULT_SETTINGS: GameSettings = {
  playerCount: 5,
  coinsPerPlayer: 1, // exactly 1 coin per player
  soundEnabled: true,
  botDelayMs: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<FantaSceneManager | null>(null);

  // Game states
  const [phase, setPhase] = useState<GamePhase>('AIM_LINE');
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [flipWinnerIndex, setFlipWinnerIndex] = useState<number>(0);
  const [failedTosserIds, setFailedTosserIds] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [tossResult, setTossResult] = useState<TossResult | null>(null);
  const [extraCoinsPocketed, setExtraCoinsPocketed] = useState<number>(0);

  // Aim & Throw controls
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [power, setPower] = useState<number>(0.63); // sweet spot for fast throw to 10m
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const powerChargeDir = useRef<number>(1);

  // Sound & Modals
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Physics simulation refs
  const activeCoinsRef = useRef<CoinPhysicsState[]>([]);
  const allLandedLineCoinsRef = useRef<CoinPhysicsState[]>([]);
  const isSimulatingRef = useRef<boolean>(false);

  // Initialize Three.js scene & 3D boys
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const sm = new FantaSceneManager(canvasMountRef.current);
    sceneManagerRef.current = sm;

    sm.initBoys(players);
    sm.updateAimPreview(aimAngle, power);

    return () => {
      sm.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Update aim preview when angle or power changes
  useEffect(() => {
    if (sceneManagerRef.current && phase === 'AIM_LINE') {
      sceneManagerRef.current.updateAimPreview(aimAngle, power);
      sceneManagerRef.current.setAimHelpersVisible(true);
    }
  }, [aimAngle, power, phase]);

  // Handle Power charge animation loop when holding button
  useEffect(() => {
    if (!isCharging) return;

    let animId: number;
    const chargeSpeed = 1.1; // snappy charge
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setPower((prev) => {
        let next = prev + powerChargeDir.current * chargeSpeed * dt;
        if (next >= 1.0) {
          next = 1.0;
          powerChargeDir.current = -1;
        } else if (next <= 0.2) {
          next = 0.2;
          powerChargeDir.current = 1;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isCharging]);

  // Main Physics animation tick loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tickPhysics = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      if (isSimulatingRef.current && activeCoinsRef.current.length > 0) {
        let allResting = true;

        for (const coin of activeCoinsRef.current) {
          const moving = updateCoinPhysics(coin, dt, soundEnabled);
          if (moving) {
            allResting = false;
          }
        }

        // Sync with 3D scene
        if (sceneManagerRef.current) {
          if (phase === 'THROW_LINE') {
            sceneManagerRef.current.syncCoins([
              ...allLandedLineCoinsRef.current,
              ...activeCoinsRef.current,
            ]);
            sceneManagerRef.current.setCameraMode('LINE_FOLLOW', activeCoinsRef.current[0]);
          } else if (phase === 'FLIP_AIR') {
            sceneManagerRef.current.syncCoins(activeCoinsRef.current);
          }
        }

        if (allResting) {
          isSimulatingRef.current = false;
          handlePhysicsRestComplete();
        }
      }

      animId = requestAnimationFrame(tickPhysics);
    };

    animId = requestAnimationFrame(tickPhysics);
    return () => cancelAnimationFrame(animId);
  }, [phase, soundEnabled]);

  // Handle what happens when active coins finish rolling and resting
  const handlePhysicsRestComplete = useCallback(() => {
    if (phase === 'THROW_LINE') {
      const landedCoin = activeCoinsRef.current[0];
      if (!landedCoin) return;

      allLandedLineCoinsRef.current.push(landedCoin);

      // Save distance on player
      const currentPlayer = players[activePlayerIndex];
      const dist = landedCoin.distanceToLine || 0;

      const updatedPlayers = [...players];
      updatedPlayers[activePlayerIndex] = {
        ...currentPlayer,
        lastDistanceMeters: dist,
      };
      setPlayers(updatedPlayers);

      // Check if more players need to throw
      if (activePlayerIndex + 1 < players.length) {
        // Fast, snappy transition to next player! (450ms)
        setTimeout(() => {
          const nextIdx = activePlayerIndex + 1;
          setActivePlayerIndex(nextIdx);
          setPhase('AIM_LINE');
          setAimAngle(0);
          setPower(0.63);

          if (sceneManagerRef.current) {
            sceneManagerRef.current.positionBoysForThrow(nextIdx);
            sceneManagerRef.current.setCameraMode('LINE_AIM');
            sceneManagerRef.current.setAimHelpersVisible(true);
          }
        }, 450);
      } else {
        // All boys threw! Move to LINE_RESULTS and show boys gathering around the chalk line
        setTimeout(() => {
          // Rank players by distance to line
          const sorted = [...updatedPlayers].sort(
            (a, b) => (a.lastDistanceMeters || 999) - (b.lastDistanceMeters || 999)
          );

          const winnerIndex = updatedPlayers.findIndex((p) => p.id === sorted[0].id);
          const safeWinnerIdx = winnerIndex >= 0 ? winnerIndex : 0;
          setFlipWinnerIndex(safeWinnerIdx);
          setFailedTosserIds([]);

          // Add 3D distance badges in scene
          if (sceneManagerRef.current) {
            allLandedLineCoinsRef.current.forEach((coin) => {
              const p = updatedPlayers.find((pl) => pl.id === coin.playerId);
              const rank = sorted.findIndex((pl) => pl.id === coin.playerId) + 1;
              if (p) {
                sceneManagerRef.current?.showDistanceMarker(coin, rank, p.name, p.color);
              }
            });

            // Boys walk up to the 3m line and winner bends down to grab coins into hand!
            sceneManagerRef.current.boysGatherAroundLine(
              updatedPlayers,
              safeWinnerIdx,
              () => {
                // When boy grabs coins:
                // If more than 5 players, extra coins go straight into winner's pocket!
                const totalPot = updatedPlayers.length * settings.coinsPerPlayer;
                const extra = Math.max(0, totalPot - 5);
                setExtraCoinsPocketed(extra);

                if (extra > 0) {
                  const winner = updatedPlayers[safeWinnerIdx];
                  winner.totalCoinsWon += extra;
                  setPlayers([...updatedPlayers]);
                  sounds.playVictory();
                }

                // Coins picked up from ground
                if (sceneManagerRef.current) {
                  sceneManagerRef.current.clearCoins();
                }
              },
              () => {
                // Grab animation completed
                setPhase('LINE_RESULTS');
              }
            );
          } else {
            setPhase('LINE_RESULTS');
          }
        }, 400);
      }
    } else if (phase === 'FLIP_AIR') {
      // 5 coins flipped in the air have landed! Count HEADS and TAILS
      const coins = activeCoinsRef.current;
      let heads = 0;
      let tails = 0;

      const coinOutcomes = coins.map((c) => {
        if (c.face === 'HEADS') heads++;
        else tails++;
        return {
          id: c.id,
          metal: c.metal,
          face: c.face,
        };
      });

      const isWinner = heads >= 3;
      const result: TossResult = {
        headsCount: heads,
        tailsCount: tails,
        totalCoins: coins.length,
        isWinner,
        coins: coinOutcomes,
      };

      setTossResult(result);

      if (isWinner) {
        sounds.playVictory();
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.55 },
        });

        // Award remaining 5 coins to current tosser
        const updated = [...players];
        const winner = updated[flipWinnerIndex];
        if (winner) {
          winner.roundsWon += 1;
          winner.totalCoinsWon += Math.min(5, coins.length);
          setPlayers(updated);
        }
        setPhase('ROUND_WINNER');
      } else {
        sounds.playMiss();
        setPhase('FLIP_RESULTS');
      }
    }
  }, [phase, players, activePlayerIndex, flipWinnerIndex, settings.coinsPerPlayer]);

  // Trigger coin throw at line by current active player
  const handleThrow = useCallback(() => {
    if (phase !== 'AIM_LINE' || isSimulatingRef.current) return;

    const currPlayer = players[activePlayerIndex];
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setAimHelpersVisible(false);

      // Play boy's arm swing animation, then release coin!
      sceneManagerRef.current.playThrowAnimation(activePlayerIndex, () => {
        sounds.playThrow();
        const coin = createLineThrowCoin(
          Date.now(),
          currPlayer.id,
          currPlayer.name,
          currPlayer.metal,
          aimAngle,
          power,
          0.28
        );

        activeCoinsRef.current = [coin];
        isSimulatingRef.current = true;
        setPhase('THROW_LINE');

        if (sceneManagerRef.current) {
          sceneManagerRef.current.setCameraMode('LINE_FOLLOW', coin);
        }
      });
    }
  }, [phase, players, activePlayerIndex, aimAngle, power]);

  // Trigger Flip Toss: Always exactly 5 coins thrown in air!
  const handleTriggerAirFlip = useCallback(() => {
    const currentTosser = players[flipWinnerIndex];

    if (sceneManagerRef.current) {
      sceneManagerRef.current.clearDistanceLabels();
      sceneManagerRef.current.setAimHelpersVisible(false);
      sceneManagerRef.current.setCameraMode('AIR_TOSS');

      // Boy plays upward throw animation
      sceneManagerRef.current.playAirTossAnimation(flipWinnerIndex, () => {
        sounds.playFlipLaunch();

        // Exactly 5 coins thrown in air
        const tossCount = Math.min(5, Math.max(players.length * settings.coinsPerPlayer, 3));
        const allMetals = players.map((p) => p.metal);
        const coins = createAirTossCoins(tossCount, currentTosser?.metal || 'gold', allMetals);

        activeCoinsRef.current = coins;
        isSimulatingRef.current = true;
        setPhase('FLIP_AIR');

        if (sceneManagerRef.current) {
          sceneManagerRef.current.syncCoins(coins);
        }
      });
    }
  }, [flipWinnerIndex, players, settings.coinsPerPlayer]);

  // Next Round setup
  const handleNextRound = () => {
    sounds.playClick();
    setCurrentRound((prev) => prev + 1);
    setActivePlayerIndex(0);
    setPhase('AIM_LINE');
    setTossResult(null);
    setFailedTosserIds([]);
    setExtraCoinsPocketed(0);

    activeCoinsRef.current = [];
    allLandedLineCoinsRef.current = [];
    isSimulatingRef.current = false;

    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        lastDistanceMeters: undefined,
        lastDistanceRank: undefined,
      }))
    );

    if (sceneManagerRef.current) {
      sceneManagerRef.current.clearCoins();
      sceneManagerRef.current.clearDistanceLabels();
      sceneManagerRef.current.positionBoysForThrow(0);
      sceneManagerRef.current.setCameraMode('LINE_AIM');
      sceneManagerRef.current.setAimHelpersVisible(true);
      sceneManagerRef.current.updateAimPreview(0, 0.63);
    }
  };

  // When less than 3 heads: pass toss turn to next closest player
  const handleNextTosser = () => {
    sounds.playClick();
    const currentTosser = players[flipWinnerIndex];
    const newFailed = [...failedTosserIds, currentTosser.id];
    setFailedTosserIds(newFailed);

    const sorted = [...players].sort(
      (a, b) => (a.lastDistanceMeters || 999) - (b.lastDistanceMeters || 999)
    );

    const nextPlayer = sorted.find((p) => !newFailed.includes(p.id));

    if (nextPlayer) {
      const nextIdx = players.findIndex((p) => p.id === nextPlayer.id);
      setFlipWinnerIndex(nextIdx);
      setPhase('FLIP_PREPARE');
      setTossResult(null);
      if (sceneManagerRef.current) {
        sceneManagerRef.current.setCameraMode('AIR_TOSS');
      }
    } else {
      // All boys missed! Start fresh round of line throws
      handleNextRound();
    }
  };

  // Restart game completely
  const handleRestartGame = () => {
    sounds.playClick();
    setCurrentRound(1);
    setActivePlayerIndex(0);
    setFlipWinnerIndex(0);
    setPhase('AIM_LINE');
    setTossResult(null);
    setFailedTosserIds([]);
    setExtraCoinsPocketed(0);

    activeCoinsRef.current = [];
    allLandedLineCoinsRef.current = [];
    isSimulatingRef.current = false;

    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        score: 0,
        roundsWon: 0,
        totalCoinsWon: 0,
        lastDistanceMeters: undefined,
      }))
    );

    if (sceneManagerRef.current) {
      sceneManagerRef.current.clearCoins();
      sceneManagerRef.current.clearDistanceLabels();
      sceneManagerRef.current.positionBoysForThrow(0);
      sceneManagerRef.current.setCameraMode('LINE_AIM');
      sceneManagerRef.current.setAimHelpersVisible(true);
      sceneManagerRef.current.updateAimPreview(0, 0.63);
    }
  };

  // Keyboard controls (Space to throw/flip, Arrow Left/Right to aim)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.code === 'ArrowLeft') {
        setAimAngle((prev) => Math.max(-0.25, prev - 0.02));
      } else if (e.code === 'ArrowRight') {
        setAimAngle((prev) => Math.min(0.25, prev + 0.02));
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (phase === 'AIM_LINE') {
          handleThrow();
        } else if (phase === 'FLIP_PREPARE' || phase === 'LINE_RESULTS') {
          handleTriggerAirFlip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleThrow, handleTriggerAirFlip]);

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setMuted(!next);
  };

  // Apply new settings from menu
  const handleApplyPlayersMenu = (newPlayers: Player[], newSettings: GameSettings) => {
    setPlayers(newPlayers);
    setSettings(newSettings);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.initBoys(newPlayers);
    }
    handleRestartGame();
  };

  const totalPotCoins = players.length * settings.coinsPerPlayer;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 touch-none" />

      {/* Interactive HUD Overlay */}
      <GameHUD
        phase={phase}
        players={players}
        activePlayerIndex={activePlayerIndex}
        flipWinnerIndex={flipWinnerIndex}
        aimAngle={aimAngle}
        power={power}
        isCharging={isCharging}
        potCoinsCount={totalPotCoins}
        extraCoinsPocketed={extraCoinsPocketed}
        currentRound={currentRound}
        tossResult={tossResult}
        soundEnabled={soundEnabled}
        onAimAngleChange={setAimAngle}
        onPowerChange={setPower}
        onStartCharging={() => setIsCharging(true)}
        onStopChargingAndThrow={() => {
          setIsCharging(false);
          handleThrow();
        }}
        onTriggerThrow={handleThrow}
        onTriggerAirFlip={handleTriggerAirFlip}
        onNextRound={handleNextRound}
        onNextTosser={handleNextTosser}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        onRestartGame={handleRestartGame}
      />

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Players Setup Modal */}
      <PlayersMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        players={players}
        settings={settings}
        onApply={handleApplyPlayersMenu}
      />
    </div>
  );
}
