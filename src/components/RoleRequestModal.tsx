import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline/index.js';

interface RoleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: string;
  userId: string;
  schoolId?: string;
}

interface School {
  id: string;
  name: string;
}

const RoleRequestModal: React.FC<RoleRequestModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  userId,
  schoolId
}) => {
  const [requestedRole, setRequestedRole] = useState<string>('school_admin');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schoolId || '');
  const [schools, setSchools] = useState<School[]>([]);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchSchools();
    }
  }, [isOpen]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('학교 목록 조회 오류:', error);
      toast.error('학교 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('요청 사유를 입력해주세요.');
      return;
    }

    if (requestedRole === 'school_admin' && !selectedSchoolId) {
      toast.error('학교를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('role_requests')
        .insert([{
          user_id: userId,
          requested_role: requestedRole,
          school_id: requestedRole === 'school_admin' ? selectedSchoolId : null,
          reason: reason.trim(),
          status: 'pending'
        }]);

      if (error) throw error;

      toast.success('역할 요청이 성공적으로 제출되었습니다. 메인관리자의 승인을 기다려주세요.');
      onClose();
    } catch (error) {
      console.error('역할 요청 제출 오류:', error);
      toast.error('역할 요청 제출에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">역할 권한 요청</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                현재 역할
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700">
                {currentRole === 'homeroom_teacher' && '담임교사'}
                {currentRole === 'grade_teacher' && '학년 부장'}
                {currentRole === 'school_admin' && '학교 관리자'}
                {currentRole === 'district_admin' && '교육청 관리자'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                요청할 역할 *
              </label>
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="school_admin">학교 관리자</option>
                <option value="district_admin">교육청 관리자</option>
              </select>
            </div>

            {requestedRole === 'school_admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  학교 선택 *
                </label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">학교를 선택하세요</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                요청 사유 *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="역할 권한이 필요한 이유를 설명해주세요..."
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    역할 요청은 메인관리자의 승인 후 적용됩니다. 승인까지 시간이 걸릴 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? '제출 중...' : '요청 제출'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoleRequestModal;
