import React, { useState } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onScrollTopClick?.();
  };

  const handleDownload = () => {
    // 기본 다운로드 동작 (현재 페이지 URL을 다운로드)
    const link = document.createElement('a');
    link.href = window.location.href;
    link.download = `페이지_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDownloadClick?.();
  };

  const handleChat = () => {
    // 기본 채팅 동작 (콘솔에 메시지 출력)
    onChatClick?.();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* 확장된 메뉴 */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 space-y-3">
            {/* 채팅 버튼 */}
            <button
              onClick={handleChat}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              title="채팅/피드백"
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
              title="다운로드"
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
  );
};

export default FloatingActionButton;
