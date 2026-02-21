import './ScheduleView.css'
import MasterUnitDashboard from './MasterUnitDashboard'

function UnitAnalysisView({ sapixTexts = [] }) {
  return (
    <div className="unit-analysis-view">
      <MasterUnitDashboard sapixTexts={sapixTexts} />
    </div>
  )
}

export default UnitAnalysisView
