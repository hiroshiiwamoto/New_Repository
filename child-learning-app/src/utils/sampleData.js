// SAPIX 学習スケジュールデータ（単元ID対応版）

// 新三年生 1月～3月 サンプルスケジュール
export const generateGrade3Schedule = () => {
  return [];
};

// 新四年生 1月～3月 サンプルスケジュール
export const generateGrade4Schedule = () => {
  return [];
};

// 学年を指定してスケジュールを生成
export const generateSAPIXScheduleByGrade = (grade = '4年生') => {
  switch (grade) {
    case '3年生':
      return generateGrade3Schedule();
    case '4年生':
      return generateGrade4Schedule();
    default:
      return generateGrade4Schedule(); // デフォルトは4年生
  }
};

// 後方互換性のため、デフォルトエクスポートは4年生のスケジュール
export const generateSAPIXSchedule = generateGrade4Schedule;
