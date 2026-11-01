/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Users, Bot, User, Check, Play, Settings } from 'lucide-react';
import { GameSettings, MetalFinish, Player } from '../types/game';
import { METAL_PALETTES } from '../graphics/textures';

interface PlayersMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  settings: GameSettings;
  onApply: (players: Player[], settings: GameSettings) => void;
}

const AVAILABLE_METALS: { id: MetalFinish; label: string }[] = [
  { id: 'gold', label: 'Zlato' },
  { id: 'silver', label: 'Srebro' },
  { id: 'bronze', label: 'Bronza' },
  { id: 'brass', label: 'Mesing' },
  { id: 'copper', label: 'Bakar' },
  { id: 'steel', label: 'Čelik' },
];

const PRESET_NAMES = ['Stefan', 'Marko', 'Nikola', 'Miloš', 'Luka', 'Jovan'];
const PRESET_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export const PlayersMenuModal: React.FC<PlayersMenuModalProps> = ({
  isOpen,
  onClose,
  players: initialPlayers,
  settings: initialSettings,
  onApply,
}) => {
  const [playerCount, setPlayerCount] = useState<number>(initialPlayers.length);
  const [coinsPerPlayer, setCoinsPerPlayer] = useState<number>(initialSettings.coinsPerPlayer || 1);
  const [playersList, setPlayersList] = useState<Player[]>(() => {
    return JSON.parse(JSON.stringify(initialPlayers));
  });

  if (!isOpen) return null;

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const updated = [...playersList];
    while (updated.length < count) {
      const idx = updated.length;
      updated.push({
        id: `p-${idx + 1}`,
        name: PRESET_NAMES[idx % PRESET_NAMES.length],
        isBot: false,
        botDifficulty: 'MEDIUM',
        color: PRESET_COLORS[idx % PRESET_COLORS.length],
        metal: AVAILABLE_METALS[idx % AVAILABLE_METALS.length].id,
        score: 0,
        roundsWon: 0,
        totalCoinsWon: 0,
      });
    }
    setPlayersList(updated.slice(0, count));
  };

  const updatePlayer = (index: number, updates: Partial<Player>) => {
    const updated = [...playersList];
    updated[index] = { ...updated[index], ...updates };
    setPlayersList(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(playersList.slice(0, playerCount), {
      ...initialSettings,
      playerCount,
      coinsPerPlayer,
    });
    onClose();
  };

  const totalPotCoins = playerCount * coinsPerPlayer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-300">MENI & PODEŠAVANJE IGRAČA</h2>
              <p className="text-xs text-slate-400">Podesi broj igrača, uloge, botove i metal novčića</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Player Count Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Broj Igrača u Partiji (2 do 6)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handlePlayerCountChange(count)}
                  className={`py-2.5 rounded-xl font-bold text-sm transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                    playerCount === count
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {count} {count === 2 ? 'Igrača' : count < 5 ? 'Igrača' : 'Igrača'}
                </button>
              ))}
            </div>
          </div>

          {/* Coins per player */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-200">Ulog novčića po igraču</div>
              <div className="text-xs text-slate-400">
                Ukupno u kasi za bacanje: <strong className="text-amber-300">{totalPotCoins} novčića</strong>
                {totalPotCoins < 3 && ' (Preporuka: bar 3-4 novčića ukupno za pravilo 3 glave)'}
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCoinsPerPlayer(val)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm cursor-pointer border transition ${
                    coinsPerPlayer === val
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-600/60'
                  }`}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>

          {/* Players configuration list */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Konfiguracija Igrača & Novčića
            </label>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {playersList.slice(0, playerCount).map((player, idx) => (
                <div
                  key={player.id}
                  className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80 flex flex-wrap md:flex-nowrap items-center gap-3"
                >
                  {/* Avatar badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: player.color }}
                  >
                    {idx + 1}
                  </div>

                  {/* Name input */}
                  <div className="flex-1 min-w-[120px]">
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayer(idx, { name: e.target.value })}
                      placeholder={`Igrač ${idx + 1}`}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Type toggle: Human / Bot */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => updatePlayer(idx, { isBot: false })}
                      className={`px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition ${
                        !player.isBot ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" /> Čovek
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePlayer(idx, { isBot: true })}
                      className={`px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition ${
                        player.isBot ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" /> Bot
                    </button>
                  </div>

                  {/* Bot difficulty if Bot */}
                  {player.isBot && (
                    <select
                      value={player.botDifficulty || 'MEDIUM'}
                      onChange={(e) =>
                        updatePlayer(idx, { botDifficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })
                      }
                      className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="EASY">Početnik</option>
                      <option value="MEDIUM">Uličar</option>
                      <option value="HARD">Šampion</option>
                    </select>
                  )}

                  {/* Metal finish picker */}
                  <div className="flex items-center gap-1">
                    <select
                      value={player.metal}
                      onChange={(e) => updatePlayer(idx, { metal: e.target.value as MetalFinish })}
                      className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {AVAILABLE_METALS.map((m) => (
                        <option key={m.id} value={m.id}>
                          🪙 {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Primeni i Pokreni Novu Partiju
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
