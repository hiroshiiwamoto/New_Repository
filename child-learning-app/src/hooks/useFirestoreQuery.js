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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
