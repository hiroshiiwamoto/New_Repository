const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const PROMPT = `この画像はSAPIXなど塾のテスト成績表です。表から数値を読み取り、以下のJSON形式で返してください。
該当する行がない場合はそのキーを省略してください。数値のみ返し、「位」「名」「点」などの文字は含めないでください。

また、テスト名（testName）と学年（grade、例: "3年生"）も画像から読み取れる場合は含めてください。

{
  "testName": "テスト名",
  "grade": "X年生",
  "fourSubjects": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "fourSubjectsGender": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "sansu": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "kokugo": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "rika": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "shakai": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "twoSubjects": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "twoSubjectsGender": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "sansuGender": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 },
  "kokugoGender": { "score": 得点, "totalScore": 合計, "average": 平均点, "deviation": 偏差値, "rank": 順位, "totalStudents": 人数 }
}

科目のマッピング:
- "2科目合計" → twoSubjects
- "4科目合計" → fourSubjects
- "男女別2科目合計" → twoSubjectsGender
- "男女別4科目合計" → fourSubjectsGender
- "算数" → sansu
- "国語" → kokugo
- "理科" → rika
- "社会" → shakai
- "男女別算数" → sansuGender
- "男女別国語" → kokugoGender

得点欄が "137 / 200" のような形式の場合、score=137, totalScore=200 としてください。
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

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('成績データを読み取れませんでした')
  }

  return JSON.parse(jsonMatch[0])
}
