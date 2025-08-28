import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import bcryptjs from 'bcryptjs';
import * as XLSX from 'xlsx';
import { 
  UserPlusIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon
} from '@heroicons/react/24/outline/index.js';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  school_id?: string | null;
  district_id?: string | null;
  school_name?: string;
  grade_level?: string | null;
  class_number?: string | null;
  is_active: boolean;
  created_at: string | null;
  last_login?: string | null;
}

interface School {
  id: string;
  name: string;
  address?: string | null;
  code?: string;
  contact_info?: any;
  district_id?: string | null;
  established_date?: string | null;
  is_active?: boolean | null;
  school_type?: string;
  updated_at?: string | null;
  created_at?: string | null;
}

interface District {
  id: string;
  name: string;
  code: string;
}

interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: string;
  school_id?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  created_at: string | null;
  user: User;
  school?: School;
}

const Admin: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'schools'>('users');
  
  // 모달 상태
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [roleGrantModalOpen, setRoleGrantModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'homeroom_teacher',
    school_id: '',
    district_id: '',
    grade_level: '1',
    class_number: '1'
  });
  const [newSchoolData, setNewSchoolData] = useState({
    name: '',
    code: '',
    address: '',
    school_type: 'elementary',
    district_id: ''
  });
  const [roleGrantData, setRoleGrantData] = useState({
    targetUserId: '',
    newRole: '',
    school_id: '',
    grade_level: '',
    class_number: '',
    reason: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [excelUploadModalOpen, setExcelUploadModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // 엑셀 파일 처리 함수들
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
      file.type === 'application/vnd.ms-excel' || // .xls
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls')
    )) {
      setExcelFile(file);
    } else {
      toast.error('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
    }
  };

  const downloadTemplate = () => {
    const headers = ['이메일', '이름', '패스워드', '역할', '학교명', '교육청명', '학년', '반'];
    const sampleData = [
      'teacher@school.com',
      '김선생',
      'pass1234',
      '담임교사',
      '와이즈인초등학교',
      '와이즈인컴퍼니',
      '3',
      '2'
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 샘플 데이터를 워크시트로 변환
    const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleData]);
    
    // 컬럼 너비 자동 조정
    const columnWidths = headers.map(header => ({ wch: Math.max(header.length, 15) }));
    worksheet['!cols'] = columnWidths;
    
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, '사용자 목록');
    
    // 엑셀 파일 다운로드
    XLSX.writeFile(workbook, '사용자_목록_템플릿.xlsx');
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      toast.error('파일을 선택해주세요.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('currentUserRole', currentUser?.role || '');
      formData.append('currentUserSchoolId', currentUser?.school_id || '');
      formData.append('currentUserDistrictId', currentUser?.district_id || '');

      // 엑셀 파일 읽기
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 첫 번째 워크시트 가져오기
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('엑셀 파일에 데이터가 충분하지 않습니다.');
      }
      
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      // 데이터 파싱 및 검증
      const users = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
          const userData: any = {};
          
          headers.forEach((header, index) => {
            userData[header] = row[index] || '';
          });

          // 필수 필드 검증
          if (!userData['이메일'] || !userData['이름'] || !userData['패스워드'] || !userData['역할']) {
            continue; // 필수 필드가 없으면 건너뛰기
          }

          // 역할 매핑
          const roleMap: { [key: string]: string } = {
            '담임교사': 'homeroom_teacher',
            '학년부장': 'grade_teacher',
            '학교관리자': 'school_admin',
            '교육청관리자': 'district_admin'
          };

          const role = roleMap[userData['역할']] || userData['역할'];

          // 학교 ID 찾기
          let schoolId = null;
          if (userData['학교명']) {
            const school = schools.find(s => s.name === userData['학교명']);
            schoolId = school?.id || null;
          }

          // 교육청 ID 찾기
          let districtId = null;
          if (userData['교육청명']) {
            const district = districts.find(d => d.name === userData['교육청명']);
            districtId = district?.id || null;
          }

          users.push({
            email: userData['이메일'],
            name: userData['이름'],
            password: userData['패스워드'],
            role: role,
            school_id: schoolId,
            district_id: districtId,
            grade_level: userData['학년'] || null,
            class_number: userData['반'] || null
          });
        }
      }

      // 사용자 생성
      let successCount = 0;
      for (let i = 0; i < users.length; i++) {
        try {
          const user = users[i];
          
          // 패스워드 해시화
          const saltRounds = 10;
          const hashedPassword = await bcryptjs.hash(user.password, saltRounds);

          const { error } = await supabase
            .from('users')
            .insert([{
              email: user.email,
              name: user.name,
              password_hash: hashedPassword,
              role: user.role,
              school_id: user.school_id,
              district_id: user.district_id,
              grade_level: user.grade_level,
              class_number: user.class_number,
              is_active: true,
              employee_id: `EMP_${Date.now()}_${i}`,
              contact_info: {},
              department: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (!error) {
            successCount++;
          }

          setUploadProgress(((i + 1) / users.length) * 100);
        } catch (error) {
          console.error(`사용자 ${users[i].email} 생성 오류:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount}명의 사용자가 성공적으로 생성되었습니다.`);
        setExcelUploadModalOpen(false);
        setExcelFile(null);
        fetchData(); // 데이터 새로고침
      } else {
        toast.error('사용자 생성에 실패했습니다.');
      }

    } catch (error) {
      console.error('엑셀 업로드 오류:', error);
      toast.error('엑셀 파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const userStr = localStorage.getItem('wiseon_user');
      const authToken = localStorage.getItem('wiseon_auth_token');
      
      if (!userStr || !authToken) {
        window.location.href = '/login';
        return;
      }
      
      const user = JSON.parse(userStr);
      
      // Supabase에서 최신 사용자 정보 조회
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      // 메인관리자, 교육청관리자, 학교관리자만 접근 가능
      if (!['main_admin', 'district_admin', 'school_admin'].includes(userData.role)) {
        toast.error('관리자 권한이 필요합니다.');
        window.history.back();
        return;
      }
      
      setCurrentUser(userData);
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      window.location.href = '/login';
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 사용자 목록 조회
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          schools!users_school_id_fkey(name)
        `)
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      
      const processedUsers = usersData?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        school_id: user.school_id,
        district_id: user.district_id,
        school_name: user.schools?.name,
        grade_level: user.grade_level,
        class_number: user.class_number,
        is_active: user.is_active === null ? false : user.is_active,
        created_at: user.created_at || '',
        last_login: user.last_login
      })) || [];
      
      setUsers(processedUsers);
      
      // 학교 목록 조회 (권한에 따라 필터링)
      let schoolsQuery = supabase
        .from('schools')
        .select('*')
        .order('name', { ascending: true });
      
      // 교육청 관리자는 해당 교육청의 학교만 조회
      if (currentUser?.role === 'district_admin' && currentUser.district_id) {
        schoolsQuery = schoolsQuery.eq('district_id', currentUser.district_id);
      }
      
      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      
      if (schoolsError) throw schoolsError;
      
      const processedSchools = schoolsData?.map(school => ({
        id: school.id,
        name: school.name,
        address: school.address,
        code: school.code,
        contact_info: school.contact_info,
        district_id: school.district_id,
        established_date: school.established_date,
        is_active: school.is_active,
        school_type: school.school_type,
        updated_at: school.updated_at,
        created_at: school.created_at
      })) || [];
      
      setSchools(processedSchools);
      
      // 교육청 목록 조회
      const { data: districtsData, error: districtsError } = await supabase
        .from('districts')
        .select('*')
        .order('name', { ascending: true });
      
      if (districtsError) throw districtsError;
      
      setDistricts(districtsData || []);
      
      // 역할 요청 목록 조회
      let requestsData = null;
      let requestsError = null;
      
      try {
        // 먼저 기본 데이터 조회
        const basicResult = await supabase
          .from('role_requests')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (basicResult.error) throw basicResult.error;
        
        requestsData = basicResult.data;
        
        // JOIN 데이터가 있는 경우에만 추가 조회 시도
        if (requestsData && requestsData.length > 0) {
          try {
            const joinResult = await supabase
              .from('role_requests')
              .select(`
                *,
                users!role_requests_user_id_fkey(*),
                schools!role_requests_school_id_fkey(*)
              `)
              .order('created_at', { ascending: false });
            
            if (!joinResult.error) {
              requestsData = joinResult.data;
            }
          } catch (joinError) {
            console.warn('역할 요청 JOIN 조회 실패, 기본 데이터만 사용:', joinError);
          }
        }
      } catch (error) {
        requestsError = error;
      }
      
      if (requestsError) throw requestsError;
      
      const processedRequests = requestsData?.map(request => {
        // JOIN 데이터가 있는 경우와 없는 경우를 구분하여 처리
        const hasJoinData = 'users' in request && 'schools' in request;
        
        return {
          id: request.id,
          user_id: request.user_id,
          requested_role: request.requested_role,
          school_id: request.school_id,
          status: request.status as 'pending' | 'approved' | 'rejected',
          reason: request.reason,
          created_at: request.created_at,
          user: hasJoinData ? {
            ...(request as any).users,
            is_active: (request as any).users?.is_active === null ? false : (request as any).users?.is_active
          } : {
            id: request.user_id,
            name: '사용자 정보 없음',
            email: '이메일 정보 없음',
            is_active: false
          },
          school: hasJoinData ? (request as any).schools : undefined
        };
      }) || [];
      
      setRoleRequests(processedRequests);
      
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserData.email || !newUserData.name) {
        toast.error('이메일과 이름을 입력해주세요.');
        return;
      }

      if (!newUserData.password) {
        toast.error('패스워드를 입력해주세요.');
        return;
      }

      // 패스워드 해시화
      const saltRounds = 10;
      const hashedPassword = await bcryptjs.hash(newUserData.password, saltRounds);

      // 새 사용자 생성
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          email: newUserData.email,
          name: newUserData.name,
          password_hash: hashedPassword,
          role: newUserData.role,
          school_id: newUserData.role === 'district_admin' ? null : (newUserData.school_id || null),
          district_id: newUserData.role === 'district_admin' ? newUserData.district_id : null,
          grade_level: newUserData.role === 'homeroom_teacher' ? newUserData.grade_level : null,
          class_number: newUserData.role === 'homeroom_teacher' ? newUserData.class_number : null,
          is_active: true,
          employee_id: `EMP_${Date.now()}`,
          contact_info: {},
          department: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (userError) throw userError;

      toast.success('사용자가 성공적으로 생성되었습니다.');
      setUserModalOpen(false);
      setNewUserData({
        email: '',
        name: '',
        password: '',
        role: 'homeroom_teacher',
        school_id: '',
        district_id: '',
        grade_level: '1',
        class_number: '1'
      });
      setShowPassword(false);
      
      fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      toast.error('사용자 생성에 실패했습니다.');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: newUserData.role,
          school_id: newUserData.role === 'district_admin' ? null : (newUserData.school_id || null),
          district_id: newUserData.role === 'district_admin' ? newUserData.district_id : null,
          grade_level: newUserData.role === 'homeroom_teacher' ? newUserData.grade_level : null,
          class_number: newUserData.role === 'homeroom_teacher' ? newUserData.class_number : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('사용자 정보가 업데이트되었습니다.');
      setUserModalOpen(false);
      setSelectedUser(null);
      setEditMode(false);
      
      fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error('사용자 업데이트 오류:', error);
      toast.error('사용자 정보 업데이트에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('사용자가 삭제되었습니다.');
      fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      toast.error('사용자 삭제에 실패했습니다.');
    }
  };

  const handleCreateSchool = async () => {
    try {
      if (!newSchoolData.name || !newSchoolData.code) {
        toast.error('학교명과 학교코드를 입력해주세요.');
        return;
      }

      // 교육청 관리자는 자신의 교육청에만 학교 생성 가능
      if (currentUser?.role === 'district_admin') {
        if (!newSchoolData.district_id || newSchoolData.district_id !== currentUser.district_id) {
          toast.error('교육청 관리자는 자신의 교육청에만 학교를 생성할 수 있습니다.');
          return;
        }
      }

      // 새 학교 생성
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert([{
          name: newSchoolData.name,
          code: newSchoolData.code,
          address: newSchoolData.address || null,
          school_type: newSchoolData.school_type,
          district_id: newSchoolData.district_id || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (schoolError) throw schoolError;

      toast.success('학교가 성공적으로 생성되었습니다.');
      setSchoolModalOpen(false);
      setNewSchoolData({
        name: '',
        code: '',
        address: '',
        school_type: 'elementary',
        district_id: ''
      });
      
      fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error('학교 생성 오류:', error);
      toast.error('학교 생성에 실패했습니다.');
    }
  };

  const handleToggleUserStatus = async (userId: string, newStatus: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        toast.error('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      // 확인 메시지
      const actionText = newStatus ? '활성화' : '비활성화';
      const confirmMessage = newStatus 
        ? `${user.name} 사용자를 활성화하시겠습니까?\n활성화 후 로그인이 가능합니다.`
        : `${user.name} 사용자를 비활성화하시겠습니까?\n비활성화 후 로그인이 차단됩니다.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      if (newStatus) {
        toast.success(`${user.name} 사용자가 활성화되었습니다. 이제 로그인이 가능합니다.`);
      } else {
        toast.success(`${user.name} 사용자가 비활성화되었습니다. 로그인이 차단됩니다.`);
      }
      
      fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error('사용자 상태 변경 오류:', error);
      toast.error('사용자 상태 변경에 실패했습니다.');
    }
  };

  const handleGrantRole = async () => {
    try {
      if (!roleGrantData.targetUserId || !roleGrantData.newRole) {
        toast.error('사용자와 새로운 역할을 선택해주세요.');
        return;
      }

      const targetUser = users.find(u => u.id === roleGrantData.targetUserId);
      if (!targetUser) {
        toast.error('대상 사용자를 찾을 수 없습니다.');
        return;
      }

      // 권한 부여 확인
      const confirmMessage = `${targetUser.name} 사용자에게 '${getRoleDisplayName(roleGrantData.newRole)}' 역할을 부여하시겠습니까?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }

      // 사용자 역할 업데이트
      const updateData: any = {
        role: roleGrantData.newRole,
        updated_at: new Date().toISOString()
      };

      // 역할별 추가 정보 설정
      if (roleGrantData.newRole === 'homeroom_teacher') {
        if (!roleGrantData.school_id || !roleGrantData.grade_level || !roleGrantData.class_number) {
          toast.error('담임교사 역할 부여 시 학교, 학년, 반 정보가 필요합니다.');
          return;
        }
        updateData.school_id = roleGrantData.school_id;
        updateData.grade_level = roleGrantData.grade_level;
        updateData.class_number = roleGrantData.class_number;
      } else if (roleGrantData.newRole === 'grade_teacher') {
        if (!roleGrantData.school_id || !roleGrantData.grade_level) {
          toast.error('학년부장 역할 부여 시 학교와 학년 정보가 필요합니다.');
          return;
        }
        updateData.school_id = roleGrantData.school_id;
        updateData.grade_level = roleGrantData.grade_level;
        updateData.class_number = null;
      } else if (roleGrantData.newRole === 'school_admin') {
        if (!roleGrantData.school_id) {
          toast.error('학교 관리자 역할 부여 시 학교 정보가 필요합니다.');
          return;
        }
        updateData.school_id = roleGrantData.school_id;
        updateData.grade_level = null;
        updateData.class_number = null;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', roleGrantData.targetUserId);

      if (error) throw error;

      toast.success(`${targetUser.name} 사용자에게 '${getRoleDisplayName(roleGrantData.newRole)}' 역할이 성공적으로 부여되었습니다.`);
      
      // 모달 닫기 및 데이터 새로고침
      setRoleGrantModalOpen(false);
      setRoleGrantData({
        targetUserId: '',
        newRole: '',
        school_id: '',
        grade_level: '',
        class_number: '',
        reason: ''
      });
      
      fetchData();
    } catch (error) {
      console.error('역할 부여 오류:', error);
      toast.error('역할 부여에 실패했습니다.');
    }
  };

  const canGrantRole = (currentUserRole: string, targetRole: string) => {
    // 메인 관리자: 모든 역할 부여 가능
    if (currentUserRole === 'main_admin') {
      return true;
    }
    
    // 교육청 관리자: 학교 관리자, 학년부장, 담임교사 권한 부여 가능
    if (currentUserRole === 'district_admin' && ['school_admin', 'grade_teacher', 'homeroom_teacher'].includes(targetRole)) {
      return true;
    }
    
    // 학교 관리자: 학년부장, 담임교사 권한 부여 가능
    if (currentUserRole === 'school_admin' && ['grade_teacher', 'homeroom_teacher'].includes(targetRole)) {
      return true;
    }
    
    return false;
  };

  const handleRoleRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const request = roleRequests.find(r => r.id === requestId);
      if (!request) return;

      // 요청 상태 업데이트
      const { error: updateError } = await supabase
        .from('role_requests')
        .update({ status })
        .eq('id', requestId);

      if (updateError) throw updateError;

      if (status === 'approved') {
        // 사용자 역할 업데이트
        const { error: userError } = await supabase
          .from('users')
          .update({
            role: request.requested_role,
            school_id: request.school_id || null
          })
          .eq('id', request.user_id);

        if (userError) throw userError;
        
        toast.success('역할 요청이 승인되었습니다.');
      } else {
        toast.success('역할 요청이 거부되었습니다.');
      }
      
      fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error('역할 요청 처리 오류:', error);
      toast.error('역할 요청 처리에 실패했습니다.');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'main_admin': return '메인관리자';
      case 'district_admin': return '교육청 관리자';
      case 'school_admin': return '학교 관리자';
      case 'grade_teacher': return '학년 부장';
      case 'homeroom_teacher': return '담임교사';
      default: return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">대기중</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">승인됨</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">거부됨</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">알 수 없음</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900 mb-2">데이터 로딩 중...</p>
          <p className="text-gray-600">어드민 데이터를 불러오는 중입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentUser?.role === 'main_admin' ? '어드민 관리' :
                 currentUser?.role === 'district_admin' ? '교육청 관리' :
                 currentUser?.role === 'school_admin' ? '학교 관리' : '어드민 관리'}
              </h1>
              <p className="text-gray-600">
                {currentUser?.role === 'main_admin' ? '교육청 관리자와 학교 관리자를 허가하고 사용자를 관리합니다.' :
                 currentUser?.role === 'district_admin' ? '해당 교육청의 학교와 사용자를 관리합니다.' :
                 currentUser?.role === 'school_admin' ? '해당 학교의 사용자를 관리합니다.' : '시스템을 관리합니다.'}
              </p>
            </div>

          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              사용자 관리
            </button>
            
            {/* 역할 요청 관리 탭 - 메인 관리자만 접근 가능 */}
            {currentUser?.role === 'main_admin' && (
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                역할 요청 관리
              </button>
            )}
            
            {/* 학교 관리 탭 - 메인 관리자와 교육청 관리자만 접근 가능 */}
            {(currentUser?.role === 'main_admin' || currentUser?.role === 'district_admin') && (
              <button
                onClick={() => setActiveTab('schools')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'schools'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                학교 관리
              </button>
            )}
          </nav>
        </div>

        {/* 사용자 관리 탭 */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">사용자 목록</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    사용자 계정 상태를 관리하고 활성화/비활성화할 수 있습니다
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  {/* 엑셀 업로드 버튼 */}
                  <button
                    onClick={() => setExcelUploadModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    엑셀 업로드
                  </button>
                  
                  {/* 새 사용자 생성 버튼 */}
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setSelectedUser(null);
                              setNewUserData({
            email: '',
            name: '',
            password: '',
            role: 'homeroom_teacher',
            school_id: '',
            district_id: '',
            grade_level: '1',
            class_number: '1'
          });
                              setShowPassword(false);
                      setUserModalOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    새 사용자 생성
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학교</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">계정 상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users
                    .filter(user => {
                      // 메인 관리자: 모든 사용자 표시
                      if (currentUser?.role === 'main_admin') return true;
                      
                      // 교육청 관리자: 해당 교육청의 사용자만 표시 (학교관리자, 학년부장, 담임교사)
                      if (currentUser?.role === 'district_admin') {
                        // 사용자의 학교가 현재 교육청에 속하는지 확인
                        const userSchool = schools.find(s => s.id === user.school_id);
                        const isSameDistrict = userSchool?.district_id === currentUser.district_id;
                        // 학교관리자, 학년부장, 담임교사만 표시
                        return isSameDistrict && ['school_admin', 'grade_teacher', 'homeroom_teacher'].includes(user.role);
                      }
                      
                      // 학교 관리자: 해당 학교의 사용자만 표시 (학년부장, 담임교사)
                      if (currentUser?.role === 'school_admin') {
                        const isSameSchool = user.school_id === currentUser.school_id;
                        // 학년부장, 담임교사만 표시
                        return isSameSchool && ['grade_teacher', 'homeroom_teacher'].includes(user.role);
                      }
                      
                      return false;
                    })
                    .map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.school_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {/* 상태 배지 */}
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              user.is_active ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            
                          </div>
                          
                          {/* 토글 스위치 */}
                          {user.role !== 'main_admin' && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleToggleUserStatus(user.id, !user.is_active)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-md ${
                                  user.is_active 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                                role="switch"
                                aria-checked={user.is_active}
                                aria-label={`${user.name} 사용자 계정 ${user.is_active ? '비활성화' : '활성화'}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                                    user.is_active ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className="text-xs text-gray-500">
                                {user.is_active ? '활성' : '비활성'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {/* 사용자 편집 권한 */}
                          {(() => {
                            // 메인 관리자: 모든 사용자 편집 가능
                            if (currentUser?.role === 'main_admin') {
                              return true;
                            }
                            
                            // 교육청 관리자: 해당 교육청의 학교관리자, 학년부장, 담임교사 편집 가능
                            if (currentUser?.role === 'district_admin') {
                              const userSchool = schools.find(s => s.id === user.school_id);
                              const isSameDistrict = userSchool?.district_id === currentUser.district_id;
                              return isSameDistrict && ['school_admin', 'grade_teacher', 'homeroom_teacher'].includes(user.role);
                            }
                            
                            // 학교 관리자: 해당 학교의 학년부장, 담임교사 편집 가능
                            if (currentUser?.role === 'school_admin') {
                              const isSameSchool = user.school_id === currentUser.school_id;
                              return isSameSchool && ['grade_teacher', 'homeroom_teacher'].includes(user.role);
                            }
                            
                            return false;
                          })() && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setNewUserData({
                                  email: user.email,
                                  name: user.name,
                                  password: '',
                                  role: user.role,
                                  school_id: user.school_id || '',
                                  district_id: user.district_id || '',
                                  grade_level: user.grade_level || '1',
                                  class_number: user.class_number || '1'
                                });
                                setShowPassword(false);
                                setEditMode(true);
                                setUserModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="사용자 정보 편집"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* 권한 부여 버튼 */}
                          
                          {/* 담임교사 → 학년부장 승진 */}
                          {canGrantRole(currentUser?.role || '', 'homeroom_teacher') && user.role === 'homeroom_teacher' && (
                            <button
                              onClick={() => {
                                setRoleGrantData({
                                  targetUserId: user.id,
                                  newRole: 'grade_teacher',
                                  school_id: user.school_id || '',
                                  grade_level: user.grade_level || '',
                                  class_number: '',
                                  reason: '학년부장으로 승진'
                                });
                                setRoleGrantModalOpen(true);
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="학년부장으로 승진"
                            >
                              <AcademicCapIcon className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* 학년부장 → 학교 관리자 승진 */}
                          {canGrantRole(currentUser?.role || '', 'grade_teacher') && user.role === 'grade_teacher' && (
                            <button
                              onClick={() => {
                                setRoleGrantData({
                                  targetUserId: user.id,
                                  newRole: 'school_admin',
                                  school_id: user.school_id || '',
                                  grade_level: '',
                                  class_number: '',
                                  reason: '학교 관리자로 승진'
                                });
                                setRoleGrantModalOpen(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="학교 관리자로 승진"
                            >
                              <ShieldCheckIcon className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* 담임교사 → 학교 관리자 승진 (교육청 관리자만) */}
                          {currentUser?.role === 'district_admin' && user.role === 'homeroom_teacher' && (
                            <button
                              onClick={() => {
                                setRoleGrantData({
                                  targetUserId: user.id,
                                  newRole: 'school_admin',
                                  school_id: user.school_id || '',
                                  grade_level: '',
                                  class_number: '',
                                  reason: '학교 관리자로 승진'
                                });
                                setRoleGrantModalOpen(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="학교 관리자로 승진"
                            >
                              <ShieldCheckIcon className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* 사용자 삭제 권한 */}
                          {(() => {
                            // 메인 관리자: 모든 사용자 삭제 가능 (자신 제외)
                            if (currentUser?.role === 'main_admin' && user.role !== 'main_admin') {
                              return true;
                            }
                            
                            // 교육청 관리자: 해당 교육청의 학교관리자, 학년부장, 담임교사 삭제 가능
                            if (currentUser?.role === 'district_admin') {
                              const userSchool = schools.find(s => s.id === user.school_id);
                              const isSameDistrict = userSchool?.district_id === currentUser.district_id;
                              return isSameDistrict && ['school_admin', 'grade_teacher', 'homeroom_teacher'].includes(user.role);
                            }
                            
                            // 학교 관리자: 해당 학교의 학년부장, 담임교사 삭제 가능
                            if (currentUser?.role === 'school_admin') {
                              const isSameSchool = user.school_id === currentUser.school_id;
                              return isSameSchool && ['grade_teacher', 'homeroom_teacher'].includes(user.role);
                            }
                            
                            return false;
                          })() && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                              title="사용자 삭제"
                            >
                              <UserMinusIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 역할 요청 관리 탭 */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">역할 요청 관리</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요청자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요청 역할</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학교</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요청일</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roleRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-green-600">
                                {request.user?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{request.user?.name}</div>
                            <div className="text-sm text-gray-500">{request.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {getRoleDisplayName(request.requested_role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.school?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.created_at ? new Date(request.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRoleRequest(request.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRoleRequest(request.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 학교 관리 탭 */}
        {activeTab === 'schools' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">학교 목록</h2>
                              <button
                onClick={() => {
                  setNewSchoolData({
                    name: '',
                    code: '',
                    address: '',
                    school_type: 'elementary',
                    district_id: currentUser?.role === 'district_admin' ? currentUser.district_id : ''
                  });
                  setSchoolModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <BuildingOfficeIcon className="w-5 h-5 mr-2" />
                새 학교 생성
              </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학교명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주소</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학교코드</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학교유형</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schools.map((school) => (
                    <tr key={school.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{school.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {school.address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {school.code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {school.school_type || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {school.created_at ? new Date(school.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 사용자 생성/편집 모달 */}
        {userModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editMode ? '사용자 정보 편집' : '새 사용자 생성'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                      disabled={editMode}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <input
                      type="text"
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {!editMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">패스워드</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="패스워드를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                    <select
                      value={newUserData.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setNewUserData({
                          ...newUserData, 
                          role: newRole,
                          // 역할 변경 시 관련 필드 초기화
                          school_id: newRole === 'district_admin' ? '' : newUserData.school_id,
                          district_id: newRole === 'district_admin' ? '' : '',
                          grade_level: newRole === 'homeroom_teacher' ? newUserData.grade_level : '',
                          class_number: newRole === 'homeroom_teacher' ? newUserData.class_number : ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="homeroom_teacher">담임교사</option>
                      <option value="grade_teacher">학년 부장</option>
                      <option value="school_admin">학교 관리자</option>
                      <option value="district_admin">교육청 관리자</option>
                    </select>
                  </div>
                  
                  {/* 학교/교육청 선택 */}
                  {newUserData.role === 'district_admin' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">교육청</label>
                      <select
                        value={newUserData.district_id}
                        onChange={(e) => setNewUserData({...newUserData, district_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">교육청 선택</option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>{district.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">학교</label>
                      <select
                        value={newUserData.school_id}
                        onChange={(e) => setNewUserData({...newUserData, school_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">학교 선택</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {newUserData.role === 'homeroom_teacher' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">학년/반</label>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newUserData.grade_level}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 6)) {
                                setNewUserData({...newUserData, grade_level: value});
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value === '' || parseInt(value) < 1) {
                                setNewUserData({...newUserData, grade_level: '1'});
                              } else if (parseInt(value) > 6) {
                                setNewUserData({...newUserData, grade_level: '6'});
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1-6"
                            maxLength={1}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newUserData.class_number}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 10)) {
                                setNewUserData({...newUserData, class_number: value});
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value === '' || parseInt(value) < 1) {
                                setNewUserData({...newUserData, class_number: '1'});
                              } else if (parseInt(value) > 10) {
                                setNewUserData({...newUserData, class_number: '10'});
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1-10"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setUserModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={editMode ? handleUpdateUser : handleCreateUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editMode ? '업데이트' : '생성'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 새 학교 생성 모달 */}
        {schoolModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">새 학교 생성</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">학교명 *</label>
                    <input
                      type="text"
                      value={newSchoolData.name}
                      onChange={(e) => setNewSchoolData({...newSchoolData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="학교명을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">학교코드 *</label>
                    <input
                      type="text"
                      value={newSchoolData.code}
                      onChange={(e) => setNewSchoolData({...newSchoolData, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="학교코드를 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                    <input
                      type="text"
                      value={newSchoolData.address}
                      onChange={(e) => setNewSchoolData({...newSchoolData, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="주소를 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">학교유형</label>
                    <select
                      value={newSchoolData.school_type}
                      onChange={(e) => setNewSchoolData({...newSchoolData, school_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="elementary">초등학교</option>
                      <option value="middle">중학교</option>
                      <option value="high">고등학교</option>
                      <option value="special">특수학교</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">교육청</label>
                    <select
                      value={newSchoolData.district_id}
                      onChange={(e) => setNewSchoolData({...newSchoolData, district_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={currentUser?.role === 'district_admin'}
                    >
                      <option value="">교육청 선택</option>
                      {districts
                        .filter(district => {
                          // 교육청 관리자는 자신의 교육청만 선택 가능
                          if (currentUser?.role === 'district_admin') {
                            return district.id === currentUser.district_id;
                          }
                          // 메인 관리자는 모든 교육청 선택 가능
                          return true;
                        })
                        .map((district) => (
                          <option key={district.id} value={district.id}>{district.name}</option>
                        ))
                      }
                    </select>
                    {currentUser?.role === 'district_admin' && (
                      <p className="text-xs text-gray-500 mt-1">
                        교육청 관리자는 자신의 교육청에만 학교를 생성할 수 있습니다.
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setSchoolModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateSchool}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    생성
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 권한 부여 모달 */}
        {roleGrantModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">역할 권한 부여</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">대상 사용자</label>
                    <select
                      value={roleGrantData.targetUserId}
                      onChange={(e) => setRoleGrantData({...roleGrantData, targetUserId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">사용자 선택</option>
                      {users.filter(u => u.role !== 'main_admin').map((user) => (
                        <option key={user.id} value={user.id}>{user.name} ({getRoleDisplayName(user.role)})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">새로운 역할</label>
                    <select
                      value={roleGrantData.newRole}
                      onChange={(e) => setRoleGrantData({...roleGrantData, newRole: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">역할 선택</option>
                      
                      {/* 메인 관리자: 모든 역할 부여 가능 */}
                      {currentUser?.role === 'main_admin' && (
                        <>
                          <option value="district_admin">교육청 관리자</option>
                          <option value="school_admin">학교 관리자</option>
                          <option value="grade_teacher">학년 부장</option>
                          <option value="homeroom_teacher">담임교사</option>
                        </>
                      )}
                      
                      {/* 교육청 관리자: 학교 관리자, 학년부장, 담임교사 부여 가능 */}
                      {currentUser?.role === 'district_admin' && (
                        <>
                          <option value="school_admin">학교 관리자</option>
                          <option value="grade_teacher">학년 부장</option>
                          <option value="homeroom_teacher">담임교사</option>
                        </>
                      )}
                      
                      {/* 학교 관리자: 학년부장, 담임교사 부여 가능 */}
                      {currentUser?.role === 'school_admin' && (
                        <>
                          <option value="grade_teacher">학년 부장</option>
                          <option value="homeroom_teacher">담임교사</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  {roleGrantData.newRole && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">학교</label>
                        <select
                          value={roleGrantData.school_id}
                          onChange={(e) => setRoleGrantData({...roleGrantData, school_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">학교 선택</option>
                          {schools.map((school) => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {['homeroom_teacher', 'grade_teacher'].includes(roleGrantData.newRole) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={roleGrantData.grade_level}
                            onChange={(e) => setRoleGrantData({...roleGrantData, grade_level: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="학년을 입력하세요"
                          />
                        </div>
                      )}
                      
                      {roleGrantData.newRole === 'homeroom_teacher' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">반</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={roleGrantData.class_number}
                            onChange={(e) => setRoleGrantData({...roleGrantData, class_number: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="반을 입력하세요"
                          />
                        </div>
                      )}
                    </>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">권한 부여 사유</label>
                    <textarea
                      value={roleGrantData.reason}
                      onChange={(e) => setRoleGrantData({...roleGrantData, reason: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="권한 부여 사유를 입력하세요"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setRoleGrantModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleGrantRole}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    권한 부여
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 엑셀 업로드 모달 */}
        {excelUploadModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">사용자 목록 엑셀 업로드</h3>
                
                <div className="space-y-4">
                  {/* 템플릿 다운로드 */}
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800 mb-2">
                      엑셀 파일 형식을 확인하고 템플릿을 다운로드하세요.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      📥 엑셀 템플릿 다운로드
                    </button>
                  </div>

                  {/* 파일 업로드 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">엑셀 파일 선택</label>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      XLSX, XLS 파일을 지원합니다.
                    </p>
                  </div>

                  {/* 선택된 파일 정보 */}
                  {excelFile && (
                    <div className="bg-green-50 p-3 rounded-md">
                      <p className="text-sm text-green-800">
                        📁 선택된 파일: {excelFile.name}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        크기: {(excelFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}

                  {/* 업로드 진행률 */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>업로드 진행률</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* 필수 필드 안내 */}
                  <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="text-sm text-yellow-800 font-medium mb-2">📋 필수 필드</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• 이메일: 사용자 로그인 이메일</li>
                      <li>• 이름: 사용자 실명</li>
                      <li>• 패스워드: 초기 로그인 패스워드</li>
                      <li>• 역할: 담임교사, 학년부장, 학교관리자, 교육청관리자</li>
                    </ul>
                  </div>

                  {/* 역할 매핑 안내 */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-800 font-medium mb-2">🔗 역할 매핑</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• 담임교사 → homeroom_teacher</li>
                      <li>• 학년부장 → grade_teacher</li>
                      <li>• 학교관리자 → school_admin</li>
                      <li>• 교육청관리자 → district_admin</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setExcelUploadModalOpen(false);
                      setExcelFile(null);
                      setUploadProgress(0);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleExcelUpload}
                    disabled={!excelFile || isUploading}
                    className={`px-4 py-2 text-white rounded-md transition-colors ${
                      !excelFile || isUploading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isUploading ? '업로드 중...' : '업로드 시작'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
