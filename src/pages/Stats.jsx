export default function Stats({ stats, dailyGoal }) {
  if (!stats) return null

  return (
    <div>
      <div className="section-title">Today</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.todayAttempts}<span className="stat-of">/{dailyGoal}</span></div>
          <div className="stat-label">Daily goal</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todayAvgScore}%</div>
          <div className="stat-label">Today avg</div>
        </div>
      </div>

      <div className="section-title">Overall</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Day streak 🔥</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgScore}%</div>
          <div className="stat-label">Overall avg</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAttempts}</div>
          <div className="stat-label">Total attempts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uniqueAudios}</div>
          <div className="stat-label">Audios practiced</div>
        </div>
        <div className="stat-card wide">
          <div className="stat-value">{stats.coverage}%</div>
          <div className="stat-label">Coverage ({stats.uniqueAudios} / {stats.totalAudios})</div>
        </div>
      </div>
    </div>
  )
}
