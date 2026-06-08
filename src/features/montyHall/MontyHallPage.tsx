import { useState } from 'react';
import { useMontyHallGame } from './useMontyHallGame';
import { getSwitchDoor, formatRate, buildTwentyDoorExplanation, DOORS } from './gameLogic';

export function MontyHallPage() {
  const {
    phase,
    initialDoor,
    revealedDoor,
    finalDoor,
    prizeDoor,
    strategy,
    won,
    stats,
    isSubmitting,
    error,
    pickInitialDoor,
    finishWithDoor,
    resetRound,
  } = useMontyHallGame();

  const [explainOpen, setExplainOpen] = useState(false);

  const switchDoor =
    initialDoor !== null && revealedDoor !== null
      ? getSwitchDoor(initialDoor, revealedDoor)
      : null;

  const handleToggleExplain = () => {
    setExplainOpen((prev) => !prev);
  };

  const miniDoors = buildTwentyDoorExplanation(0);

  // SVG Chart variables
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;
  const chartWidth = 400;
  const chartHeight = 220;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const hasSnapshots = stats.snapshots && stats.snapshots.length >= 2;

  // Build SVG paths
  let switchPath = '';
  let stayPath = '';
  if (hasSnapshots) {
    const len = stats.snapshots.length;
    switchPath = stats.snapshots
      .map((s, i) => {
        const x = paddingLeft + (i / (len - 1)) * graphWidth;
        const y = paddingTop + graphHeight - s.switchRate * graphHeight;
        const prefix = i === 0 ? 'M' : 'L';
        return `${prefix} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    stayPath = stats.snapshots
      .map((s, i) => {
        const x = paddingLeft + (i / (len - 1)) * graphWidth;
        const y = paddingTop + graphHeight - s.stayRate * graphHeight;
        const prefix = i === 0 ? 'M' : 'L';
        return `${prefix} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  // Ref lines Y coords
  const y33 = paddingTop + graphHeight - 0.333 * graphHeight;
  const y66 = paddingTop + graphHeight - 0.667 * graphHeight;

  return (
    <div className="container">
      <header className="page-header">
        <span className="kicker">Bayes / Live Crowd Experiment</span>
        <h1>Monty Hall</h1>
        <p className="intro-text">
          Pick one of three doors. Monty will reveal a goat behind one of the remaining doors.
          Then choose whether to stay with your original choice, or switch to the other closed door.
        </p>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          Error: {error}
        </div>
      )}

      <div className="main-layout">
        <main className="game-section">
          <h2 className="section-title">The Game</h2>
          
          <div className="doors-container">
            <div className="doors-grid">
              {DOORS.map((doorIndex) => {
                const isInitial = doorIndex === initialDoor;
                const isRevealed = doorIndex === revealedDoor;
                const isFinal = doorIndex === finalDoor;
                const isPrize = phase === 'finished' && doorIndex === prizeDoor;

                let btnClass = 'door-btn';
                let statusText = '';
                let label = `Choose door ${doorIndex + 1}`;

                if (phase === 'idle') {
                  btnClass += ' door-idle';
                } else if (phase === 'revealed') {
                  if (isInitial) {
                    btnClass += ' door-initial';
                    statusText = 'First pick';
                    label = `Door ${doorIndex + 1}: your first pick`;
                  } else if (isRevealed) {
                    btnClass += ' door-revealed';
                    statusText = 'Goat';
                    label = `Monty opened door ${doorIndex + 1}: goat`;
                  } else {
                    btnClass += ' door-remaining';
                    label = `Door ${doorIndex + 1}: remaining closed door`;
                  }
                } else if (phase === 'finished') {
                  if (isPrize) {
                    btnClass += ' door-prize';
                    statusText = 'Prize!';
                    label = `Door ${doorIndex + 1}: prize`;
                  } else {
                    btnClass += ' door-goat';
                    statusText = 'Goat';
                    label = `Door ${doorIndex + 1}: goat`;
                  }

                  if (isFinal) {
                    btnClass += ' door-final';
                    if (won) {
                      btnClass += ' door-won';
                    } else {
                      btnClass += ' door-lost';
                    }
                  }
                }

                const handlePick = () => {
                  if (phase === 'idle') {
                    pickInitialDoor(doorIndex);
                  }
                };

                return (
                  <button
                    key={doorIndex}
                    onClick={handlePick}
                    disabled={phase !== 'idle' || isSubmitting}
                    className={btnClass}
                    aria-label={label}
                  >
                    <span className="door-number">{doorIndex + 1}</span>
                    {statusText && <span className="door-status">{statusText}</span>}
                  </button>
                );
              })}
            </div>

            {phase === 'revealed' && initialDoor !== null && switchDoor !== null && (
              <div className="revealed-container" aria-live="polite">
                <div className="instruction-box">
                  <p>
                    Monty opened Door {revealedDoor + 1} to reveal a goat.
                  </p>
                  <p className="prompt-text">
                    Do you want to stay with your original choice, or switch to the other closed door?
                  </p>
                </div>
                <div className="action-buttons">
                  <button
                    onClick={() => finishWithDoor(initialDoor)}
                    disabled={isSubmitting}
                    className="action-btn stay-btn"
                  >
                    Stay with Door {initialDoor + 1}
                  </button>
                  <button
                    onClick={() => finishWithDoor(switchDoor)}
                    disabled={isSubmitting}
                    className="action-btn switch-btn"
                  >
                    Switch to Door {switchDoor + 1}
                  </button>
                </div>
              </div>
            )}

            {phase === 'finished' && (
              <div className="result-container" aria-live="polite">
                <h3 className="result-heading">
                  {won ? 'You won!' : 'You lost.'}
                </h3>
                <p className="result-strategy">
                  You chose to {strategy} and {won ? 'found the prize!' : 'found a goat.'}
                </p>
                <div className="educational-nudge">
                  {strategy === 'stay' && !won && (
                    'This is the trap: your first door kept its original 1/3 chance.'
                  )}
                  {strategy === 'switch' && won && (
                    'Switching captured the 2/3 chance Monty concentrated into the remaining closed door.'
                  )}
                  {strategy === 'stay' && won && (
                    'You beat the odds! Staying only has a 1/3 chance of winning, but you got lucky.'
                  )}
                  {strategy === 'switch' && !won && (
                    'You played the math. Switching has a 2/3 chance of winning, but the prize was behind your initial door this time.'
                  )}
                </div>
                <button onClick={resetRound} className="action-btn play-again-btn">
                  Play another round
                </button>
              </div>
            )}
          </div>
        </main>

        <aside className="dashboard-section">
          <h2 className="section-title">Live Dashboard</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Rounds</span>
              <span className="stat-value">{stats.totalGames}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Switchers</span>
              <span className="stat-value">{formatRate(stats.switchRate)}</span>
              <span className="stat-sub">
                {stats.switchWins} / {stats.switchGames} wins
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Stayers</span>
              <span className="stat-value">{formatRate(stats.stayRate)}</span>
              <span className="stat-sub">
                {stats.stayWins} / {stats.stayGames} wins
              </span>
            </div>
          </div>

          <div className="chart-container">
            <h3 className="chart-title">Probability Convergence</h3>
            {hasSnapshots ? (
              <svg className="convergence-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                {/* Horizontal reference lines */}
                <line
                  x1={paddingLeft}
                  y1={y33}
                  x2={chartWidth - paddingRight}
                  y2={y33}
                  stroke="var(--line)"
                  strokeDasharray="2,2"
                />
                <text
                  x={paddingLeft - 8}
                  y={y33 + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted)"
                >
                  33.3%
                </text>

                <line
                  x1={paddingLeft}
                  y1={y66}
                  x2={chartWidth - paddingRight}
                  y2={y66}
                  stroke="var(--line)"
                  strokeDasharray="2,2"
                />
                <text
                  x={paddingLeft - 8}
                  y={y66 + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted)"
                >
                  66.7%
                </text>

                {/* Axes */}
                <line
                  x1={paddingLeft}
                  y1={paddingTop}
                  x2={paddingLeft}
                  y2={paddingTop + graphHeight}
                  stroke="var(--ink)"
                />
                <line
                  x1={paddingLeft}
                  y1={paddingTop + graphHeight}
                  x2={chartWidth - paddingRight}
                  y2={paddingTop + graphHeight}
                  stroke="var(--ink)"
                />

                {/* Y Axis Labels */}
                <text
                  x={paddingLeft - 8}
                  y={paddingTop + graphHeight + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted)"
                >
                  0%
                </text>
                <text
                  x={paddingLeft - 8}
                  y={paddingTop + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted)"
                >
                  100%
                </text>

                {/* Lines */}
                <path
                  d={switchPath}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="2"
                />
                <path
                  d={stayPath}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
              </svg>
            ) : (
              <div className="empty-chart">
                <p>Play a few rounds to start the crowd line.</p>
              </div>
            )}
            {hasSnapshots && (
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-line legend-switch"></span> Switch
                </span>
                <span className="legend-item">
                  <span className="legend-line legend-stay"></span> Stay
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="page-footer">
        <button
          onClick={handleToggleExplain}
          className="explain-toggle-btn"
          aria-expanded={explainOpen}
        >
          {explainOpen ? 'Hide explanation' : 'Explain this to me'}
        </button>

        {explainOpen && (
          <div className="explanation-panel">
            <div className="explanation-text">
              <h3>The 1,000-Door Intuition</h3>
              <p>
                Imagine 1,000 doors. You pick 1. The chance that you picked the prize is exactly
                1/1000. That means there is a 999/1000 chance the prize is behind one of the other
                999 doors.
              </p>
              <p>
                Monty Hall then opens 998 goat doors, leaving only your chosen door and one remaining
                closed door.
              </p>
              <p>
                The door you chose still has its original 1/1000 chance. The remaining unopened door
                now carries the full 999/1000 probability from the 999 doors you skipped. Switching
                is not a 50/50 choice—it captures the concentrated probability of all the doors Monty
                eliminated.
              </p>
            </div>
            <div className="explanation-graphic">
              <h4>Visualizing the Eliminator</h4>
              <div className="mini-doors-grid">
                {miniDoors.map((d) => (
                  <div
                    key={d.index}
                    className={`mini-door mini-door-${d.state}`}
                    title={`Door ${d.index + 1}: ${d.state}`}
                  ></div>
                ))}
              </div>
              <p className="graphic-caption">
                A 20-door visualization of the 1,000-door intuition.
              </p>
              <div className="graphic-legend">
                <span className="legend-item">
                  <span className="legend-box mini-door-chosen"></span> Chosen (1/20)
                </span>
                <span className="legend-item">
                  <span className="legend-box mini-door-remaining"></span> Remaining (19/20)
                </span>
                <span className="legend-item">
                  <span className="legend-box mini-door-opened"></span> Opened Goat
                </span>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
export default MontyHallPage;
