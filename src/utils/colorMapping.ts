// 네트워크 시각화용 색상 매핑 상수 (Python API 실제 반환값에 맞춤)
export const FRIENDSHIP_TYPE_COLORS: { [key: string]: string } = {
  '외톨이형': '#FFA500', // 주황색 (RGB: 255, 165, 0)
  '소수 친구 학생': '#FFD700', // 금색 (RGB: 255, 215, 0) - Python API 실제 반환값
  '평균적인 학생': '#00BFFF', // 밝은 파란색 (RGB: 0, 191, 255) - Python API 실제 반환값
  '친구 많은 학생': '#4169E1', // 진한 파란색 (RGB: 65, 105, 225) - Python API 실제 반환값
  '사교 스타': '#32CD32'
};

// 친구 관계 유형 목록 (Python API 실제 반환값 기준)
export const FRIENDSHIP_TYPES = [
  '외톨이형',
  '소수 친구 학생', 
  '평균적인 학생',
  '친구 많은 학생',
  '사교 스타'
] as const;
