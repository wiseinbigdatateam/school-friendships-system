import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../utils/index';
import { User } from '../types';
import { verifyPassword } from '../utils/password';

// 인증 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 커스텀 훅
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider 컴포넌트 props
interface AuthProviderProps {
  children: ReactNode;
}

// 이제 모든 사용자 데이터는 Supabase 데이터베이스에서 로드됩니다

// AuthProvider 컴포넌트
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 로컬 스토리지에서 인증 상태 확인
  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // 로컬 스토리지에서 사용자 정보 확인
      const storedUser = localStorage.getItem('wiseon_user');
      const authToken = localStorage.getItem('wiseon_auth_token');
      
      if (storedUser && authToken) {
        const userData = JSON.parse(storedUser);
        
        // 토큰 유효성 검사 (실제로는 서버에서 검증)
        const tokenExpiry = localStorage.getItem('wiseon_token_expiry');
        if (tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
          setUser(userData);
        } else {
          // 토큰 만료 시 로그아웃
          logout();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그인 함수
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      // 데이터베이스에서 사용자 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          role,
          permissions,
          grade_level,
          class_number,
          department,
          contact_info,
          school_id,
          district_id,
          is_active,
          password_hash
        `)
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        throw new Error('등록되지 않은 이메일입니다.');
      }

      // 사용자 계정 상태 확인
      if (!userData.is_active) {
        throw new Error('계정이 비활성화되어 있습니다. 관리자에게 문의하여 계정을 활성화해주세요.');
      }

      // bcrypt를 사용한 패스워드 검증
      if (!userData.password_hash) {
        throw new Error('사용자 패스워드가 설정되지 않았습니다. 관리자에게 문의하세요.');
      }
      
      const isValidPassword = await verifyPassword(password, userData.password_hash);
      if (!isValidPassword) {
        throw new Error('비밀번호가 올바르지 않습니다.');
      }

      // Supabase 데이터를 User 타입으로 변환
      const user: User = {
        id: userData.id,
        schoolId: userData.school_id || '', // 기존 호환성을 위한 필드
        school_id: userData.school_id, // Supabase users 테이블의 실제 컬럼명
        name: userData.name,
        email: userData.email,
        phone: userData.contact_info?.phone || '',
        role: userData.role,
        permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
        grade: userData.grade_level,
        class: userData.class_number,
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: userData.is_active
      };

      // 디버깅: 로그인 시 사용자 정보 로그
      console.log('🔐 로그인 성공 - 사용자 정보:', {
        id: user.id,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        school_id: user.school_id,
        grade: user.grade,
        class: user.class
      });

      // 사용자 정보와 토큰을 로컬 스토리지에 저장
      const authToken = `db_token_${Date.now()}`;
      const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24시간

      localStorage.setItem('wiseon_user', JSON.stringify(user));
      localStorage.setItem('wiseon_auth_token', authToken);
      localStorage.setItem('wiseon_token_expiry', tokenExpiry.toString());

      // 마지막 로그인 시간 업데이트
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      setUser(user);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수
  const logout = (): void => {
    // 로컬 스토리지에서 인증 정보 제거
    localStorage.removeItem('wiseon_user');
    localStorage.removeItem('wiseon_auth_token');
    localStorage.removeItem('wiseon_token_expiry');
    
    setUser(null);
    
    // 실제 구현에서는 Supabase Auth 사용
    // await supabase.auth.signOut();
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
