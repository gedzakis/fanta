/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, Target, Coins, Trophy, Award } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-amber-300">PRAVILA IGRE „FANTA”</h2>
              <p className="text-xs text-slate-400 font-medium">Tradicionalna ulična igra novčićima (Krajcarice / Bacanik)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4 text-sm text-slate-300">
          <p className="leading-relaxed text-slate-200">
            „Fanta” je legendarna igra iz dvorišta i sokaka bivše Jugoslavije. Spaja veštinu preciznog bacanja na crtu i neizvesnost bacanja novčića uvis!
          </p>

          <div className="grid gap-3 pt-1">
            {/* Step 1 */}
            <div className="flex gap-3.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-amber-200">
                  <Coins className="w-4 h-4 text-amber-400" /> Zajednički Ulog (Kasa)
                </div>
                <p className="mt-0.5 text-xs text-slate-300 leading-normal">
                  Svaki igrač ulaže određeni broj novčića u zajednički fond pre početka runde. Svi novčići iz kase idu pobedniku.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sky-200">
                  <Target className="w-4 h-4 text-sky-400" /> Bacanje na crtu (10 metara)
                </div>
                <p className="mt-0.5 text-xs text-slate-300 leading-normal">
                  Igrači stoje iza startne linije i redom bacaju novčić ka 3 metra širokoj ciljnoj crti. Možeš birati ugao i snagu bacanja tako da novčić klizi pravo do crte.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-emerald-200">
                  <Award className="w-4 h-4 text-emerald-400" /> Prilazak crti i pravilo 5 novčića
                </div>
                <p className="mt-0.5 text-xs text-slate-300 leading-normal">
                  Dečaci prilaze crti da pregledaju ko je bacio najbliže. Dečak koji je <strong>najbliži liniji</strong> prilazi i kupi novčiće u ruku.
                  Ako ima više od 5 novčića (npr. 6 igrača), <strong>pobednik odmah stavlja višak u džep</strong>, a uvis baca <strong>tačno 5 novčića</strong>!
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-purple-200">
                  <Trophy className="w-4 h-4 text-purple-400" /> Pravilo 3 ili više Glava!
                </div>
                <p className="mt-0.5 text-xs text-slate-300 leading-normal">
                  Dečak zamahuje i baca 5 novčića uvis! Kada padnu na tlo, sistem automatski broji glave i pisma.
                  Ako ispadne <strong>3 ili više glava</strong>, dečak uzima sve novčiće i pobeđuje u rundi!
                  Ako ne, pravo bacanja 5 novčića uvis prelazi na sledećeg najpreciznijeg dečaka sa linije!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            Razumem, idemo na igru!
          </button>
        </div>
      </div>
    </div>
  );
};
