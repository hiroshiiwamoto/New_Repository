import { useState, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import {
  getUserWeaknessesWithTags,
  getUserOverallStats,
  getCategoryStats,
  getAllWeaknessTags,
  getCategories
} from '../utils/weaknessAnalysisApi'
import './WeaknessAnalysis.css'

function WeaknessAnalysis() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overallStats, setOverallStats] = useState(null)
  const [weaknesses, setWeaknesses] = useState([])
  const [categoryStats, setCategoryStats] = useState([])
  const [allTags, setAllTags] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [view, setView] = useState('weaknesses') // 'weaknesses', 'categories', 'tags'

  useEffect(() => {
    loadWeaknessData()
  }, [])

  const loadWeaknessData = async () => {
    setLoading(true)
    setError(null)

    try {
      const auth = getAuth()
      const userId = auth.currentUser?.uid

      if (!userId) {
        setError('ログインしてください')
        setLoading(false)
        return
      }

      // 並列で全データを取得
      const [stats, weak, catStats, tags, cats] = await Promise.all([
        getUserOverallStats(userId),
        getUserWeaknessesWithTags(userId, { minWeaknessLevel: 1, limit: 20 }),
        getCategoryStats(userId),
        getAllWeaknessTags(),
        getCategories()
      ])

      setOverallStats(stats)
      setWeaknesses(weak)
      setCategoryStats(catStats)
      setAllTags(tags)
      setCategories(cats)
    } catch (err) {
      console.error('弱点データ取得エラー:', err)
      setError('データの取得に失敗しました。初期データをインポートしてください。')
    } finally {
      setLoading(false)
    }
  }

  const getWeaknessLevelLabel = (level) => {
    const labels = {
      0: '問題なし',
      1: '軽度',
      2: '中程度',
      3: '重度',
      4: '非常に重度',
      5: '致命的'
    }
    return labels[level] || '不明'
  }

  const getWeaknessLevelColor = (level) => {
    if (level === 0) return '#22c55e'
    if (level === 1) return '#84cc16'
    if (level === 2) return '#eab308'
    if (level === 3) return '#f97316'
    if (level === 4) return '#ef4444'
    return '#dc2626'
  }

  const filteredTags = selectedCategory === 'all'
    ? allTags
    : allTags.filter(tag => tag.category === selectedCategory)

  if (loading) {
    return (
      <div className="weakness-analysis">
        <div className="loading">📊 弱点データを読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="weakness-analysis">
        <div className="error-message">
          <p>⚠️ {error}</p>
          {error.includes('初期データ') && (
            <div className="setup-instructions">
              <h3>セットアップ手順:</h3>
              <ol>
                <li>Firebase Admin SDK サービスアカウントキーを取得</li>
                <li><code>cd scripts && npm install</code></li>
                <li><code>export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"</code></li>
                <li><code>npm run import:weakness-tags</code></li>
              </ol>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="weakness-analysis">
      {/* ヘッダー */}
      <div className="weakness-header">
        <h2>🎯 弱点分析システム</h2>
        <button onClick={loadWeaknessData} className="refresh-btn">
          🔄 更新
        </button>
      </div>

      {/* 全体統計 */}
      {overallStats && (
        <div className="overall-stats">
          <div className="stat-card">
            <div className="stat-label">解答数</div>
            <div className="stat-value">{overallStats.totalProblemsAttempted}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">正解数</div>
            <div className="stat-value">{overallStats.correctCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">正答率</div>
            <div className="stat-value">
              {overallStats.totalProblemsAttempted > 0
                ? `${(overallStats.accuracyRate * 100).toFixed(1)}%`
                : '-'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">総学習時間</div>
            <div className="stat-value">
              {Math.floor(overallStats.totalTimeSpent / 60)}分
            </div>
          </div>
        </div>
      )}

      {/* ビュー切り替え */}
      <div className="view-switcher">
        <button
          className={view === 'weaknesses' ? 'active' : ''}
          onClick={() => setView('weaknesses')}
        >
          📉 弱点TOP20
        </button>
        <button
          className={view === 'categories' ? 'active' : ''}
          onClick={() => setView('categories')}
        >
          📊 カテゴリ別統計
        </button>
        <button
          className={view === 'tags' ? 'active' : ''}
          onClick={() => setView('tags')}
        >
          🏷️ 単元一覧
        </button>
      </div>

      {/* 弱点TOP20 */}
      {view === 'weaknesses' && (
        <div className="weaknesses-section">
          {weaknesses.length === 0 ? (
            <div className="no-data">
              <p>📝 まだ解答履歴がありません</p>
              <p>過去問を解いて記録すると、弱点が分析されます。</p>
            </div>
          ) : (
            <div className="weakness-list">
              {weaknesses.map(({ score, tag }, index) => (
                <div key={score.id} className="weakness-item">
                  <div className="weakness-rank">#{index + 1}</div>
                  <div className="weakness-info">
                    <div className="weakness-name">
                      {tag?.name || '不明な単元'}
                    </div>
                    <div className="weakness-category">
                      {tag?.category || '-'}
                    </div>
                  </div>
                  <div className="weakness-stats">
                    <div className="accuracy">
                      正答率: {(score.accuracyRate * 100).toFixed(1)}%
                      <span className="attempts">
                        ({score.correctCount}/{score.totalAttempts})
                      </span>
                    </div>
                    <div
                      className="weakness-level"
                      style={{ backgroundColor: getWeaknessLevelColor(score.weaknessLevel) }}
                    >
                      {getWeaknessLevelLabel(score.weaknessLevel)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* カテゴリ別統計 */}
      {view === 'categories' && (
        <div className="categories-section">
          {categoryStats.length === 0 ? (
            <div className="no-data">
              <p>📝 まだカテゴリ別のデータがありません</p>
            </div>
          ) : (
            <div className="category-list">
              {categoryStats
                .sort((a, b) => a.accuracyRate - b.accuracyRate)
                .map((stat, index) => (
                  <div key={stat.category} className="category-item">
                    <div className="category-rank">#{index + 1}</div>
                    <div className="category-info">
                      <div className="category-name">{stat.category}</div>
                      <div className="category-details">
                        解答数: {stat.totalAttempts} |
                        平均難易度: {stat.avgDifficulty.toFixed(1)}
                      </div>
                    </div>
                    <div className="category-stats">
                      <div className="category-accuracy">
                        {(stat.accuracyRate * 100).toFixed(1)}%
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${stat.accuracyRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 単元一覧 */}
      {view === 'tags' && (
        <div className="tags-section">
          {/* カテゴリフィルター */}
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">すべてのカテゴリ</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <span className="tag-count">
              {filteredTags.length}単元
            </span>
          </div>

          {/* タグ一覧 */}
          <div className="tag-grid">
            {filteredTags.map(tag => (
              <div key={tag.id} className="tag-card">
                <div className="tag-header">
                  <div className="tag-name">{tag.name}</div>
                  {tag.difficultyLevel && (
                    <div className="tag-difficulty">
                      難易度: {'★'.repeat(tag.difficultyLevel)}
                    </div>
                  )}
                </div>
                <div className="tag-category">{tag.category}</div>
                {tag.description && (
                  <div className="tag-description">{tag.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WeaknessAnalysis
