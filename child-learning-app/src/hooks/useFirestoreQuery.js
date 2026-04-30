import { useState, useEffect, useCallback } from 'react'

/**
 * Firestore データ取得の共通フック
 * @param {Function} queryFn - () => Promise<{ success, data, error }> 形式の取得関数
 * @param {Array} deps - useEffect の依存配列（queryFn の再生成トリガー）
 * @returns {{ data: any, loading: boolean, error: string|null, reload: Function }}
 */
export function useFirestoreQuery(queryFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 汎用フックのため、deps は呼び出し側から受け取る設計
  // （React 公式の useCallback / useMemo / useEffect と同じパターン）。
  // queryFn は deps が指す値で再生成されることを呼び出し側に期待しているため
  // queryFn 自体は deps から除外する。呼び出し側の deps 妥当性は eslint
  // 設定の additionalHooks で別途検査。
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      if (result === null) {
        // queryFn returned null (e.g., no user) — skip
        setLoading(false)
        return
      }
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'データ取得に失敗しました')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
