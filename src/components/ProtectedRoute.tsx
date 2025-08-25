import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: 'main_admin' | 'district_admin' | 'school_admin' | 'grade_teacher' | 'homeroom_teacher' | ('main_admin' | 'district_admin' | 'school_admin' | 'grade_teacher' | 'homeroom_teacher')[];
}

// 역할명을 사용자 친화적인 이름으로 변환
const getRoleDisplayName = (role: string): string => {
  const roleNames: Record<string, string> = {
    'main_admin': '메인관리자',
    'district_admin': '교육청 관리자',
    'school_admin': '학교 관리자',
    'grade_teacher': '학년 부장',
    'homeroom_teacher': '담임교사'
  };
  return roleNames[role] || role;
};

// 권한명을 사용자 친화적인 이름으로 변환
const getPermissionDisplayName = (permission: string): string => {
  const permissionNames: Record<string, string> = {
    'read_students': '학생 정보 조회',
    'write_students': '학생 정보 수정',
    'read_surveys': '설문 조회',
    'write_surveys': '설문 관리',
    'read_analysis': '분석 결과 조회',
    'write_memos': '메모 작성',
    'manage_school': '학교 관리',
    'view_reports': '리포트 조회',
    'manage_district': '교육청 관리',
    'transfer_data': '데이터 이관'
  };
  return permissionNames[permission] || permission;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermissions = [],
  requiredRole 
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 로딩 중일 때 스피너 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 필요한 역할 권한 확인
  if (requiredRole) {
    console.log('=== ProtectedRoute 권한 검증 ===');
    console.log('ProtectedRoute - requiredRole:', requiredRole);
    console.log('ProtectedRoute - user.role:', user.role);
    console.log('ProtectedRoute - user:', user);
    console.log('ProtectedRoute - Array.isArray(requiredRole):', Array.isArray(requiredRole));
    
    // 실제 권한 검증
    const hasRequiredRole = Array.isArray(requiredRole) 
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;
    
    console.log('ProtectedRoute - hasRequiredRole:', hasRequiredRole);
    console.log('ProtectedRoute - requiredRole.includes(user.role):', Array.isArray(requiredRole) ? requiredRole.includes(user.role) : 'N/A');
    console.log('ProtectedRoute - user.role === requiredRole:', !Array.isArray(requiredRole) ? user.role === requiredRole : 'N/A');
    console.log('================================');
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h2>
              <p className="text-gray-600 mb-4">
                이 페이지에 접근하려면 {Array.isArray(requiredRole) 
                  ? requiredRole.map(role => getRoleDisplayName(role)).join(' 또는 ')
                  : getRoleDisplayName(requiredRole)
                } 권한이 필요합니다.
              </p>
              <button
                onClick={() => window.history.back()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                이전 페이지로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 필요한 세부 권한 확인
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requiredPermissions.every(
      permission => user.permissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">권한이 부족합니다</h2>
              <p className="text-gray-600 mb-4">
                이 기능을 사용하려면 추가 권한이 필요합니다. 시스템 관리자에게 문의하세요.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">필요한 권한:</p>
                <ul className="text-sm text-gray-700 list-disc list-inside">
                  {requiredPermissions.map(permission => (
                    <li key={permission}>{getPermissionDisplayName(permission)}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => window.history.back()}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                이전 페이지로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 모든 권한 검사를 통과한 경우 children 렌더링
  return <>{children}</>;
};

export default ProtectedRoute;
