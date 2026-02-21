import './ScheduleView.css'
import MasterUnitDashboard from './MasterUnitDashboard'

function UnitAnalysisView({ sapixTexts = [], userId }) {
  return (
    <div className="unit-analysis-view">
      <MasterUnitDashboard sapixTexts={sapixTexts} userId={userId} />
    </div>
  )
}

export default UnitAnalysisView
