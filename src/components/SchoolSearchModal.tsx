import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SchoolSearchModalProps {
  onClose: () => void;
  onSelectSchool: (schoolCode: string) => void;
}

const SchoolSearchModal: React.FC<SchoolSearchModalProps> = ({ onClose, onSelectSchool }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 컴포넌트 마운트 시 학교 데이터 로드
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('code, name, address')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setSchools(data || []);
      } catch (error) {
        console.error('학교 데이터 로드 실패:', error);
        // 오류 시 샘플 데이터 사용
        setSchools([
          { code: 'SL001001', name: '서울중앙초등학교', address: '서울특별시 중구 명동길 123' },
          { code: 'SL001002', name: '서울중앙중학교', address: '서울특별시 중구 명동길 456' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
  }, []);

  const filteredSchools = schools.filter(school => 
    (school.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (school.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (school.code?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">학교 검색</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="학교명, 지역, 또는 코드로 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">학교 정보를 불러오는 중...</span>
              </div>
            ) : filteredSchools.length > 0 ? (
              <div className="space-y-2">
                {filteredSchools.map((school) => (
                  <div
                    key={school.code}
                    onClick={() => onSelectSchool(school.code)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{school.name || '학교명 없음'}</h4>
                        <p className="text-sm text-gray-600">{school.address || '주소 정보 없음'}</p>
                      </div>
                      <span className="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {school.code || '코드 없음'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>검색 결과가 없습니다.</p>
                <p className="text-sm mt-1">다른 검색어를 시도해보세요.</p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-yellow-700">
                <p className="font-medium">찾으시는 학교가 없나요?</p>
                <p>• 정확한 학교명으로 다시 검색해보세요</p>
                <p>• 행정실(교무실)에 문의하여 정확한 학교코드를 확인하세요</p>
                <p>• 문의하기를 통해 도움을 요청하실 수 있습니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolSearchModal;
