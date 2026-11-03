import { useFantaGame } from './hooks/useFantaGame';
import { GameHUD } from './components/GameHUD';
import { RulesModal } from './components/RulesModal';
import { PlayersMenuModal } from './components/PlayersMenuModal';

export default function App() {
  const {
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
    setAimAngle,
    setPower,
    setIsCharging,
    setIsRulesOpen: setRulesOpen,
    setIsMenuOpen,
    handleThrow,
    handleTriggerAirFlip,
    handleNextRound,
    handleNextTosser,
    handleToggleSound,
    handleRestartGame,
    handleApplyPlayersMenu,
  } = useFantaGame();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans">
      <div ref={canvasMountRef} className="absolute inset-0 z-0 touch-none" />

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
        onOpenRules={() => setRulesOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        onRestartGame={handleRestartGame}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setRulesOpen(false)} />

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
