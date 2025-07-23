// import { lowerCategories, prettyName, upperCategories } from '../utils/utils';
// import AdvicePanel from './AdvicePanel';
// import AutoPlayer from './AutoPlayer';
// import DiceField from './DiceField';
// import ScoreCardSection from './ScoreCardSection';


export default function ScoreCardLayout() {
    return (
        // OUTER CONTAINER
        <div className="flex justify-between p-6 bg-white rounded-b-3xl shadow-sm gap-4 mb-4">

            {/* LEFT SIDE */}
            {/* <div className="w-[640px]">
                <ScoreCardSection
                    categories={upperCategories}
                    scores={scores}
                    suggestedScores={suggestedScores}
                    applyScore={applyScore}
                    rollCount={rollCount}
                    turnComplete={turnComplete}
                    prettyName={prettyName}
                    isUpperSection={true}
                    earnedBonuses={earnedBonuses}
                    totalsNode={
                        <UpperSectionTotals
                            upperSubtotal={totals.upperSubtotal}
                            bonus={totals.bonus}
                            upperTotal={totals.upperTotal}
                        />
                    }
                />
            </div> */}
            {/* RIGHT SIDE */}
            {/* <div className="w-[640px]">
                <ScoreCardSection
                    categories={lowerCategories}
                    scores={scores}
                    suggestedScores={suggestedScores}
                    applyScore={applyScore}
                    rollCount={rollCount}
                    turnComplete={turnComplete}
                    prettyName={prettyName}
                    isUpperSection={false}
                    earnedBonuses={earnedBonuses}
                    totalsNode={
                        <LowerSectionTotals
                            lowerTotal={totals.lowerTotal}
                            grandTotal={totals.grandTotal}
                        />
                    }
                />
            </div> */}
            {/* MIDDLE */}
            {/* <div className="flex flex-col items-center gap-4 w-[640px]">
                <DiceField
                    dice={dice}
                    rollDice={rollDice}
                    toggleHold={toggleHold}
                    rollCount={rollCount}
                    autoPlaying={autoPlaying}
                />
                <AutoPlayer
                    rollDice={rollDice}
                    applyScore={applyScore}
                    rollCount={rollCount}
                    turnComplete={turnComplete}
                    isGameOver={isGameOver || totals.isGameOver}
                    suggestedScores={suggestedScores}
                    scores={scores}
                    gameCount={gameCount || totals.gameCount}
                    autoPlaying={autoPlaying}
                    setAutoPlaying={setAutoPlaying}
                    totals={totals}
                    setTurnLog={setTurnLog}
                    turnLog={turnLog}
                    setGameStats={setGameStats}
                    gameStats={gameStats}
                    showAllTurns={showAllTurns}
                    setShowAllTurns={setShowAllTurns}
                    resetGame={resetGame}
                    gameNumber={gameNumber}
                    setGameNumber={setGameNumber}
                    user={user}
                    setRefreshKey={setRefreshKey}
                /> */}

        </div>

    );
}