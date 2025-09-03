import React, { useState } from "react";
import { Link } from "react-router-dom";

interface ContactForm {
  name: string;
  email: string;
  institution: string;
  role: string;
  category: string;
  subject: string;
  message: string;
  phone?: string;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<ContactForm>({
    name: "",
    email: "",
    institution: "",
    role: "",
    category: "일반문의",
    subject: "",
    message: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    "기술지원",
    "계정문제",
    "기능요청",
    "오류신고",
    "도입상담",
    "교육문의",
    "기타",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 에러 클리어
    if (error) setError(null);
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
    if (!formData.subject.trim()) {
      setError("문의 제목을 입력해주세요.");
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
      // TODO: 실제 문의 API 호출
      // const response = await contactService.submitInquiry(formData);

      // 임시 성공 처리
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 로딩 시뮬레이션

      console.log("Contact form submitted:", formData);
      setSubmitted(true);
    } catch (error) {
      console.error("Contact form submission failed:", error);
      setError("문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      institution: "",
      role: "",
      category: "일반문의",
      subject: "",
      message: "",
      phone: "",
    });
    setSubmitted(false);
    setError(null);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4 py-12 sm:px-6 lg:px-8">
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
              문의가 접수되었습니다!
            </h2>
            <p className="mb-6 text-gray-600">
              빠른 시일 내에 담당자가 연락드리겠습니다.
              <br />
              보통 1~2 영업일 내에 답변을 받으실 수 있습니다.
            </p>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 font-medium text-blue-900">접수 정보</h3>
              <div className="space-y-1 text-sm text-blue-700">
                <p>문의자: {formData.name}</p>
                <p>이메일: {formData.email}</p>
                <p>카테고리: {formData.category}</p>
                <p>제목: {formData.subject}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              새 문의하기
            </button>

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link to="/login" className="inline-block self-start">
            <img src="/logo_school.png" alt="와이즈온 스쿨 로고" />
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900">문의하기</h1>
          <p className="text-gray-600">
            궁금한 사항이나 도움이 필요한 내용을 언제든지 문의해주세요
          </p>
        </div>

        {/* 연락처 정보 */}
        {/* <div className="mb-4 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            빠른 연락처
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  전화문의
                </div>
                <div className="text-sm text-gray-600">02-558-5144</div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">이메일</div>
                <div className="text-sm text-gray-600">
                  wiseon@wiseinc.co.kr
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  운영시간
                </div>
                <div className="text-sm text-gray-600">평일 09:00-18:00</div>
              </div>
            </div>
          </div>
        </div> */}

        {/* 문의 폼 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            온라인 문의
          </h2>

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
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  문의 분류 *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

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
                htmlFor="subject"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                문의 제목 *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="문의하실 내용을 간략히 요약해주세요"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                문의 내용 *
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                value={formData.message}
                onChange={handleInputChange}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="궁금한 사항이나 문의 내용을 자세히 적어주세요&#10;&#10;• 오류 발생 시: 발생 상황, 오류 메시지, 사용 환경 등&#10;• 기능 문의 시: 필요한 기능, 사용 목적 등&#10;• 기타 문의: 구체적인 상황과 요청사항"
              />
              <div className="mt-1 text-sm text-gray-500">
                {formData.message.length}/1000자 (최소 10자 이상)
              </div>
            </div>

            <div className="flex space-x-4">
              <Link
                to="/login"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                돌아가기
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    전송 중...
                  </div>
                ) : (
                  "문의 전송"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>문의하신 내용은 개인정보 보호정책에 따라 안전하게 처리됩니다.</p>
          <p>긴급한 사항은 전화로 연락해주세요.</p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
