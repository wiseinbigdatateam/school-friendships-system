import React from 'react';

interface HTMLRendererProps {
  content: string;
  className?: string;
}

export const HTMLRenderer: React.FC<HTMLRendererProps> = ({ content, className = "" }) => {
  // HTML 태그를 제거하고 텍스트만 추출하는 함수
  const stripHtmlTags = (html: string): string => {
    // HTML 태그 제거
    let text = html.replace(/<[^>]*>/g, '');
    
    // HTML 엔티티 디코딩
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // 연속된 공백을 하나로 정리
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  };

  // HTML을 구조화된 텍스트로 변환하는 함수
  const parseHtmlToStructuredText = (html: string): React.ReactNode => {
    // HTML 태그를 제거하고 텍스트만 추출
    const text = stripHtmlTags(html);
    
    // 문단별로 분리
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    return (
      <div className={className}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="mb-3 text-sm leading-relaxed text-gray-700">
            {paragraph.trim()}
          </p>
        ))}
      </div>
    );
  };

  return <>{parseHtmlToStructuredText(content)}</>;
};
