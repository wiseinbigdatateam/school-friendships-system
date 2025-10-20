import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { contactService } from '../services/contactService';

interface FloatingActionButtonProps {
  onChatClick?: () => void;
  onDownloadClick?: () => void;
  onScrollTopClick?: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onChatClick,
  onDownloadClick,
  onScrollTopClick
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onScrollTopClick?.();
  };

  const handleDownload = () => {
    // 매뉴얼 파일 다운로드
    const link = document.createElement('a');
    link.href = '/와이즈온스쿨_매뉴얼_ver 1.0.pdf';
    link.download = '와이즈온스쿨_매뉴얼_ver 1.0.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDownloadClick?.();
  };

  const handleChat = () => {
    setShowContactModal(true);
    setIsExpanded(false);
    onChatClick?.();
  };

  const handleContactSubmit = async () => {
    if (!user || !contactMessage.trim()) return;
    
    setIsSubmitting(true);
    try {
      await contactService.submitContactForm({
        name: user.name || '',
        email: user.email || '',
        institution: user.school_id ? '학교' : '기관',
        role: user.role || '',
        phone: user.phone || '',
        message: contactMessage
      });
      
      setContactMessage('');
      setShowContactModal(false);
      alert('문의가 성공적으로 전송되었습니다.');
    } catch (error) {
      console.error('문의 전송 오류:', error);
      alert('문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 문의하기 모달 */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">문의하기</h2>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
                  내용 *
                </label>
                <textarea
                  id="message"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="문의내용을 입력해주세요"
                />
                <div className="mt-1 text-right text-sm text-gray-500">
                  {contactMessage.length}/1000자 (최소 10자 이상)
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleContactSubmit}
                  disabled={isSubmitting || contactMessage.trim().length < 10}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {isSubmitting ? "전송 중..." : "신청하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
        {/* 확장된 메뉴 */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 space-y-3">
            {/* 채팅 버튼 */}
            <button
              onClick={handleChat}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              title="문의하기"
            >
              <svg 
                className="h-6 w-6 text-gray-700" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                />
              </svg>
            </button>

            {/* 다운로드 버튼 */}
            <button
              onClick={handleDownload}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              title="매뉴얼 다운로드"
            >
              <svg 
                className="h-6 w-6 text-gray-700" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
            </button>

            {/* 맨 위로 스크롤 버튼 */}
            <button
              onClick={handleScrollTop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              title="맨 위로"
            >
              <svg 
                className="h-6 w-6 text-gray-700" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 10l7-7m0 0l7 7m-7-7v18" 
                />
              </svg>
            </button>
          </div>
        )}

        {/* 메인 토글 버튼 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 hover:shadow-xl ${
            isExpanded ? 'rotate-45' : 'rotate-0'
          }`}
          title={isExpanded ? "메뉴 닫기" : "메뉴 열기"}
        >
          <svg 
            className="h-7 w-7 text-gray-700" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
            />
          </svg>
        </button>
      </div>
    </div>
    </>
  );
};

export default FloatingActionButton;
