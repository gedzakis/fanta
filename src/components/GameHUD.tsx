/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Users,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Flame,
  Award,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import { GamePhase, Player, TossResult } from '../types/game';

interface GameHUDProps {
  phase: GamePhase;
  players: Player[];
  activePlayerIndex: number;
  flipWinnerIndex: number;
  aimAngle: number;
  power: number;
  isCharging: boolean;
  potCoinsCount: number;
  extraCoinsPocketed?: number;
  currentRound: number;
  tossResult: TossResult | null;
  soundEnabled: boolean;
  onAimAngleChange: (angle: number) => void;
  onPowerChange: (power: number) => void;
  onStartCharging: () => void;
  onStopChargingAndThrow: () => void;
  onTriggerThrow: () => void;
  onTriggerAirFlip: () => void;
  onNextRound: () => void;
  onNextTosser: () => void;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenMenu: () => void;
  onRestartGame: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  phase,
  players,
  activePlayerIndex,
  flipWinnerIndex,
  aimAngle,
  power,
  isCharging,
  potCoinsCount,
  extraCoinsPocketed = 0,
  currentRound,
  tossResult,
  soundEnabled,
  onAimAngleChange,
  onPowerChange,
  onStartCharging,
  onStopChargingAndThrow,
  onTriggerThrow,
  onTriggerAirFlip,
  onNextRound,
  onNextTosser,
  onToggleSound,
  onOpenRules,
  onOpenMenu,
  onRestartGame,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const activePlayer = players[activePlayerIndex] || players[0];
  const flipPlayer = players[flipWinnerIndex] || players[0];

  // Ranked players based on last throw distance
  const sortedByDistance = [...players]
    .filter((p) => p.lastDistanceMeters !== undefined)
    .sort((a, b) => (a.lastDistanceMeters || 999) - (b.lastDistanceMeters || 999));

