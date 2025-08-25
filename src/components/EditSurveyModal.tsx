import React, { useState, useEffect } from 'react';
import { SurveyWithStats } from '../services/surveyService';

interface EditSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  survey: SurveyWithStats | null;
}

const EditSurveyModal: React.FC<EditSurveyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  survey
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  // 설문 데이터가 변경될 때마다 폼 데이터 업데이트
  useEffect(() => {
    if (survey) {
      setFormData({
        title: survey.title || '',
        description: survey.description || '',
        start_date: survey.start_date || '',
        end_date: survey.end_date || ''
      });
    }
  }, [survey]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen || !survey) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">설문 수정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 설문 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설문 제목 *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="설문 제목을 입력하세요"
            />
          </div>

          {/* 설문 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설문 설명
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="설문에 대한 설명을 입력하세요"
            />
          </div>

          {/* 설문 기간 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일 *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일 *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 현재 설문 정보 표시 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">현재 설문 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">상태:</span> {survey.status}
              </div>
              <div>
                <span className="font-medium">응답 수:</span> {survey.response_count || 0}명
              </div>
              <div>
                <span className="font-medium">대상 학년:</span> {Array.isArray(survey.target_grades) ? survey.target_grades.join(', ') : survey.target_grades}
              </div>
              <div>
                <span className="font-medium">대상 반:</span> {Array.isArray(survey.target_classes) ? survey.target_classes.join(', ') : survey.target_classes}
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              수정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSurveyModal;
