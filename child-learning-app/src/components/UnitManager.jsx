import { useState } from 'react'
import './UnitManager.css'
import { unitsDatabase, subjects, grades } from '../utils/unitsDatabase'
import { subjectEmojis, subjectColors } from '../utils/constants'

function UnitManager({ customUnits, onUpdateUnit, onDeleteUnit }) {
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [selectedSubject, setSelectedSubject] = useState('算数')

  // デフォルト単元とカスタム単元を統合
  const defaultUnits = unitsDatabase[selectedSubject]?.[selectedGrade] || []
  const filteredCustomUnits = customUnits.filter(
    u => u.subject === selectedSubject && u.grade === selectedGrade
  )
  const currentUnits = [...defaultUnits, ...filteredCustomUnits]

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

      {/* 単元グリッド - Dashboardから完全コピー */}
      <div className="units-grid">
        {currentUnits.map((unit) => {
          const unitBackgroundColor = `${subjectColors[selectedSubject]}26`

          return (
            <div
              key={unit.id}
              className="unit-card"
              style={{ backgroundColor: unitBackgroundColor }}
            >
              <div className="unit-header">
                <div className="unit-title">
                  <span className="unit-name">{unit.name}</span>
                  <span className="unit-category">{unit.category}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UnitManager
