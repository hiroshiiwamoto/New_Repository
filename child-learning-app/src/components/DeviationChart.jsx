import './DeviationChart.css'

function DeviationChart({ data }) {
  if (!data || data.length < 2) return null

  // 4科目と2科目の偏差値を抽出
  const fourSubjectValues = data
    .filter(d => d.fourSubjects?.deviation)
    .map(d => parseFloat(d.fourSubjects.deviation))
  const twoSubjectValues = data
    .filter(d => d.twoSubjects?.deviation)
    .map(d => parseFloat(d.twoSubjects.deviation))

  // 科目別偏差値
  const subjectKeys = ['kokugo', 'sansu', 'rika', 'shakai']
  const subjectLabels = { kokugo: '国語', sansu: '算数', rika: '理科', shakai: '社会' }
  const subjectColors = { kokugo: '#10b981', sansu: '#ef4444', rika: '#3b82f6', shakai: '#f59e0b' }

  const allValues = [...fourSubjectValues, ...twoSubjectValues]
  subjectKeys.forEach(key => {
    data.forEach(d => {
      if (d.deviations?.[key]) allValues.push(parseFloat(d.deviations[key]))
    })
  })

  if (allValues.length === 0) return null

  const minVal = Math.floor(Math.min(...allValues) - 3)
  const maxVal = Math.ceil(Math.max(...allValues) + 3)
  const range = maxVal - minVal || 1

  // SVG dimensions
  const width = 600
  const height = 300
  const padding = { top: 30, right: 20, bottom: 60, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const xStep = chartWidth / (data.length - 1 || 1)

  const getY = (val) => {
    return padding.top + chartHeight - ((val - minVal) / range) * chartHeight
  }

  const buildLine = (key) => {
    const points = []
    data.forEach((d, i) => {
      let val = null
      if (key === 'four') val = d.fourSubjects?.deviation ? parseFloat(d.fourSubjects.deviation) : null
      else if (key === 'two') val = d.twoSubjects?.deviation ? parseFloat(d.twoSubjects.deviation) : null
      else val = d.deviations?.[key] ? parseFloat(d.deviations[key]) : null

      if (val !== null) {
        points.push({ x: padding.left + i * xStep, y: getY(val), val, index: i })
      }
    })
    return points
  }

  const fourLine = buildLine('four')
  const twoLine = buildLine('two')
  const subjectLines = {}
  subjectKeys.forEach(key => {
    subjectLines[key] = buildLine(key)
  })

  const toPath = (points) => {
    if (points.length < 2) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }

  // Y axis grid lines
  const gridLines = []
  const gridStep = range > 20 ? 5 : range > 10 ? 2 : 1
  for (let v = Math.ceil(minVal / gridStep) * gridStep; v <= maxVal; v += gridStep) {
    gridLines.push(v)
  }

  // 偏差値50のライン
  const show50Line = minVal < 50 && maxVal > 50

  return (
    <div className="deviation-chart">
      <h3>📈 偏差値推移</h3>
      <div className="chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          {/* Grid */}
          {gridLines.map(v => (
            <g key={v}>
              <line
                x1={padding.left}
                y1={getY(v)}
                x2={width - padding.right}
                y2={getY(v)}
                stroke={v === 50 ? '#007AFF' : '#e5e7eb'}
                strokeWidth={v === 50 ? 1.5 : 0.5}
                strokeDasharray={v === 50 ? '6,3' : 'none'}
              />
              <text
                x={padding.left - 8}
                y={getY(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#86868b"
              >
                {v}
              </text>
            </g>
          ))}

          {show50Line && (
            <text
              x={width - padding.right + 4}
              y={getY(50) + 4}
              fontSize="10"
              fill="#007AFF"
              fontWeight="600"
            >
              50
            </text>
          )}

          {/* X axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={padding.left + i * xStep}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#86868b"
              transform={`rotate(-30, ${padding.left + i * xStep}, ${height - padding.bottom + 20})`}
            >
              {new Date(d.testDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
            </text>
          ))}

          {/* Subject lines */}
          {subjectKeys.map(key => {
            const points = subjectLines[key]
            if (points.length < 2) return null
            return (
              <g key={key}>
                <path
                  d={toPath(points)}
                  fill="none"
                  stroke={subjectColors[key]}
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="3"
                    fill={subjectColors[key]}
                    opacity="0.4"
                  />
                ))}
              </g>
            )
          })}

          {/* Two subjects line */}
          {twoLine.length >= 2 && (
            <g>
              <path
                d={toPath(twoLine)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />
              {twoLine.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#10b981" strokeWidth="2" />
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#10b981"
                    fontWeight="600"
                  >
                    {p.val}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Four subjects line */}
          {fourLine.length >= 2 && (
            <g>
              <path
                d={toPath(fourLine)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
              />
              {fourLine.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#3b82f6" strokeWidth="2" />
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#3b82f6"
                    fontWeight="600"
                  >
                    {p.val}
                  </text>
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* 凡例 */}
      <div className="chart-legend">
        {fourLine.length >= 2 && (
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#3b82f6' }} />
            <span>4科目</span>
          </div>
        )}
        {twoLine.length >= 2 && (
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#10b981' }} />
            <span>2科目</span>
          </div>
        )}
        {subjectKeys.map(key => {
          if (subjectLines[key].length < 2) return null
          return (
            <div key={key} className="legend-item">
              <span className="legend-color" style={{ background: subjectColors[key], opacity: 0.5 }} />
              <span>{subjectLabels[key]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DeviationChart
