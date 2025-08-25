import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  ArrowUpTrayIcon, 
  DocumentArrowUpIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline/index.js';

interface DataTransferRequest {
  id: string;
  student_id: string | null;
  from_school_id: string | null;
  to_school_id: string | null;
  status: string;
  data_types: string[];
  requested_at: string | null;
  parent_consent_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  student?: {
    id: string;
    name: string;
    grade: string;
    class: string;
  } | null;
  from_school?: {
    name: string;
    code: string;
  } | null;
  to_school?: {
    name: string;
    code: string;
  } | null;
}

interface Student {
  id: string;
  lifelong_education_id: string;
  name: string;
  grade: string;
  class: string;
  current_school_id: string | null;
}

interface School {
  id: string;
  name: string;
  code: string;
  school_type: string;
}

const DataTransfer: React.FC = () => {
  const [transferRequests, setTransferRequests] = useState<DataTransferRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [transferScope, setTransferScope] = useState<string[]>([
    'academic_records',
    'behavioral_records', 
    'friendship_data',
    'teacher_memos',
    'intervention_logs'
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 데이터 이관 요청 조회
      const { data: requests, error: requestsError } = await supabase
        .from('data_transfer_requests')
        .select(`
          *,
          student:students(id, name, grade, class),
          from_school:schools!data_transfer_requests_from_school_id_fkey(name, code),
          to_school:schools!data_transfer_requests_to_school_id_fkey(name, code)
        `)
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      // 학생 목록 조회
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, lifelong_education_id, name, grade, class, current_school_id')
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      // 학교 목록 조회
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name, code, school_type')
        .eq('is_active', true);

      if (schoolsError) throw schoolsError;

      setTransferRequests(requests || []);
      setStudents(studentsData || []);
      setSchools(schoolsData || []);
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = async () => {
    if (!selectedStudent || !selectedSchool) {
      toast.error('학생과 대상 학교를 선택해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('data_transfer_requests')
        .insert({
          student_id: selectedStudent,
          from_school_id: students.find(s => s.id === selectedStudent)?.current_school_id,
          to_school_id: selectedSchool,
          data_types: transferScope,
          request_type: 'transfer',
          status: 'pending',
          requested_at: new Date().toISOString(),
          notes: notes.trim() || null
        });

      if (error) throw error;

      toast.success('데이터 이관 요청이 생성되었습니다.');
      setShowNewRequestModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('요청 생성 오류:', error);
      toast.error('요청 생성 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedSchool('');
    setTransferScope([
      'academic_records',
      'behavioral_records',
      'friendship_data',
      'teacher_memos',
      'intervention_logs'
    ]);
    setNotes('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, label: '대기중' },
      parent_consent_required: { color: 'bg-blue-100 text-blue-800', icon: ExclamationTriangleIcon, label: '학부모 동의 필요' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: '승인됨' },
      in_progress: { color: 'bg-purple-100 text-purple-800', icon: ArrowUpTrayIcon, label: '진행중' },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircleIcon, label: '완료' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, label: '거부됨' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'border-yellow-200 bg-yellow-50',
      parent_consent_required: 'border-blue-200 bg-blue-50',
      approved: 'border-green-200 bg-green-50',
      in_progress: 'border-purple-200 bg-purple-50',
      completed: 'border-gray-200 bg-gray-50',
      rejected: 'border-red-200 bg-red-50'
    };
    return colors[status as keyof typeof colors] || 'border-gray-200 bg-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">데이터 이관 관리</h1>
        <p className="text-gray-600">학생 데이터를 다른 학교로 안전하게 이관할 수 있습니다.</p>
      </div>

      {/* 새 요청 버튼 */}
      <div className="mb-6">
        <button
          onClick={() => setShowNewRequestModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
          새 이관 요청
        </button>
      </div>

      {/* 이관 요청 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">이관 요청 현황</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학생</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출발 학교</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">도착 학교</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요청일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이관 범위</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transferRequests.map((request) => (
                <tr key={request.id} className={`${getStatusColor(request.status)}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {request.student?.name || '알 수 없음'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.student?.grade}학년 {request.student?.class}반
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {request.from_school?.name || '알 수 없음'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.from_school?.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {request.to_school?.name || '알 수 없음'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.to_school?.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.requested_at ? new Date(request.requested_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                    {request.data_types.map(key => {
                      const labels = {
                        academic_records: '학업 기록',
                        behavioral_records: '행동 기록',
                        friendship_data: '교우관계',
                        teacher_memos: '교사 메모',
                        intervention_logs: '개입 로그'
                      };
                      return labels[key as keyof typeof labels];
                    }).join(', ')}
                  </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transferRequests.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              아직 이관 요청이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 새 요청 모달 */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">새 이관 요청</h3>
              
              {/* 학생 선택 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">학생 선택</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">학생을 선택하세요</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.grade}학년 {student.class}반)
                    </option>
                  ))}
                </select>
              </div>

              {/* 대상 학교 선택 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">대상 학교</label>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">학교를 선택하세요</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.school_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* 이관 범위 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">이관 범위</label>
                <div className="space-y-2">
                  {[
                    { key: 'academic_records', label: '학업 기록' },
                    { key: 'behavioral_records', label: '행동 기록' },
                    { key: 'friendship_data', label: '교우관계 데이터' },
                    { key: 'teacher_memos', label: '교사 메모' },
                    { key: 'intervention_logs', label: '개입 로그' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={transferScope.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTransferScope(prev => [...prev, key]);
                          } else {
                            setTransferScope(prev => prev.filter(k => k !== key));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="이관 요청에 대한 추가 정보를 입력하세요..."
                />
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNewRequestModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleNewRequest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  요청 생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTransfer;
