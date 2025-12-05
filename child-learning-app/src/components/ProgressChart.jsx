import { useState } from 'react'
import './ProgressChart.css'
import { subjectColors as baseSubjectColors } from '../utils/constants'

function ProgressChart({ data, subjects, type: _type = 'line' }) {
  const [selectedSubjects, setSelectedSubjects] = useState(['全体', ...subjects])

  const subjectColors = {
    '全体': '#6366f1',
    ...baseSubjectColors,
  }

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      // 最低1つは選択状態を保つ
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== subject))
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subject])
    }
  }

  // データポイントを計算
  const getDataPoints = (subject) => {
    return data.map(d => {
      if (subject === '全体') {
        return d.overall.percentage
      }
      return d.subjects[subject]?.percentage || null
    })
  }

  // Y軸の最大値
  const maxY = 100
  const minY = 0

  // グラフの高さとパディング
  const chartHeight = 200
  const chartPadding = { top: 20, right: 20, bottom: 40, left: 50 }
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const plotWidth = 600

  // ポイントをSVG座標に変換
  const pointToY = (value) => {
    if (value === null || value === undefined) return null
    return chartPadding.top + plotHeight * (1 - (value - minY) / (maxY - minY))
  }

  const pointToX = (index) => {
    return chartPadding.left + (plotWidth / (data.length - 1)) * index
  }

  // パスを生成（null値をスキップ）
  const generatePath = (points) => {
    if (!points || points.length === 0) return ''

    let path = ''
    let lastValidIndex = -1

    points.forEach((point, i) => {
      if (point !== null) {
        const x = pointToX(i)
        const y = pointToY(point)

        if (lastValidIndex === -1) {
          // 最初の有効なポイント
          path += `M ${x} ${y}`
        } else {
          // 線を引く
          path += ` L ${x} ${y}`
        }

        lastValidIndex = i
      }
    })

    return path
  }

  // 日付ラベルを生成（表示を間引く）
  const getDateLabels = () => {
    const step = Math.ceil(data.length / 6) // 最大6個のラベル
    return data.map((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        return {
          x: pointToX(i),
          label: formatDate(d.date)
        }
      }
      return null
    }).filter(Boolean)
  }

  // 日付をフォーマット
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="progress-chart">
      {/* 科目選択 */}
      <div className="chart-legend">
        {['全体', ...subjects].map(subject => (
          <button
            key={subject}
            className={`legend-item ${selectedSubjects.includes(subject) ? 'active' : ''}`}
            onClick={() => toggleSubject(subject)}
            style={{
              borderColor: subjectColors[subject],
              background: selectedSubjects.includes(subject)
                ? `${subjectColors[subject]}20`
                : 'transparent'
            }}
          >
            <span
              className="legend-color"
              style={{ background: subjectColors[subject] }}
            />
            <span className="legend-label">{subject}</span>
          </button>
        ))}
      </div>

      {/* グラフ */}
      <div className="chart-container">
        <svg
          viewBox={`0 0 ${plotWidth + chartPadding.left + chartPadding.right} ${chartHeight}`}
          className="chart-svg"
        >
          {/* Y軸グリッド */}
          {[0, 25, 50, 75, 100].map(value => (
            <g key={value}>
              <line
                x1={chartPadding.left}
                y1={pointToY(value)}
                x2={chartPadding.left + plotWidth}
                y2={pointToY(value)}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray={value === 0 || value === 100 ? "0" : "4 4"}
              />
              <text
                x={chartPadding.left - 10}
                y={pointToY(value)}
                textAnchor="end"
                alignmentBaseline="middle"
                className="axis-label"
              >
                {value}%
              </text>
            </g>
          ))}

          {/* X軸ラベル */}
          {getDateLabels().map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={chartHeight - 10}
              textAnchor="middle"
              className="axis-label"
            >
              {label.label}
            </text>
          ))}

          {/* データライン */}
          {selectedSubjects.map(subject => {
            const points = getDataPoints(subject)
            const path = generatePath(points)

            return (
              <g key={subject}>
                {/* ライン */}
                <path
                  d={path}
                  fill="none"
                  stroke={subjectColors[subject]}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* ポイント */}
                {points.map((point, i) => {
                  if (point === null) return null
                  return (
                    <circle
                      key={i}
                      cx={pointToX(i)}
                      cy={pointToY(point)}
                      r="4"
                      fill={subjectColors[subject]}
                      stroke="white"
                      strokeWidth="2"
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>

        {data.length === 0 && (
          <div className="no-data-message">
            <p>📊 データがまだありません</p>
            <p className="hint">タスクを完了すると、進捗が記録されます</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProgressChart
