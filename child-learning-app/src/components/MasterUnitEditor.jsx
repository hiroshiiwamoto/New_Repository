import { useState, useEffect } from 'react'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import './MasterUnitEditor.css'

const CATEGORIES = ['計算', '数の性質', '規則性', '特殊算', '速さ', '割合', '比', '平面図形', '立体図形', '場合の数', 'グラフ・論理']

const EMPTY_FORM = {
  id: '',
  name: '',
  category: '計算',
  difficultyLevel: 3,
  description: '',
  orderIndex: 0,
  isActive: true,
}

function MasterUnitEditor() {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [modal, setModal] = useState(null) // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingDocId, setEditingDocId] = useState(null)

  useEffect(() => {
    loadUnits()
  }, [])

  const loadUnits = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'masterUnits'), orderBy('orderIndex'))
      const snapshot = await getDocs(q)
      setUnits(snapshot.docs.map(d => ({ docId: d.id, ...d.data() })))
    } catch (err) {
      console.error('マスター単元取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    const maxOrder = units.reduce((m, u) => Math.max(m, u.orderIndex || 0), 0)
    setForm({ ...EMPTY_FORM, orderIndex: maxOrder + 10 })
    setEditingDocId(null)
    setModal('add')
  }

  const handleOpenEdit = (unit) => {
    setForm({
      id: unit.id || '',
      name: unit.name || '',
      category: unit.category || '計算',
      difficultyLevel: unit.difficultyLevel || 3,
      description: unit.description || '',
      orderIndex: unit.orderIndex || 0,
      isActive: unit.isActive !== false,
    })
    setEditingDocId(unit.docId)
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('単元名を入力してください')
      return
    }

    setSaving(true)
    try {
      const data = {
        id: form.id.trim() || null,
        name: form.name.trim(),
        category: form.category,
        difficultyLevel: parseInt(form.difficultyLevel),
        description: form.description.trim(),
        orderIndex: parseInt(form.orderIndex) || 0,
        isActive: form.isActive,
        updatedAt: serverTimestamp(),
      }

      if (modal === 'add') {
        // 新規追加: id が指定されていれば setDoc、なければ addDoc
        if (data.id) {
          const ref = doc(db, 'masterUnits', data.id)
          await setDoc(ref, { ...data, createdAt: serverTimestamp() })
        } else {
          delete data.id
          await addDoc(collection(db, 'masterUnits'), { ...data, createdAt: serverTimestamp() })
        }
      } else {
        // 更新
        const ref = doc(db, 'masterUnits', editingDocId)
        await updateDoc(ref, data)
      }

      setModal(null)
      await loadUnits()
    } catch (err) {
      console.error('保存エラー:', err)
      alert('保存に失敗しました: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (unit) => {
    if (!confirm(`「${unit.name}」を削除しますか？\nこの操作は取り消せません。`)) return

    try {
      await deleteDoc(doc(db, 'masterUnits', unit.docId))
      await loadUnits()
    } catch (err) {
      console.error('削除エラー:', err)
      alert('削除に失敗しました')
    }
  }

  const handleToggleActive = async (unit) => {
    try {
      await updateDoc(doc(db, 'masterUnits', unit.docId), {
        isActive: !unit.isActive,
        updatedAt: serverTimestamp(),
      })
      await loadUnits()
    } catch (err) {
      console.error('更新エラー:', err)
    }
  }

  const filteredUnits = selectedCategory === 'all'
    ? units
    : units.filter(u => u.category === selectedCategory)

  const categories = ['all', ...CATEGORIES]

  if (loading) {
    return <div className="mue-loading">マスター単元を読み込み中...</div>
  }

  return (
    <div className="master-unit-editor">
      <div className="mue-header">
        <div className="mue-stats">
          <span>{units.length} 単元 / {units.filter(u => u.isActive !== false).length} 有効</span>
        </div>
        <button className="mue-add-btn" onClick={handleOpenAdd}>
          ＋ 単元を追加
        </button>
      </div>

      {/* カテゴリフィルター */}
      <div className="mue-filter">
        {categories.map(cat => (
          <button
            key={cat}
            className={`mue-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? '全て' : cat}
          </button>
        ))}
      </div>

      {/* 単元リスト */}
      <div className="mue-list">
        {filteredUnits.map(unit => (
          <div
            key={unit.docId}
            className={`mue-item ${unit.isActive === false ? 'inactive' : ''}`}
          >
            <div className="mue-item-main">
              <div className="mue-item-info">
                <span className="mue-item-name">{unit.name}</span>
                {unit.id && (
                  <span className="mue-item-id">{unit.id}</span>
                )}
                <span className="mue-item-cat">{unit.category}</span>
                <span className="mue-item-diff">
                  {'★'.repeat(unit.difficultyLevel || 1)}{'☆'.repeat(5 - (unit.difficultyLevel || 1))}
                </span>
              </div>
              {unit.description && (
                <div className="mue-item-desc">{unit.description}</div>
              )}
            </div>
            <div className="mue-item-actions">
              <button
                className={`mue-toggle-btn ${unit.isActive === false ? 'off' : 'on'}`}
                onClick={() => handleToggleActive(unit)}
                title={unit.isActive === false ? '有効にする' : '無効にする'}
              >
                {unit.isActive === false ? '無効' : '有効'}
              </button>
              <button className="mue-edit-btn" onClick={() => handleOpenEdit(unit)}>
                編集
              </button>
              <button className="mue-delete-btn" onClick={() => handleDelete(unit)}>
                削除
              </button>
            </div>
          </div>
        ))}

        {filteredUnits.length === 0 && (
          <div className="mue-empty">
            {units.length === 0
              ? 'まだ単元がありません。「＋ 単元を追加」から追加してください。'
              : 'このカテゴリの単元がありません。'}
          </div>
        )}
      </div>

      {/* 追加/編集モーダル */}
      {modal && (
        <div className="mue-modal-overlay" onClick={() => setModal(null)}>
          <div className="mue-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'add' ? '＋ 単元を追加' : '✏️ 単元を編集'}</h3>

            <div className="mue-form">
              <div className="mue-form-row">
                <label>単元名 <span className="required">*</span></label>
                <input
                  className="mue-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例: 四則計算の基礎"
                />
              </div>

              <div className="mue-form-row">
                <label>単元ID（省略可）</label>
                <input
                  className="mue-input"
                  value={form.id}
                  onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))}
                  placeholder="例: CALC_BASIC"
                  disabled={modal === 'edit'}
                />
                {modal === 'add' && (
                  <p className="mue-hint">省略時は自動採番。英大文字・アンダースコア推奨</p>
                )}
              </div>

              <div className="mue-form-row">
                <label>カテゴリ <span className="required">*</span></label>
                <select
                  className="mue-select"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="mue-form-row">
                <label>難易度</label>
                <div className="mue-difficulty">
                  {[1, 2, 3, 4, 5].map(lv => (
                    <button
                      key={lv}
                      className={`mue-diff-btn ${form.difficultyLevel >= lv ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, difficultyLevel: lv }))}
                    >★</button>
                  ))}
                  <span className="mue-diff-label">
                    {['', '基礎', '標準', '応用', '発展', '難関'][form.difficultyLevel]}
                  </span>
                </div>
              </div>

              <div className="mue-form-row">
                <label>説明</label>
                <textarea
                  className="mue-textarea"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="単元の説明（任意）"
                  rows={2}
                />
              </div>

              <div className="mue-form-row">
                <label>表示順序</label>
                <input
                  type="number"
                  className="mue-input"
                  value={form.orderIndex}
                  onChange={e => setForm(f => ({ ...f, orderIndex: e.target.value }))}
                />
              </div>
            </div>

            <div className="mue-modal-actions">
              <button className="mue-btn-cancel" onClick={() => setModal(null)} disabled={saving}>
                キャンセル
              </button>
              <button className="mue-btn-save" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MasterUnitEditor
