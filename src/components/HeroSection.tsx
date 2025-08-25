import React from 'react';
import { HeroSectionProps } from '../types';

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  backgroundImage,
  ctaButtonText,
  onCtaClick,
}) => {
  const handleCtaClick = () => {
    onCtaClick();
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      />
      
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* 콘텐츠 */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
          {title}
        </h1>
        
        {/* CTA 버튼 */}
        <button
          onClick={handleCtaClick}
          className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
          aria-label={ctaButtonText}
        >
          <svg
            className="w-8 h-8 text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
    </section>
  );
};

export default HeroSection; 