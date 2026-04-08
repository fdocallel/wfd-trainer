export default function Stats({ stats }) {
  if (!stats) return null

  return (
    <div>
      <div className="section-title">Resumen</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.todayAttempts}</div>
          <div className="stat-label">Hoy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todayAvgScore}%</div>
          <div className="stat-label">Media hoy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAttempts}</div>
          <div className="stat-label">Total intentos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgScore}%</div>
          <div className="stat-label">Media global</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uniqueAudios}</div>
          <div className="stat-label">Audios practicados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.coverage}%</div>
          <div className="stat-label">Cobertura</div>
        </div>
      </div>
    </div>
  )
}
