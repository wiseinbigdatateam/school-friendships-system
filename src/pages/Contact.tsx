import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { contactService, ContactFormData } from "../services/contactService";

// ContactFormData 타입을 contactService에서 가져오므로 중복 제거

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    institution: "",
    role: "",
    message: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev: ContactFormData) => ({
      ...prev,
      [name]: value,
    }));

    // 에러 클리어
    if (error) setError(null);
  };

  // formData의 값 중 하나라도 작성되었는지 확인
  const isAnyFieldFilled = Object.values(formData).some(
    (value) => (value as string).trim() !== "",
  );

  // confirm 창을 띄우는 함수
  const callConfirmMessage = () => {
    if (
      window.confirm(
        "신청을 취소하시면 지금까지 입력한 내용이 사라집니다. 취소하시겠습니까?",
      )
    ) {
      alert("취소되었습니다");
      navigate("/");
    }
  };

  const handleCancelBtn = () => {
    if (isAnyFieldFilled) {
      callConfirmMessage();
    } else {
      navigate("/");
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("이름을 입력해주세요.");
      return false;
    }
    if (!formData.email.trim()) {
      setError("이메일을 입력해주세요.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return false;
    }
    if (!formData.institution.trim()) {
      setError("소속을 입력해주세요.");
      return false;
    }
    if (!formData.message.trim()) {
      setError("문의 내용을 입력해주세요.");
      return false;
    }
    if (formData.message.length < 10) {
      setError("문의 내용을 10자 이상 입력해주세요.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // 실제 문의 API 호출
      const response = await contactService.submitContactForm(formData);
      
      console.log("Contact form submitted successfully:", response);
      setSubmitted(true);
    } catch (error) {
      console.error("Contact form submission failed:", error);
      setError("문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // resetForm 함수는 현재 사용되지 않으므로 제거

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              체험 신청이 완료되었습니다!
            </h2>
            <p className="mb-6 text-gray-600">
              빠른 시일 내에 담당자가 연락드리겠습니다.
              <br />
              보통 1~2 영업일 내에 답변을 받으실 수 있습니다.
            </p>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 font-medium text-blue-900">신청 정보</h3>
              <div className="space-y-1 text-sm text-blue-700">
                <p>문의자: {formData.name}</p>
                <p>이메일: {formData.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* <button
              onClick={resetForm}
              className="w-full rounded-lg border border-transparent bg-[#3F80EA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              추가 신청하기
            </button> */}

            <Link
              to="/login"
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link to="/login" className="inline-block self-start">
            <img src="/logo_school.png" alt="와이즈온 스쿨 로고" />
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">
            체험 신청하기
          </h1>
          <p className="text-gray-600">
            와이즈온스쿨 체험을 위해 신청이 필요합니다
          </p>
        </div>

        {/* 문의 폼 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  이름 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  이메일 *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="example@school.edu"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="institution"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  소속 *
                </label>
                <input
                  type="text"
                  id="institution"
                  name="institution"
                  required
                  value={formData.institution}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="○○초등학교, △△교육청"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  직책
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="담임교사, 학년부장 등"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  연락처
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                내용 *
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                value={formData.message}
                onChange={handleInputChange}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-1 text-sm text-gray-500">
                {formData.message.length}/1000자 (최소 10자 이상)
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleCancelBtn}
              >
                취소
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg border border-transparent bg-[#3F80EA] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    신청 중...
                  </div>
                ) : (
                  "신청하기"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>입력하신 정보는 개인정보 보호정책에 따라 안전하게 처리됩니다.</p>
          <p>긴급한 사항은 전화로 연락해주세요.</p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
