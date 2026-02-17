/**
 * 弱点分析システム - TypeScript型定義
 *
 * Firestore / SQLite 共通の型定義
 */

import { Timestamp } from 'firebase/firestore';

// ========================================
// 1. 単元マスタ
// ========================================

/**
 * 単元マスタ
 */
export interface MasterUnit {
  /** 単元コードID (例: CALC_BASIC, SPEC_CONC) */
  id: string;

  /** 単元名 (例: 四則計算の基礎) */
  name: string;

  /** カテゴリ (計算, 特殊算, 図形, etc.) */
  category: MasterUnitCategory;

  /** 難易度 (1-5, 1が最も易しい) */
  difficultyLevel?: number;

  /** 説明・解説 */
  description?: string;

  /** 学習リソースURL */
  learningResources?: string[];

  /** 表示順序 */
  orderIndex: number;

  /** 有効/無効フラグ */
  isActive: boolean;

  /** 作成日時 */
  createdAt: Timestamp | string;

  /** 更新日時 */
  updatedAt: Timestamp | string;
}

/**
 * 単元マスタのカテゴリ
 */
export type MasterUnitCategory =
  | '計算'
  | '数の性質'
  | '規則性'
  | '特殊算'
  | '速さ'
  | '割合'
  | '比'
  | '平面図形'
  | '立体図形'
  | '場合の数'
  | 'グラフ・論理';

/**
 * 単元マスタ作成用（createdAt/updatedAtなし）
 */
export type MasterUnitInput = Omit<MasterUnit, 'createdAt' | 'updatedAt'>;

// ========================================
// 2. 過去問
// ========================================

/**
 * 過去問
 */
export interface Problem {
  /** 問題ID (例: kaisei_2024_001) */
  id: string;

  /** 学校名 (例: 開成中学校) */
  schoolName: string;

  /** 入試年度 (例: 2024) */
  examYear: number;

  /** 問題番号 (例: 大問1(2)) */
  problemNumber: string;

  /** 難易度 (1-5) */
  difficulty: number;

  /** 想定解答時間（分） */
  estimatedTime?: number;

  /** 問題文 */
  questionText?: string;

  /** 解答 */
  answer?: string;

  /** 解説 */
  solution?: string;

  /** 問題画像URL (Firebase Storage) */
  imageUrl?: string;

  /** 出典URL */
  sourceUrl?: string;

  /** 作成日時 */
  createdAt: Timestamp | string;

  /** 更新日時 */
  updatedAt: Timestamp | string;
}

/**
 * 過去問作成用
 */
export type ProblemInput = Omit<Problem, 'createdAt' | 'updatedAt'>;

// ========================================
// 3. 問題-単元 中間テーブル
// ========================================

/**
 * 問題と単元の関連
 */
export interface ProblemUnitTag {
  /** UUID */
  id: string;

  /** 問題ID */
  problemId: string;

  /** 単元ID (例: SPEC_CONC) */
  unitId: string;

  /** 関連度スコア (0.0-1.0) */
  relevanceScore: number;

  /** 作成日時 */
  createdAt: Timestamp | string;
}

/**
 * 問題-単元関連作成用
 */
export type ProblemUnitTagInput = Omit<ProblemUnitTag, 'id' | 'createdAt'>;

// ========================================
// 4. ユーザー
// ========================================

/**
 * ユーザー（生徒）
 */
export interface User {
  /** Firebase Auth UID */
  id: string;

  /** メールアドレス */
  email?: string;

  /** 表示名 */
  displayName?: string;

  /** 学年 (小3, 小4, 小5, 小6) */
  grade?: Grade;

  /** 志望校リスト */
  targetSchools?: string[];

  /** プロフィール画像URL */
  avatarUrl?: string;

  /** 作成日時 */
  createdAt: Timestamp | string;

  /** 更新日時 */
  updatedAt: Timestamp | string;
}

/**
 * 学年
 */
export type Grade = '小3' | '小4' | '小5' | '小6';

/**
 * ユーザー作成用
 */
export type UserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// ========================================
// 5. 解答履歴
// ========================================

/**
 * 解答履歴
 */
export interface AnswerHistory {
  /** UUID */
  id: string;

  /** ユーザーID */
  userId: string;

  /** 問題ID */
  problemId: string;

  /** 正解/不正解 */
  isCorrect: boolean;

  /** 生徒の解答 */
  userAnswer?: string;

  /** 解答時間（秒） */
  timeSpent?: number;

  /** 自信度 (1-5, 5が最も自信あり) */
  confidenceLevel?: number;

  /** メモ */
  notes?: string;

  /** 解答日時 */
  answeredAt: Timestamp | string;

  /** 作成日時 */
  createdAt: Timestamp | string;
}

/**
 * 解答履歴作成用
 */
export type AnswerHistoryInput = Omit<AnswerHistory, 'id' | 'createdAt'>;

// ========================================
// 6. ユーザー弱点スコア（集計テーブル）
// ========================================

/**
 * ユーザー弱点スコア
 */
export interface UserWeaknessScore {
  /** UUID */
  id: string;

  /** ユーザーID */
  userId: string;

  /** 単元ID (例: SPEC_CONC) */
  unitId: string;

