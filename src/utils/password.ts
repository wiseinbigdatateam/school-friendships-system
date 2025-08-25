import bcrypt from 'bcryptjs';

// 패스워드 해시 생성
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12; // 보안성을 위해 12 rounds 사용
  return await bcrypt.hash(password, saltRounds);
};

// 패스워드 검증
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// 기본 패스워드 해시 (데모 환경용)
export const getDefaultPasswordHash = async (): Promise<string> => {
  return await hashPassword('password123');
};
