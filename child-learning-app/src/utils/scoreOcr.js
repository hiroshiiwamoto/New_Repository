const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// ── Gemini API 使用量トラッキング ──────────────────
const USAGE_STORAGE_KEY = 'gemini_api_usage'
const MONTHLY_LIMIT = 50 // 月間上限（回数）
const WARNING_THRESHOLD = 40 // 警告を出す回数

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getUsageData() {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveUsageData(data) {
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(data))
}

function recordApiCall() {
  const data = getUsageData()
  const monthKey = getCurrentMonthKey()
  if (!data[monthKey]) {
    data[monthKey] = { count: 0, calls: [] }
  }
  data[monthKey].count += 1
  data[monthKey].calls.push(new Date().toISOString())
  saveUsageData(data)
  return data[monthKey].count
}

/** 今月の使用状況を取得 */
export function getGeminiUsage() {
  const data = getUsageData()
  const monthKey = getCurrentMonthKey()
  const monthly = data[monthKey] || { count: 0, calls: [] }
  return {
    count: monthly.count,
    limit: MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - monthly.count),
    isWarning: monthly.count >= WARNING_THRESHOLD,
    isOverLimit: monthly.count >= MONTHLY_LIMIT,
    month: monthKey,
  }
}

const PROMPT = `この画像はSAPIXなど塾のテスト成績表です。「総合成績表」と「設問内容別成績表」の両方から数値を読み取り、JSON形式で返してください。
該当する行がない場合はそのキーを省略してください。数値のみ返し、「位」「名」「点」などの文字は含めないでください。

テスト名（testName）と学年（grade、例: "3年生"）も画像から読み取れる場合は含めてください。

■ テスト形式
- 3年生: 2科目（算数・国語）のみ → twoSubjects を使用
- 4年生以上: 4科目（算数・国語・理科・社会）＋ 2科目 → fourSubjects と twoSubjects の両方

■ 総合成績表の列構成（よくあるパターン）
パターンA: 科目 | 得点/配点 | 偏差値 | 順位/受験者数 | 平均点 | 男女別順位/受験者数
→ 同じ行に男女別順位が含まれる場合、そのデータを対応するGenderキーのrank/totalStudentsに入れてください。

パターンB: 科目 | 得点 | 平均点 | 偏差値 | 順位/人数（男女別は別セクション）

■ 設問内容別成績表
科目ごとに分野・設問の内訳が記載されている表です。各行に番号・分野名・得点/配点・平均点があります。
棒グラフが含まれる場合、グラフの値は無視し、数値データのみ読み取ってください。
4科目（算数・国語・理科・社会）すべてに対応してください。

■ 出力JSON形式（該当するキーのみ）
{
  "testName": "テスト名",
  "grade": "X年生",
  "fourSubjects": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "fourSubjectsGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "sansu": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "kokugo": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "rika": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "shakai": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "twoSubjects": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "twoSubjectsGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "sansuGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "kokugoGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "rikaGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "shakaiGender": { "score": 得点, "totalScore": 配点, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 受験者数 },
  "questionBreakdown": {
    "sansu": [
      { "number": 1, "name": "計算問題", "score": 54, "totalScore": 60, "average": 47.7 },
      { "number": 2, "name": "小問集合", "score": 24, "totalScore": 30, "average": 12.6 }
    ],
    "kokugo": [
      { "number": 1, "name": "漢字の読み書き", "score": 21, "totalScore": 30, "average": 23.3 }
    ],
    "rika": [...],
    "shakai": [...]
  }
}

■ 科目名マッピング
- "2科目計" / "2科目合計" → twoSubjects
- "4科目計" / "4科目合計" → fourSubjects
- "算数" / "算 数" → sansu
- "国語" / "国 語" → kokugo
- "理科" / "理 科" → rika
- "社会" / "社 会" → shakai
- 上記に "男女別" が付く場合 → 対応するGenderキー
- 同じ行に「男女別順位/受験者数」列がある場合 → 対応するGenderキーのrank, totalStudentsに入れる

■ 設問内容別のマッピング
- 設問内容別成績表の科目見出し（算数/国語/理科/社会）→ questionBreakdown の sansu/kokugo/rika/shakai
- 各行: 番号(number), 分野名(name), 得点(score)/配点(totalScore), 平均点(average)

■ 例（総合成績表 パターンA: 同一行に男女別列がある場合）
「2科目計 190/300 57.0 1252/5159 161.9 697/2826」
→ twoSubjects: { score:190, totalScore:300, deviation:57.0, rank:1252, totalStudents:5159, average:161.9 }
→ twoSubjectsGender: { rank:697, totalStudents:2826 }

■ 例（設問内容別成績表）
算数 1 計算問題 54/60 47.7 → questionBreakdown.sansu: [{ number:1, name:"計算問題", score:54, totalScore:60, average:47.7 }]

得点欄が "190 / 300" の形式は score=190, totalScore=300。
JSONのみ返してください。説明文は不要です。`

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractScoresFromImage(file) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini APIキーが設定されていません（VITE_GEMINI_API_KEY）')
  }

  // 使用量上限チェック
  const usage = getGeminiUsage()
  if (usage.isOverLimit) {
    throw new Error(`今月のGemini API使用上限（${MONTHLY_LIMIT}回）に達しました。来月まで画像読み取りは使用できません。`)
  }

  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/png'

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } }
        ]
      }]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API エラー: ${response.status} ${err}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // API呼び出し成功 → 使用量を記録
  recordApiCall()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('成績データを読み取れませんでした')
  }

  return JSON.parse(jsonMatch[0])
}
