import { useState } from 'react'
import './UnitManager.css'
import { subjects, grades } from '../utils/unitsDatabase'
import { subjectEmojis, subjectColors } from '../utils/constants'

function UnitManager({ customUnits, onUpdateUnit, onDeleteUnit }) {
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [selectedSubject, setSelectedSubject] = useState('算数')

  return (
    <div className="unit-manager">
      {/* ヘッダー：学年・科目選択 - Dashboardから完全コピー */}
      <div className="dashboard-header">
        <div className="selection-area">
          <label>学年:</label>
          {grades.map((grade) => (
            <button
              key={grade}
              className={`grade-btn ${selectedGrade === grade ? 'active' : ''}`}
              onClick={() => setSelectedGrade(grade)}
            >
              {grade}
            </button>
          ))}
        </div>

        <div className="subject-grid">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`dashboard-subject-btn ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
              style={{
                borderColor: selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                background: selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
                padding: '12px',
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="subject-emoji">{subjectEmojis[subject]}</span>
              <span>{subject}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 単元表示は完全削除 - ヘッダーのみ検証 */}
    </div>
  )
}

export default UnitManager
