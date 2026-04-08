export default function Stats({ stats }) {
  if (!stats) return null

  return (
    <div>
      <div className="section-title">Overview</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.todayAttempts}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todayAvgScore}%</div>
          <div className="stat-label">Today avg</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAttempts}</div>
          <div className="stat-label">Total attempts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgScore}%</div>
          <div className="stat-label">Overall avg</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uniqueAudios}</div>
          <div className="stat-label">Audios practiced</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.coverage}%</div>
          <div className="stat-label">Coverage</div>
        </div>
      </div>
    </div>
  )
}
