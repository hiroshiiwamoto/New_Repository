import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { getStaticMasterUnits, ensureMasterUnitsSeeded } from '../utils/importMasterUnits'
import './UnitTagPicker.css'

/**
 * マスター単元の複数選択タグピッカー
 *
 * @param {string[]} value - 選択済みの unitId 配列
 * @param {Function} onChange - (unitIds: string[]) => void
 * @param {string} [placeholder] - 検索ボックスのプレースホルダー
 */
function UnitTagPicker({ value = [], onChange, placeholder = '単元を検索...' }) {
  const [allUnits, setAllUnits] = useState([])
  const [searchText, setSearchText] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadUnits()
  }, [])

  const loadUnits = async () => {
    try {
      // コレクション未シードの場合は自動初期化
      await ensureMasterUnitsSeeded()
      const snapshot = await getDocs(collection(db, 'masterUnits'))
      if (snapshot.empty) {
        // Firestoreへの書き込み権限がない場合は静的データにフォールバック
        setAllUnits(getStaticMasterUnits())
        return
      }
      const units = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.isActive !== false)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      setAllUnits(units)
    } catch (e) {
      console.error('masterUnits 取得エラー:', e)
      setAllUnits(getStaticMasterUnits())
    }
  }

  const filteredUnits = useMemo(() => {
    if (!searchText.trim()) return allUnits
    const q = searchText.toLowerCase()
    return allUnits.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.category?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    )
  }, [allUnits, searchText])

  const selectedUnits = useMemo(() =>
    allUnits.filter(u => value.includes(u.id)),
    [allUnits, value]
  )

  const handleToggle = (unitId) => {
    if (value.includes(unitId)) {
      onChange(value.filter(id => id !== unitId))
    } else {
      onChange([...value, unitId])
    }
  }

  const handleRemove = (unitId, e) => {
    e.stopPropagation()
    onChange(value.filter(id => id !== unitId))
  }

  // カテゴリでグループ化
  const groupedFiltered = useMemo(() => {
    const groups = {}
    for (const unit of filteredUnits) {
      const cat = unit.category || 'その他'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(unit)
    }
    return groups
  }, [filteredUnits])

  return (
    <div className="utp-root">
      {/* 選択済みタグ表示 + 開閉トリガー */}
      <div
        className={`utp-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedUnits.length === 0 ? (
          <span className="utp-placeholder">単元タグを選択（複数可）</span>
        ) : (
          <div className="utp-chips">
            {selectedUnits.map(unit => (
              <span key={unit.id} className="utp-chip">
                {unit.name}
                <button
                  className="utp-chip-remove"
                  onClick={(e) => handleRemove(unit.id, e)}
                  tabIndex={-1}
                >×</button>
              </span>
            ))}
          </div>
        )}
        <span className="utp-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* ドロップダウン */}
      {isOpen && (
        <div className="utp-dropdown">
          <div className="utp-search">
            <input
              type="text"
              className="utp-search-input"
              placeholder={placeholder}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
            {searchText && (
              <button className="utp-clear" onClick={() => setSearchText('')}>×</button>
            )}
          </div>

          <div className="utp-list">
            {Object.entries(groupedFiltered).length === 0 ? (
              <div className="utp-empty">「{searchText}」に一致する単元がありません</div>
            ) : (
              Object.entries(groupedFiltered).map(([cat, units]) => (
                <div key={cat} className="utp-group">
                  <div className="utp-group-label">{cat}</div>
                  {units.map(unit => (
                    <label key={unit.id} className="utp-item">
                      <input
                        type="checkbox"
                        className="utp-checkbox"
                        checked={value.includes(unit.id)}
                        onChange={() => handleToggle(unit.id)}
                      />
                      <span className="utp-item-name">{unit.name}</span>
                      {unit.difficultyLevel && (
                        <span className="utp-item-diff">
                          {'★'.repeat(unit.difficultyLevel)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="utp-footer">
            <span>{value.length}個選択中</span>
            <button className="utp-done" onClick={() => setIsOpen(false)}>完了</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnitTagPicker
