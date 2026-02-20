import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import './UnitTagPicker.css'

/**
 * マスター単元の複数選択タグピッカー
 *
 * ドロップダウンは createPortal で document.body に描画するため、
 * 親の overflow: hidden に影響されない。
 */
function UnitTagPicker({ value = [], onChange, subject = null, placeholder = '単元を検索...' }) {
  const allUnits = useMemo(() => getStaticMasterUnits(), [])
  const subjectUnits = useMemo(
    () => subject ? getStaticMasterUnits(subject) : allUnits,
    [allUnits, subject]
  )
  const [searchText, setSearchText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})

  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const filteredUnits = useMemo(() => {
    if (!searchText.trim()) return subjectUnits
    const q = searchText.toLowerCase()
    return subjectUnits.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.category?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    )
  }, [subjectUnits, searchText])

  const selectedUnits = useMemo(() =>
    value.map(id => allUnits.find(u => u.id === id)).filter(Boolean),
    [allUnits, value]
  )

  // ドロップダウンの位置を計算
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 360
    // 下に十分なスペースがなければ上に表示
    const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow
    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      maxHeight: Math.min(dropdownHeight, showAbove ? rect.top - 8 : spaceBelow - 8),
    })
  }, [])

  // 開いた時に位置計算 + スクロール/リサイズ追従
  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, updatePosition])

  // 外側クリックで閉じる
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

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
    <div className="utp-root" ref={triggerRef}>
      {/* 選択済みタグ表示 + 開閉トリガー */}
      <div
        className={`utp-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedUnits.length === 0 ? (
          <span className="utp-placeholder">単元タグを選択（複数可）</span>
        ) : (
          <div className="utp-chips">
            {selectedUnits.map((unit, index) => (
              <span key={unit.id} className={`utp-chip${index === 0 ? ' utp-chip-main' : ''}`}>
                {index === 0 && <span className="utp-main-badge">メイン</span>}
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

      {/* ドロップダウン — portal で body 直下に描画 */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="utp-dropdown"
          style={dropdownStyle}
        >
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
        </div>,
        document.body
      )}
    </div>
  )
}

export default UnitTagPicker
