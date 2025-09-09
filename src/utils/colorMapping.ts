// 네트워크 시각화용 색상 매핑 상수 (Python API 실제 반환값에 맞춤)
export const FRIENDSHIP_TYPE_COLORS: { [key: string]: string } = {
  외톨이형: "#FF6B6B", // 주황색 (RGB: 255, 165, 0)
  "소수 친구 학생": "#4ECDC4", // 금색 (RGB: 255, 215, 0) - Python API 실제 반환값
  "평균적인 학생": "#45B7D1", // 밝은 파란색 (RGB: 0, 191, 255) - Python API 실제 반환값
  "친구 많은 학생": "#96CEB4", // 진한 파란색 (RGB: 65, 105, 225) - Python API 실제 반환값
  "사교 스타": "#FFEAA7",
};

// 친구 관계 유형 목록 (Python API 실제 반환값 기준)
export const FRIENDSHIP_TYPES = [
  "외톨이형",
  "소수 친구 학생",
  "평균적인 학생",
  "친구 많은 학생",
  "사교 스타",
] as const;
