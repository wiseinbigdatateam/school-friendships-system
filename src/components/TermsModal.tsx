import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TermsModalProps {
  type: "service" | "privacy" | "third_party";
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({
  type,
  onClose,
}) => {
  const getTermsContent = (type: string) => {
    switch (type) {
      case "service":
        return {
          title: "서비스 이용약관",
          content: `제1조 (목적)
이 약관은 와이즈온(이하 "회사")이 제공하는 학교 교우관계 분석 서비스(이하 "서비스")의 이용에 관한 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 학교 교우관계 분석 및 상담 관련 서비스를 의미합니다.
2. "이용자"란 이 약관에 따라 회사와 서비스 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 개인을 의미합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
2. 회사는 필요하다고 인정되는 경우 이 약관을 변경할 수 있으며, 변경된 약관은 제1항과 같은 방법으로 공지 또는 통지함으로써 효력이 발생합니다.`
        };
      case "privacy":
        return {
          title: "개인정보 처리방침",
          content: `제1조 (개인정보의 처리 목적)
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.

1. 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산
2. 회원 관리 및 본인확인, 개인식별, 불량회원의 부정 이용 방지와 비인가 사용 방지
3. 서비스 개선 및 신규 서비스 개발을 위한 통계분석

제2조 (개인정보의 처리 및 보유기간)
1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
   - 서비스 이용기록: 1년
   - 설문 응답 데이터: 1년`
        };
      case "third_party":
        return {
          title: "제3자 정보 제공 동의",
          content: `제1조 (제3자 정보 제공)
회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.

1. 이용자들이 사전에 동의한 경우
2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

제2조 (개인정보의 위탁)
회사는 서비스 향상을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
- 클라우드 서비스 제공업체: 서비스 운영 및 데이터 보관
- 이메일 발송 서비스: 회원 가입 및 서비스 안내 메일 발송`
        };
      default:
        return {
          title: "약관",
          content: "약관 내용이 없습니다."
        };
    }
  };

  const { title, content } = getTermsContent(type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg bg-white">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="p-6">
          <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {content}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex justify-end border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#3F80EA] px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;