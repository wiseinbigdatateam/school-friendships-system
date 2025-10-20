import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { hashPassword } from "../utils/password";
import TermsModal from "../components/TermsModal";
import SchoolSearchModal from "../components/SchoolSearchModal";
import { emailService } from "../services/emailService";

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    password: "",
    confirmPassword: "",
    role: "homeroom_teacher", // 기본값
    schoolCode: "",
    gradeLevel: "",
    classNumber: "",
    department: "",
    subject: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 단계별 회원가입 (1: 약관동의, 2: 개인정보, 3: 학교정보)
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState<
    "service" | "privacy" | "third_party" | null
  >(null);
  const [agreements, setAgreements] = useState({
    serviceTerms: false,
    privacyPolicy: false,
    thirdParty: false,
    allAgreed: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 에러 클리어
    if (error) setError(null);
  };

  const handleAgreementChange = (name: keyof typeof agreements) => {
    if (name === "allAgreed") {
      const newValue = !agreements.allAgreed;
      setAgreements({
        serviceTerms: newValue,
        privacyPolicy: newValue,
        thirdParty: newValue,
        allAgreed: newValue,
      });
    } else {
      const newAgreements = {
        ...agreements,
        [name]: !agreements[name],
      };
      // 필수 약관이 모두 체크되었는지 확인
      newAgreements.allAgreed =
        newAgreements.serviceTerms && newAgreements.privacyPolicy;
      setAgreements(newAgreements);
    }
    if (error) setError(null);
  };

  const validateStep1 = () => {
    if (!agreements.serviceTerms) {
      setError("서비스 이용약관에 동의해주세요.");
      return false;
    }
    if (!agreements.privacyPolicy) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
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
    if (!formData.password) {
      setError("비밀번호를 입력해주세요.");
      return false;
    }
    if (formData.password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.schoolCode.trim()) {
      setError("학교 코드를 입력해주세요.");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setError(null);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      setError(null);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep3()) return;

    setLoading(true);
    setError(null);

    try {
      // 1. 학교 코드로 학교 정보 조회
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("id, district_id")
        .eq("code", formData.schoolCode)
        .single();

      if (schoolError || !schoolData) {
        throw new Error(
          "유효하지 않은 학교 코드입니다. 학교 코드를 확인해주세요.",
        );
      }

      // 2. 이메일 중복 확인
      const { data: existingUser } = await supabase
        .from("users")
        .select("email")
        .eq("email", formData.email)
        .single();

      if (existingUser) {
        throw new Error("이미 등록된 이메일입니다.");
      }

      // 3. 교직원 번호 중복 확인
      const { data: existingEmployee } = await supabase
        .from("users")
        .select("employee_id")
        .eq("employee_id", formData.employeeId)
        .single();

      if (existingEmployee) {
        throw new Error("이미 등록된 교직원 번호입니다.");
      }

      // 4. 권한 설정
      const getPermissions = (role: string): string[] => {
        const basePermissions = [
          "read_students",
          "read_surveys",
          "read_analysis",
        ];

        switch (role) {
          case "school_admin":
            return [
              ...basePermissions,
              "write_students",
              "write_surveys",
              "write_memos",
              "manage_school",
              "manage_users",
              "view_reports",
            ];
          case "grade_teacher":
            return [
              ...basePermissions,
              "write_students",
              "write_surveys",
              "write_memos",
              "manage_grade",
            ];
          case "homeroom_teacher":
            return [
              ...basePermissions,
              "write_students",
              "write_surveys",
              "write_memos",
            ];
          case "district_admin":
            return [
              ...basePermissions,
              "write_students",
              "write_surveys",
              "write_memos",
              "manage_school",
              "manage_users",
              "view_reports",
              "manage_district",
            ];
          default:
            return basePermissions;
        }
      };

      // 5. 패스워드 해시화
      const hashedPassword = await hashPassword(formData.password);

      // 6. 새 사용자 데이터 생성
      const newUser = {
        school_id: schoolData.id,
        district_id: schoolData.district_id,
        employee_id: formData.employeeId,
        name: formData.name,
        email: formData.email,
        password_hash: hashedPassword, // bcrypt로 해시화된 패스워드
        role: formData.role,
        permissions: getPermissions(formData.role),
        grade_level: formData.gradeLevel || null,
        class_number: formData.classNumber || null,
        department: formData.department || null,
        contact_info: {
          phone: formData.phone,
          email: formData.email,
          department: formData.department,
          subject: formData.subject,
        },
        is_active: false,
      };
      // 7. Supabase에 사용자 등록
      const { data: userData, error: insertError } = await supabase
        .from("users")
        .insert([newUser])
        .select()
        .single();

      if (insertError) {
        console.error("User insert error:", insertError);
        throw new Error("사용자 등록에 실패했습니다. 관리자에게 문의하세요.");
      }

      // 8. 관리자에게 회원가입 알림 이메일 전송
      try {
        const { data: schoolInfo } = await supabase
          .from("schools")
          .select("name")
          .eq("id", schoolData.id)
          .single();

        const roleNames: { [key: string]: string } = {
          homeroom_teacher: "담임교사",
          grade_teacher: "학년부장",
          school_admin: "학교관리자",
          district_admin: "교육청관리자"
        };

        await emailService.sendEmail({
          to: 'jinseong-kim@wiseinc.co.kr',
          subject: `[와이즈온스쿨 회원가입 승인 요청] ${formData.name} - ${schoolInfo?.name || ''}`,
          content: `
<div style="font-family: 'Noto Sans KR', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color: #3F80EA; margin-bottom: 20px; font-size: 24px; border-bottom: 3px solid #3F80EA; padding-bottom: 10px;">
      👤 새로운 교직원 회원가입
    </h2>
    
    <div style="margin-bottom: 30px;">
      <p style="color: #6b7280; margin-bottom: 20px;">새로운 교직원이 회원가입을 완료했습니다. 승인 처리가 필요합니다.</p>
    </div>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="color: #374151; margin-bottom: 15px; font-size: 18px;">📋 가입자 정보</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600; width: 120px;">이름</td>
          <td style="padding: 10px 0; color: #111827;">${formData.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">이메일</td>
          <td style="padding: 10px 0; color: #111827;">${formData.email}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">학교</td>
          <td style="padding: 10px 0; color: #111827;">${schoolInfo?.name || '정보 없음'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">학교 코드</td>
          <td style="padding: 10px 0; color: #111827;">${formData.schoolCode}</td>
        </tr>
        ${formData.employeeId ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">교직원 번호</td>
          <td style="padding: 10px 0; color: #111827;">${formData.employeeId}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">직책</td>
          <td style="padding: 10px 0; color: #111827;">${roleNames[formData.role] || formData.role}</td>
        </tr>
        ${formData.gradeLevel || formData.classNumber ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">담당</td>
          <td style="padding: 10px 0; color: #111827;">${formData.gradeLevel ? formData.gradeLevel + '학년' : ''} ${formData.classNumber ? formData.classNumber + '반' : ''}</td>
        </tr>
        ` : ''}
        ${formData.department ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">부서/교과</td>
          <td style="padding: 10px 0; color: #111827;">${formData.department}</td>
        </tr>
        ` : ''}
        ${formData.phone ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">연락처</td>
          <td style="padding: 10px 0; color: #111827;">${formData.phone}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="color: #92400e; margin-bottom: 10px; font-size: 18px;">⚠️ 승인 대기 중</h3>
      <p style="color: #78350f; line-height: 1.6;">
        관리자 승인이 완료되면 해당 교직원이 시스템을 사용할 수 있습니다.<br>
        Supabase 대시보드에서 users 테이블의 <strong>is_active</strong> 컬럼을 <strong>true</strong>로 변경하여 승인해주세요.
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
        이 알림은 와이즈온스쿨 회원가입 시스템에서 자동으로 발송되었습니다.<br>
        가입 일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}<br>
        사용자 ID: ${userData?.id || 'N/A'}
      </p>
    </div>
  </div>
</div>
          `
        });
      } catch (emailError) {
        // 이메일 전송 실패해도 회원가입은 성공이므로 경고만 출력
        console.warn('관리자 이메일 알림 전송 실패:', emailError);
      }

      // 9. 성공 메시지 및 로그인 페이지로 이동
      alert(
        "회원가입이 완료되었습니다!\n관리자 승인 후 로그인이 가능합니다.",
      );
      navigate("/login");
    } catch (error: any) {
      console.error("Signup failed:", error);
      setError(error.message || "회원가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link to="/login" className="flex">
            <div className="h-fit w-fit self-start">
              <img src="/logo_school.png" alt="WiseOn School Logo" />
            </div>
          </Link>
          <h2 className="mt-8 text-center text-3xl font-bold text-gray-950">
            교직원 회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            교우관계 분석 시스템에 오신 것을 환영합니다
          </p>

          {/* 회원가입 안내 */}
          <div className="mt-5 rounded border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-start">
              <svg
                className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="mb-1">회원가입 전 준비사항</p>
                <ul className="space-y-1">
                  <li>• 교직원 번호 (인사담당자 또는 관리자에게 문의)</li>
                  <li>• 학교 코드 (NEIS 시스템 또는 교무실에서 확인)</li>
                  <li>• 학교에서 사용하는 이메일 주소</li>
                  <li>• 담당 학년/반 정보 (해당되는 경우)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 진행 상태 표시 */}
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                1
              </div>
              <div
                className={`h-1 w-12 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}
              ></div>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                2
              </div>
              <div
                className={`h-1 w-12 ${step >= 3 ? "bg-blue-600" : "bg-gray-200"}`}
              ></div>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= 3
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                3
              </div>
            </div>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 rounded-xl bg-white p-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                이용약관 동의
              </h3>

              {/* 전체 동의 */}
              <div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-3">
                <label className="flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={agreements.allAgreed}
                    onChange={() => handleAgreementChange("allAgreed")}
                    className="h-5 w-5 rounded border-[#09090B] text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-base font-semibold text-gray-950">
                    전체 약관에 동의합니다
                  </span>
                </label>
              </div>

              {/* 개별 약관 */}
              <div className="space-y-3">
                {/* 서비스 이용약관 (필수) */}
                <div className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="flex flex-1 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={agreements.serviceTerms}
                        onChange={() => handleAgreementChange("serviceTerms")}
                        className="h-4 w-4 rounded border-[#09090B] text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-950">
                        [필수] 서비스 이용약관
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal("service")}
                      className="ml-2 text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      전문보기
                    </button>
                  </div>
                </div>

                {/* 개인정보 수집 및 이용 동의 (필수) */}
                <div className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="flex flex-1 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={agreements.privacyPolicy}
                        onChange={() => handleAgreementChange("privacyPolicy")}
                        className="h-4 w-4 rounded border-[#09090B] text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-950">
                        [필수] 개인정보 수집 및 이용 동의
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal("privacy")}
                      className="ml-2 text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      전문보기
                    </button>
                  </div>
                </div>

                {/* 제3자 제공 동의 (선택) */}
                {/* <div className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="flex flex-1 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={agreements.thirdParty}
                      onChange={() => handleAgreementChange("thirdParty")}
                        className="h-4 w-4 rounded border-[#09090B] text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        [선택] 개인정보 제3자 제공 동의
                      </span>
                    </label>
                    <button
                      type="button"
                     onClick={() => setShowTermsModal("third_party")}
                      className="ml-2 text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      전문보기
                    </button>
                  </div>
                </div> */}
              </div>

              <p className="text-xs text-gray-600">
                • 필수 항목에 동의하지 않으실 경우, 서비스 이용이 제한될 수
                있습니다.
                {/* <br />• 선택 항목은 동의하지 않아도 서비스를 이용하실 수
                  있습니다. */}
              </p>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={!agreements.serviceTerms || !agreements.privacyPolicy}
                className="group relative flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                다음 단계
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {/* 로그인 페이지로 이동 */}
              <div className="pt-5 text-center">
                <span className="text-sm text-gray-600">
                  이미 계정이 있으신가요?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-blue-700 hover:text-blue-600"
                  >
                    로그인
                  </Link>
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 rounded-xl bg-white p-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                개인정보 입력
              </h3>

              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-base text-gray-700"
                >
                  이름 *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="성명을 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-base text-gray-700"
                >
                  이메일 *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="example@school.edu"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-base text-gray-700"
                >
                  비밀번호 *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="8자 이상 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-base text-gray-700"
                >
                  비밀번호 확인 *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-base text-gray-700"
                >
                  연락처
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="010-1234-5678"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg
                    className="mr-2 inline h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  이전
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  다음 단계
                  <svg
                    className="ml-2 inline h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* 로그인 페이지로 이동 */}
              <div className="pt-5 text-center">
                <span className="text-sm text-gray-600">
                  이미 계정이 있으신가요?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-blue-700 hover:text-blue-600"
                  >
                    로그인
                  </Link>
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 rounded-xl bg-white p-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                학교정보 입력
              </h3>

              <div>
                <label
                  htmlFor="schoolCode"
                  className="mb-1 block text-base text-gray-700"
                >
                  학교 코드 *
                  <span className="ml-2.5 text-[13px] text-gray-700">
                    🏫 교육청에서 부여한 학교 고유코드
                  </span>
                </label>
                <div className="flex space-x-2">
                  <input
                    id="schoolCode"
                    name="schoolCode"
                    type="text"
                    required
                    value={formData.schoolCode}
                    onChange={handleInputChange}
                    className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="예: B100000123, 7530120, SEOUL-E-001"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSchoolSearch(true)}
                    className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg
                      className="mr-1 inline h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    검색
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  • NEIS 시스템의 학교코드 또는 교육청 부여 코드
                  <br />• 행정실이나 교무실에서 확인 가능
                </p>
              </div>

              <div>
                <label
                  htmlFor="employeeId"
                  className="mb-1 block text-base text-gray-700"
                >
                  교직원 번호
                  <span className="ml-2.5 text-[13px] text-gray-700">
                    💡 학교에서 발급받은 고유번호 (선택사항)
                  </span>
                </label>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="예: T202400123, EMP-2024-001"
                />
                <p className="mt-1 text-xs text-gray-500">
                  • 인사담당자나 관리자에게 문의하세요
                  <br />
                  {/* • 보통 'T' + 연도 + 순번 또는 'EMP-' + 연도 + 순번 형식 */}
                </p>
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  직책 *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="homeroom_teacher">담임교사</option>
                  <option value="grade_teacher">학년부장</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="gradeLevel"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    담당 학년
                  </label>
                  <input
                    id="gradeLevel"
                    name="gradeLevel"
                    type="text"
                    value={formData.gradeLevel}
                    onChange={handleInputChange}
                    className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="예: 3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="classNumber"
                    className="mb-1 block text-base text-gray-700"
                  >
                    담당 반
                  </label>
                  <input
                    id="classNumber"
                    name="classNumber"
                    type="text"
                    value={formData.classNumber}
                    onChange={handleInputChange}
                    className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="예: 1"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="department"
                  className="mb-1 block text-base text-gray-700"
                >
                  부서/교과
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="relative block w-full appearance-none rounded-lg border border-[#e4e4e7] px-[13px] py-[11.5px] text-sm text-gray-900 placeholder-[#71717a] focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="예: 학생부"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg
                    className="mr-2 inline h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  이전
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      가입 중...
                    </div>
                  ) : (
                    "회원가입 완료"
                  )}
                </button>
              </div>

              {/* 로그인 페이지로 이동 */}
              <div className="pt-5 text-center">
                <span className="text-sm text-gray-600">
                  이미 계정이 있으신가요?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-blue-700 hover:text-blue-600"
                  >
                    로그인
                  </Link>
                </span>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p className="font-medium text-orange-600">
            ⚠️ 관리자 승인 후 로그인이 가능합니다.
          </p>
          <p>승인 상태는 이메일로 안내드립니다.</p>
        </div>
      </div>

      {/* 약관 모달 */}
      {showTermsModal && (
        <TermsModal
          type={showTermsModal}
          onClose={() => setShowTermsModal(null)}
        />
      )}

      {/* 학교 검색 모달 */}
      {showSchoolSearch && (
        <SchoolSearchModal
          onClose={() => setShowSchoolSearch(false)}
          onSelectSchool={(schoolCode: string) => {
            setFormData((prev) => ({ ...prev, schoolCode }));
            setShowSchoolSearch(false);
          }}
        />
      )}
    </div>
  );
};

export default Signup;
