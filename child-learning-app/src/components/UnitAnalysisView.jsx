import { useState } from 'react'
import '../components/ScheduleView.css'
import UnitDashboard from './UnitDashboard'
import Analytics from './Analytics'
import UnitManager from './UnitManager'
import WeaknessAnalysis from './WeaknessAnalysis'

function UnitAnalysisView({ tasks, onEditTask, customUnits, onAddCustomUnit, onUpdateUnit, onDeleteUnit }) {
  const [subView, setSubView] = useState('dashboard') // 'dashboard', 'analytics', 'unitManager', 'weakness'

  return (
    <div className="unit-analysis-view">
      <div className="sub-tab-switcher">
        <button
          className={subView === 'dashboard' ? 'active' : ''}
          onClick={() => setSubView('dashboard')}
        >
          単元ダッシュボード
        </button>
        <button
          className={subView === 'analytics' ? 'active' : ''}
          onClick={() => setSubView('analytics')}
        >
          学習分析
        </button>
        <button
          className={subView === 'weakness' ? 'active' : ''}
          onClick={() => setSubView('weakness')}
        >
          🎯 弱点分析
        </button>
        <button
          className={subView === 'unitManager' ? 'active' : ''}
          onClick={() => setSubView('unitManager')}
        >
          カスタム単元
        </button>
      </div>

      {subView === 'dashboard' ? (
        <UnitDashboard
          tasks={tasks}
          onEditTask={onEditTask}
          customUnits={customUnits}
        />
      ) : subView === 'analytics' ? (
        <Analytics tasks={tasks} />
      ) : subView === 'weakness' ? (
        <WeaknessAnalysis />
      ) : (
        <UnitManager
          customUnits={customUnits}
          onAddCustomUnit={onAddCustomUnit}
          onUpdateUnit={onUpdateUnit}
          onDeleteUnit={onDeleteUnit}
        />
      )}
    </div>
  )
}

export default UnitAnalysisView
