import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { contactService } from "../services/contactService";
import {
  ArrowUpFromDotIcon,
  DownloadIcon,
  MessageSquareMoreIcon,
} from "lucide-react";

interface FloatingActionButtonProps {
  onChatClick?: () => void;
  onDownloadClick?: () => void;
  onScrollTopClick?: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onChatClick,
  onDownloadClick,
  onScrollTopClick,
}) => {
  const { user } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    onScrollTopClick?.();
  };

  const handleDownload = () => {
    // 매뉴얼 파일 다운로드
    const fileName = "와이즈온스쿨_매뉴얼.pdf";
    // URL 인코딩하여 특수문자 처리
    const encodedFileName = encodeURIComponent(fileName);
    const link = document.createElement("a");
    link.href = "/" + encodedFileName;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDownloadClick?.();
  };

  const handleChat = () => {
    setShowContactModal(true);
    onChatClick?.();
  };

  const handleContactSubmit = async () => {
    if (!user || !contactMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await contactService.submitContactForm({
        name: user.name || "",
        email: user.email || "",
        institution: user.school_id ? "학교" : "기관",
        role: user.role || "",
        phone: user.phone || "",
        message: contactMessage,
      });

      setContactMessage("");
      setShowContactModal(false);
      alert("문의가 성공적으로 전송되었습니다.");
    } catch (error) {
      console.error("문의 전송 오류:", error);
      alert("문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.");
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
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="message"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
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
          <div className="absolute bottom-16 right-0 space-y-3 rounded-[50px] border-[1px] border-[#E5E7EB] bg-white p-3">
            {/* 채팅 버튼 */}
            <button
              onClick={handleChat}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F4F6] transition-all duration-200 hover:scale-105 hover:shadow-xl"
              title="문의하기"
            >
              <MessageSquareMoreIcon className="text-[#697282]" />
            </button>

            {/* 다운로드 버튼 */}
            <button
              onClick={handleDownload}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3B82F6] transition-all duration-200 hover:scale-105 hover:shadow-xl"
              title="매뉴얼 다운로드"
            >
              <DownloadIcon className="text-white" />
            </button>

            {/* 맨 위로 스크롤 버튼 */}
            <button
              onClick={handleScrollTop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F4F6] transition-all duration-200 hover:scale-105 hover:shadow-xl"
              title="맨 위로"
            >
              <ArrowUpFromDotIcon className="text-[#697282]" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingActionButton;
