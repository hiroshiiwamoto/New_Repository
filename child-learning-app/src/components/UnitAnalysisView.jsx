import { useState } from 'react'
import '../components/ScheduleView.css'
import MasterUnitDashboard from './MasterUnitDashboard'
import Analytics from './Analytics'
import WeaknessAnalysis from './WeaknessAnalysis'
import MasterUnitEditor from './MasterUnitEditor'

function UnitAnalysisView({ tasks }) {
  const [subView, setSubView] = useState('dashboard') // 'dashboard', 'analysis', 'editor'

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
        <button
          className={subView === 'editor' ? 'active' : ''}
          onClick={() => setSubView('editor')}
        >
          ✏️ 単元編集
        </button>
      </div>

      {subView === 'dashboard' ? (
        <MasterUnitDashboard />
      ) : subView === 'analysis' ? (
        <div className="study-analysis">
          <Analytics tasks={tasks} />
          <div className="analysis-divider" />
          <WeaknessAnalysis />
        </div>
      ) : (
        <MasterUnitEditor />
      )}
    </div>
  )
}

export default UnitAnalysisView
