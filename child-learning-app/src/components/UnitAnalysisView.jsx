import { useState } from 'react'
import '../components/ScheduleView.css'
import MasterUnitDashboard from './MasterUnitDashboard'
import Analytics from './Analytics'
import WeaknessAnalysis from './WeaknessAnalysis'

function UnitAnalysisView({ tasks }) {
  const [subView, setSubView] = useState('dashboard') // 'dashboard' | 'analysis'

  return (
    <div className="unit-analysis-view">
      <div className="sub-tab-switcher">
        <button
          className={subView === 'dashboard' ? 'active' : ''}
          onClick={() => setSubView('dashboard')}
        >
          🏠 単元ダッシュボード
        </button>
        <button
          className={subView === 'analysis' ? 'active' : ''}
          onClick={() => setSubView('analysis')}
        >
          📊 学習分析
        </button>
      </div>

      {subView === 'dashboard' ? (
        <MasterUnitDashboard />
      ) : (
        <div className="study-analysis">
          <Analytics tasks={tasks} />
          <div className="analysis-divider" />
          <WeaknessAnalysis />
        </div>
      )}
    </div>
  )
}

export default UnitAnalysisView