  return (
    <>
      {/* Top Bar Header */}
      <header className="fixed top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Brand & Round Badge */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg text-slate-100">
            <span className="text-xl">🪙</span>
            <div>
              <div className="flex items-center gap-1.5 font-black text-sm tracking-wide text-amber-300">
                FANTA 3D
                <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                  Runda {currentRound}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Balkanska igra novčićima</div>
            </div>
          </div>

          {/* Pot Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs shadow-lg">
            <span className="text-amber-400 font-bold">Kasa:</span>
            <span className="font-extrabold text-amber-300">{potCoinsCount} novčića</span>
          </div>
        </div>

        {/* Phase Pill in Center */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/95 border border-slate-700 text-xs font-bold text-slate-200 shadow-xl pointer-events-auto">
          {phase === 'AIM_LINE' || phase === 'THROW_LINE' || phase === 'LINE_RESULTS' ? (
            <>
              <Target className="w-4 h-4 text-amber-400" />
              <span>1. FAZA: Bacanje ka liniji (10 m)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>2. FAZA: Bacanje novčića uvis (Fanta)</span>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Isključi zvuk' : 'Uključi zvuk'}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={onOpenRules}
            title="Pravila igre"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg text-xs font-semibold cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Pravila</span>
          </button>

          <button
            onClick={onOpenMenu}
            title="Podešavanje igrača"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg text-xs font-semibold cursor-pointer"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Igrači ({players.length})</span>
          </button>

          <button
            onClick={onRestartGame}
            title="Resetuj partiju"
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Scoreboard Ribbon on Right / Top-Right (Compact) */}
      <div className="fixed top-16 right-3 z-20 hidden lg:flex flex-col gap-1 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs shadow-lg pointer-events-none">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Tabela Igrača</div>
        {players.map((p, idx) => (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg ${
              idx === activePlayerIndex && (phase === 'AIM_LINE' || phase === 'THROW_LINE')
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 font-bold'
                : 'text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="truncate max-w-[90px]">{p.name}</span>
              {p.isBot && <span className="text-[9px] text-slate-400">BOT</span>}
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-amber-400">{p.totalCoinsWon} 🪙</span>
              <span className="text-emerald-400">{p.roundsWon} 🏆</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ergonomic Collapsible Bottom Control Dock */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(940px,94vw)] transition-transform duration-300 ${
          isDockCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse Toggle Tab */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl bg-slate-900/95 border-t border-x border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white shadow-md cursor-pointer transition"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> Prikaži Kontrole (H)
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" /> Sakrij Kontrole
              </>
            )}
          </button>
        </div>

        {/* Main Dock Container */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-100 backdrop-blur-md">
          {/* Phase 1: Aiming & Throwing at Line */}
          {phase === 'AIM_LINE' && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Active Player Card */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md flex-shrink-0"
                  style={{ backgroundColor: activePlayer.color }}
                >
                  {activePlayerIndex + 1}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base text-slate-100">{activePlayer.name}</span>
                    {activePlayer.isBot && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                        BOT ({activePlayer.botDifficulty})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-300 font-medium">
                    <span>Nišani i baci novčić što bliže liniji od 3m!</span>
                  </div>
                </div>
              </div>

              {/* Aim and Power Controls (Always manual for player) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full md:w-auto justify-center">
                {/* Aim Angle */}
                <div className="flex flex-col gap-1 w-36">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>Pravac</span>
                    <span className="text-amber-300">{((aimAngle * 180) / Math.PI).toFixed(1)}°</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAimAngleChange(Math.max(-0.25, aimAngle - 0.04))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Ugao ulevo"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min={-0.25}
                      max={0.25}
                      step={0.01}
                      value={aimAngle}
                      onChange={(e) => onAimAngleChange(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => onAimAngleChange(Math.min(0.25, aimAngle + 0.04))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Ugao udesno"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Power Meter Slider / Charge indicator */}
                <div className="flex flex-col gap-1 w-44">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" /> Snaga
                    </span>
                    <span className="text-amber-300">{Math.round(power * 100)}%</span>
                  </div>
                  <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                      style={{ width: `${Math.round(power * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Throw Button */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onMouseDown={onStartCharging}
                  onMouseUp={onStopChargingAndThrow}
                  onTouchStart={onStartCharging}
                  onTouchEnd={onStopChargingAndThrow}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-sm tracking-wide shadow-lg transition select-none cursor-pointer flex items-center justify-center gap-2 ${
                    isCharging
                      ? 'bg-rose-500 text-white scale-98 shadow-rose-500/40 ring-2 ring-rose-400'
                      : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/30'
                  }`}
                >
                  <span className="text-lg">🪙</span>
                  {isCharging ? 'PUSTI ZA BAČAJ!' : `BACI ZA ${activePlayer.name.toUpperCase()} (SPACE)`}
                </button>
              </div>
            </div>
          )}

          {/* Phase: Throw In Flight */}
          {phase === 'THROW_LINE' && (
            <div className="py-2 flex items-center justify-center gap-3 text-slate-200">
              <span className="text-xl animate-spin">🪙</span>
              <span className="font-bold text-sm tracking-wide text-amber-300">
                Novčić igrača {activePlayer.name} leti i klizi ka liniji od 3 metra...
              </span>
            </div>
          )}

          {/* Phase: Line Throw Results */}
          {phase === 'LINE_RESULTS' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span className="font-extrabold text-sm text-slate-100">
                      Dečaci su prišli crti! Pobednik bacanja: <strong className="text-amber-300">{sortedByDistance[0]?.name}</strong>
                    </span>
                  </div>
                  {extraCoinsPocketed > 0 ? (
                    <div className="text-xs text-emerald-400 font-bold mt-0.5">
                      💰 Pošto ima više od 5 novčića, {sortedByDistance[0]?.name} uzima {extraCoinsPocketed} novčić viška u džep, a u ruci drži tačno 5 novčića za bacanje uvis!
                    </div>
                  ) : (
                    <div className="text-xs text-slate-300 mt-0.5">
                      Dečak {sortedByDistance[0]?.name} je pokupio novčiće sa poda i drži 5 novčića u šaci spreman za bacanje uvis!
                    </div>
                  )}
                </div>

                <button
                  onClick={onTriggerAirFlip}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs tracking-wider shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition"
                >
                  <Sparkles className="w-4 h-4" />
                  BACI 5 NOVČIĆA UVIS ({sortedByDistance[0]?.name})
                </button>
              </div>

              {/* Ranks list */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {sortedByDistance.map((p, idx) => {
                  const distCm = ((p.lastDistanceMeters || 0) * 100).toFixed(1);
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        idx === 0
                          ? 'bg-amber-500/20 border-amber-400/80 shadow-md shadow-amber-500/10'
                          : 'bg-slate-800/60 border-slate-700/60'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {idx === 0 ? '👑 1. MESTO' : `${idx + 1}. MESTO`}
                      </div>
                      <div className="font-bold text-xs text-slate-100 truncate mt-0.5">{p.name}</div>
                      <div className="text-sm font-black text-amber-300 mt-1">{distCm} cm</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 2: Flip in air preparation */}
          {phase === 'FLIP_PREPARE' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md flex-shrink-0"
                  style={{ backgroundColor: flipPlayer.color }}
                >
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base text-amber-300">{flipPlayer.name}</span>
                    <span className="text-xs text-slate-300 font-semibold">baca 5 novčića uvis!</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Cilj: Ispadanje <strong>3 ili više GLAVA</strong> donosi pobedu u rundi i sve novčiće!
                  </div>
                </div>
              </div>

              <button
                onClick={onTriggerAirFlip}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
              >
                <span className="text-xl">🚀</span>
                BACI 5 NOVČIĆA UVIS! (SPACE)
              </button>
            </div>
          )}

          {/* Phase: Flip in the air animation */}
          {phase === 'FLIP_AIR' && (
            <div className="py-2 flex items-center justify-center gap-3 text-slate-200">
              <span className="text-2xl animate-bounce">🪙</span>
              <span className="font-black text-base tracking-wide text-amber-300">
                Novčići lete visoko, rotiraju se i padaju na kaldrmu...
              </span>
            </div>
          )}

          {/* Phase: Flip Results & Round Decision */}
          {(phase === 'FLIP_RESULTS' || phase === 'ROUND_WINNER') && tossResult && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    {tossResult.isWinner ? (
                      <Trophy className="w-5 h-5 text-amber-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span
                      className={`font-black text-base tracking-wide ${
                        tossResult.isWinner ? 'text-amber-300' : 'text-rose-300'
                      }`}
                    >
                      {tossResult.isWinner
                        ? `POBEDA U RUNDI! ${flipPlayer.name} osvaja kasu!`
                        : `NIJE DOVOLJNO GLAVA (${tossResult.headsCount} od potrebnih 3)!`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tossResult.isWinner
                      ? `${flipPlayer.name} je dobio ${tossResult.headsCount} glave i osvaja svih ${tossResult.totalCoins} novčića!`
                      : `Pravo bacanja uvis prelazi na sledećeg najpreciznijeg igrača sa linije.`}
                  </p>
                </div>

                {/* Next Action Button */}
                {tossResult.isWinner ? (
                  <button
                    onClick={onNextRound}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Trophy className="w-4 h-4" />
                    ZAPOČNI SLEDEĆU RUNDU ({currentRound + 1})
                  </button>
                ) : (
                  <button
                    onClick={onNextTosser}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-slate-950 font-black text-xs tracking-wider shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                    PREDAJ POTEZ SLEDEĆEM IGRAČU
                  </button>
                )}
              </div>

              {/* Coins outcome badges */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {tossResult.coins.map((coin, i) => (
                  <div
                    key={i}
                    className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 shadow-md ${
                      coin.face === 'HEADS'
                        ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-600 text-slate-300'
                    }`}
                  >
                    <span className="text-lg">{coin.face === 'HEADS' ? '🦅' : '🔢'}</span>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Novčić #{i + 1}</div>
                      <div className="font-black text-xs tracking-wide">
                        {coin.face === 'HEADS' ? 'GLAVA' : 'PISMO'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total counter */}
              <div className="flex items-center justify-center gap-6 text-sm font-extrabold pt-1">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="text-xl">🦅</span>
                  <span>Ukupno GLAVA: {tossResult.headsCount}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-xl">🔢</span>
                  <span>Ukupno PISMA: {tossResult.tailsCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
