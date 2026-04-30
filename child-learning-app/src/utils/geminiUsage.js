// Gemini API 使用量集計（Firestore 同期＋インメモリキャッシュ）
//
// localStorage 版はストレージクリア・シークレットウィンドウ・別デバイスで
// カウントがリセットされ課金暴走の原因になりうるため、
// users/{uid}/usage/gemini に集約して同一ユーザー内で一貫した上限管理を行う。
//
// getGeminiUsage() の同期シグネチャを維持するため、Firestore からは
// onSnapshot で常に同期したインメモリキャッシュを参照する設計。

import { auth, db } from '../firebase'
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

let _cache = { months: {} }
let _unsubscribe = null
let _subscribedUid = null

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function usageRef(uid) {
  return doc(db, 'users', uid, 'usage', 'gemini')
}

/**
 * 指定ユーザーの usage ドキュメントを購読しキャッシュを更新する。
 * 同じ uid で重複購読しないよう冪等に実装。
 * @param {string|null} uid - ログイン中ユーザーID。null/undefined ならクリーンアップのみ
 * @returns {Function|null} unsubscribe
 */
export function subscribeGeminiUsage(uid) {
  if (_subscribedUid === uid) return _unsubscribe
  if (_unsubscribe) {
    try { _unsubscribe() } catch { /* ignore */ }
    _unsubscribe = null
  }
  _subscribedUid = uid || null
  _cache = { months: {} }
  if (!uid) return null

  _unsubscribe = onSnapshot(
    usageRef(uid),
    (snap) => {
      const data = snap.data()
      _cache = { months: data?.months || {} }
    },
    (err) => {
      console.error('Gemini usage subscribe error:', err)
    }
  )
  return _unsubscribe
}

/** 当月の使用回数を同期取得（未購読・未ロード時は 0） */
export function getCachedGeminiCount() {
  return _cache.months?.[getCurrentMonthKey()]?.count ?? 0
}

/**
 * API 呼び出しを 1 回分記録する。
 * 1) インメモリキャッシュを楽観的に +1（即時 UI 反映）
 * 2) Firestore トランザクションで原子的に +1（onSnapshot で正規化）
 * 失敗しても呼び出し元には例外を伝播させない（API 結果を破棄しないため）。
 */
export async function recordGeminiCall() {
  const uid = auth.currentUser?.uid
  if (!uid) return

  const monthKey = getCurrentMonthKey()
  const cur = _cache.months?.[monthKey]?.count ?? 0
  _cache = {
    months: {
      ..._cache.months,
      [monthKey]: { ...(_cache.months?.[monthKey] || {}), count: cur + 1 },
    },
  }

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(usageRef(uid))
      const data = snap.exists() ? snap.data() : {}
      const remoteCur = data?.months?.[monthKey]?.count ?? 0
      tx.set(
        usageRef(uid),
        {
          months: {
            ...(data?.months || {}),
            [monthKey]: { count: remoteCur + 1, lastCallAt: serverTimestamp() },
          },
        },
        { merge: true }
      )
    })
  } catch (err) {
    console.error('Gemini usage record error:', err)
  }
}