  /** 挑戦回数 */
  totalAttempts: number;

  /** 正解数 */
  correctCount: number;

  /** 正答率 (0.0-1.0) */
  accuracyRate: number;

  /** 平均解答時間（秒） */
  avgTimeSpent?: number;

  /** 最終挑戦日時 */
  lastAttemptedAt?: Timestamp | string;

  /** 弱点レベル (0-5, 0=弱点なし, 5=致命的な弱点) */
  weaknessLevel: number;

  /** 作成日時 */
  createdAt: Timestamp | string;

  /** 更新日時 */
  updatedAt: Timestamp | string;
}

/**
 * 弱点レベル
 */
export type WeaknessLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 弱点レベルの計算
 */
export function calculateWeaknessLevel(
  accuracyRate: number,
  totalAttempts: number
): WeaknessLevel {
  if (totalAttempts < 3) return 0; // データ不足

  if (accuracyRate >= 0.9) return 0; // 弱点なし
  if (accuracyRate >= 0.7) return 1; // 軽度の弱点
  if (accuracyRate >= 0.5) return 2; // 中程度の弱点
  if (accuracyRate >= 0.3) return 3; // 重度の弱点
  if (accuracyRate >= 0.1) return 4; // 非常に重度の弱点
  return 5; // 致命的な弱点
}

// ========================================
// 7. レコメンド履歴
// ========================================

/**
 * レコメンド履歴
 */
export interface RecommendationHistory {
  /** UUID */
  id: string;

  /** ユーザーID */
  userId: string;

  /** レコメンド単元ID (例: ["SPEC_CONC", "RATIO_CALC"]) */
  recommendedUnitIds: string[];

  /** レコメンド問題ID */
  recommendedProblems: string[];

  /** レコメンド理由 */
  reasoning?: string;

  /** ユーザーが受け入れたか */
  accepted?: boolean;

  /** ユーザーフィードバック */
  feedback?: string;

  /** 作成日時 */
  createdAt: Timestamp | string;
}

/**
 * レコメンド履歴作成用
 */
export type RecommendationHistoryInput = Omit<RecommendationHistory, 'id' | 'createdAt'>;

// ========================================
// 集計・分析用の型
// ========================================

/**
 * 単元マスタと詳細スコアの組み合わせ
 */
export interface MasterUnitWithScore extends MasterUnit {
  /** ユーザー弱点スコア */
  score?: UserWeaknessScore;
}

/**
 * 問題と関連単元の組み合わせ
 */
export interface ProblemWithUnits extends Problem {
  /** 関連単元 */
  units: Array<{
    unit: MasterUnit;
    relevanceScore: number;
  }>;
}

/**
 * 弱点分析結果
 */
export interface WeaknessAnalysis {
  /** ユーザーID */
  userId: string;

  /** 全体の正答率 */
  overallAccuracy: number;

  /** 総解答数 */
  totalAnswers: number;

  /** 弱点単元（弱点レベル順） */
  weaknessUnits: MasterUnitWithScore[];

  /** 推奨学習単元（上位5件） */
  recommendedUnits: MasterUnitWithScore[];

  /** 分析日時 */
  analyzedAt: Timestamp | string;
}

/**
 * カテゴリ別の統計
 */
export interface CategoryStats {
  /** カテゴリ名 */
  category: MasterUnitCategory;

  /** 総解答数 */
  totalAttempts: number;

  /** 正解数 */
  correctCount: number;

  /** 正答率 */
  accuracyRate: number;

  /** 平均難易度 */
  avgDifficulty: number;
}

// ========================================
// フロントエンド用の表示型
// ========================================

/**
 * 弱点ダッシュボード用データ
 */
export interface WeaknessDashboard {
  /** 全体統計 */
  overallStats: {
    totalProblemsAttempted: number;
    correctCount: number;
    accuracyRate: number;
    totalTimeSpent: number; // 秒
  };

  /** カテゴリ別統計 */
  categoryStats: CategoryStats[];

  /** 最近の解答履歴（直近10件） */
  recentAnswers: Array<AnswerHistory & { problem: Problem }>;

  /** 弱点単元（上位10件） */
  topWeaknesses: MasterUnitWithScore[];

  /** 推奨学習プラン */
  recommendedLearning: {
    units: MasterUnitWithScore[];
    problems: ProblemWithUnits[];
  };
}

// ========================================
// APIリクエスト/レスポンス型
// ========================================

/**
 * 解答送信リクエスト
 */
export interface SubmitAnswerRequest {
  problemId: string;
  isCorrect: boolean;
  userAnswer?: string;
  timeSpent?: number;
  confidenceLevel?: number;
  notes?: string;
}

/**
 * 弱点分析リクエスト
 */
export interface AnalyzeWeaknessRequest {
  userId: string;
  fromDate?: string; // ISO 8601
  toDate?: string;   // ISO 8601
}

/**
 * レコメンド取得リクエスト
 */
export interface GetRecommendationsRequest {
  userId: string;
  limit?: number;
  targetDifficulty?: number;
}

/**
 * レコメンドレスポンス
 */
export interface GetRecommendationsResponse {
  recommendedUnits: MasterUnitWithScore[];
  recommendedProblems: ProblemWithUnits[];
  reasoning: string;
}
