import React, { useState, useEffect } from "react";
import { SurveyService, SurveyWithStats } from "../services/surveyService";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import EditSurveyModal from "../components/EditSurveyModal";
// import CreateSurveyModal from '../components/CreateSurveyModal'; // 새 설문 생성 주석 처리
import MobileSendModal from "../components/MobileSendModal";
import { NotificationService } from "../services/notificationService";
import { useAuth } from "../contexts/AuthContext";

// 설문 상태 표시를 위한 설정
const surveyStatusConfig = {
  waiting: { label: "대기중", color: "bg-yellow-100 text-yellow-800" },
  active: { label: "진행중", color: "bg-blue-100 text-blue-800" },
  completed: { label: "완료", color: "bg-green-100 text-green-800" },
};

// 설문 아이템 컴포넌트
const SurveyItem: React.FC<{
  survey: SurveyWithStats;
  onEdit: (survey: SurveyWithStats) => void;
  onDelete: (surveyId: string) => void;
  // onSendMobile: (survey: SurveyWithStats) => void; // 모바일 발송 주석 처리
  onGetSurveyLink: (survey: SurveyWithStats) => void;
  onMonitor: (survey: SurveyWithStats) => void;
  onStatusChange: (surveyId: string, newStatus: string) => void;
}> = ({
  survey,
  onEdit,
  onDelete,
  /* onSendMobile, */ onGetSurveyLink,
  onMonitor,
  onStatusChange,
}) => {
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const statusConfig =
    surveyStatusConfig[survey.status as keyof typeof surveyStatusConfig];

  const handleStatusChange = async (newStatus: string) => {
    if (isStatusChanging) return; // 이미 변경 중이면 무시

    console.log("🔍 SurveyItem handleStatusChange 호출:", {
      surveyId: survey.id,
      surveyTitle: survey.title,
      newStatus,
      surveyIdType: typeof survey.id,
    });

    setIsStatusChanging(true);
    try {
      await onStatusChange(survey.id, newStatus);
    } finally {
      setIsStatusChanging(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            {survey.title}
          </h3>
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">
            {survey.description}
          </p>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              기간: {survey.start_date} ~ {survey.end_date}
            </span>
            <span>응답: {survey.response_count || 0}명</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 상태 변경 드롭다운 */}
          <select
            value={survey.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isStatusChanging}
            className={`rounded-full border-0 px-2 py-1 text-xs font-medium transition-all focus:ring-2 focus:ring-blue-500 ${
              isStatusChanging
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            } ${statusConfig?.color || "bg-gray-100 text-gray-800"}`}
          >
            <option value="waiting">대기중</option>
            <option value="active">진행중</option>
            <option value="completed">완료</option>
          </select>

          {/* 상태 변경 중 표시 */}
          {isStatusChanging && (
            <div className="flex items-center text-xs text-blue-600">
              <svg
                className="mr-1 h-3 w-3 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              변경 중...
            </div>
          )}

          <div className="flex space-x-2">
            {/* 모바일 발송 버튼 주석 처리 */}
            {/* {(survey.status === 'active' || survey.status === 'draft') && (
              <button
                onClick={() => onSendMobile(survey)}
                className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-full hover:bg-green-200 transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                모바일 발송(개발중)
              </button>
            )} */}
            {(survey.status === "active" || survey.status === "draft") && (
              <button
                onClick={() => onGetSurveyLink(survey)}
                className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200"
              >
                <svg
                  className="mr-1 h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                링크 복사
              </button>
            )}
            {survey.status === "active" && (
              <button
                onClick={() => onMonitor(survey)}
                className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-200"
              >
                <svg
                  className="mr-1 h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                모니터링
              </button>
            )}
            {/* 수정 버튼 - 진행중이거나 완료 상태가 아닐 때만 표시 */}
            {survey.status !== "active" && survey.status !== "completed" && (
              <button
                onClick={() => onEdit(survey)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                수정
              </button>
            )}
            {/* 삭제 버튼 - 진행중 상태가 아닐 때만 표시 */}
            {survey.status !== "active" && (
              <button
                onClick={() => onDelete(survey.id)}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="text-xs text-gray-500">
          생성일: {new Date(survey.created_at || "").toLocaleDateString()}
        </div>
        <div className="text-xs text-gray-500">
          대상: {survey.target_grades?.join(", ")}학년{" "}
          {survey.target_classes?.join(", ")}반
        </div>
      </div>
    </div>
  );
};

// 설문 생성 모달 컴포넌트 - 이제 별도 파일로 분리됨

const SurveyManagement: React.FC = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // 새 설문 생성 주석 처리
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyWithStats | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSurvey, setDeletingSurvey] = useState<SurveyWithStats | null>(
    null,
  );
  // const [isMobileSendModalOpen, setIsMobileSendModalOpen] = useState(false);
  // const [selectedSurveyForMobile, setSelectedSurveyForMobile] = useState<SurveyWithStats | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedSurveyForLink, setSelectedSurveyForLink] =
    useState<SurveyWithStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 페이지네이션 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // 상태 필터 초기화 확인
  useEffect(() => {
    console.log("🔍 현재 상태 필터:", statusFilter);
  }, [statusFilter]);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);

  // 사용자 정보 및 학교 ID 조회
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (!user) {
          console.log("🔍 사용자 정보가 없습니다. 로그인 페이지로 이동합니다.");
          window.location.href = "/login";
          return;
        }

        console.log("🔍 사용자 정보:", {
          id: user.id,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          school_id: user.school_id,
          grade: user.grade,
          class: user.class,
        });

        setCurrentUser(user);

        // 사용자의 학교 정보 조회
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (userError) throw userError;

        // teacherInfo 설정 (담임교사 자동 설정을 위해)
        setTeacherInfo(userData);
        console.log("🔍 teacherInfo 설정 완료:", userData);

        // 학교 ID 설정 (사용자 권한에 따라)
        let schoolId = "";

        if (
          user.role === "homeroom_teacher" ||
          user.role === "grade_teacher" ||
          user.role === "school_admin"
        ) {
          // 담임교사, 학년담당, 학교 관리자는 특정 학교에 속함
          schoolId = user.school_id || user.schoolId || "";

          if (!schoolId) {
            throw new Error(
              "학교 정보가 설정되지 않았습니다. 관리자에게 문의하세요.",
            );
          }
        } else if (user.role === "district_admin") {
          // 교육청 관리자는 특정 교육청에 속함
          // district_id는 userData에서 가져와야 함
          const districtId = userData.district_id || "";

          if (!districtId) {
            throw new Error(
              "교육청 정보가 설정되지 않았습니다. 관리자에게 문의하세요.",
            );
          }

          // 교육청 관리자의 경우 모든 학교의 설문을 볼 수 있도록 빈 문자열로 설정
          schoolId = "";
        } else if (user.role === "main_admin") {
          // 시스템 관리자는 모든 설문을 볼 수 있도록 빈 문자열로 설정
          schoolId = "";
        } else {
          throw new Error("알 수 없는 사용자 권한입니다.");
        }

        setUserSchoolId(schoolId);

        console.log("🔍 사용자 정보 설정 완료:", {
          user,
          userData,
          schoolId,
          userRole: user.role,
        });
      } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
        // 에러 발생 시 로그인 페이지로 이동
        window.location.href = "/login";
      }
    };

    fetchCurrentUser();
  }, [user]);

  // 설문 데이터 로드 함수
  const loadSurveys = async () => {
    if (!userSchoolId) {
      console.log("🔍 학교 ID가 없어 설문 데이터를 로드할 수 없음");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 설문 상태 자동 업데이트 실행
      console.log("🔍 설문 상태 자동 업데이트 시작");
      await SurveyService.updateAllSurveyStatuses();
      console.log("🔍 설문 상태 자동 업데이트 완료");

      // 상태 업데이트 후 잠시 대기 (데이터베이스 반영 시간)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("🔍 설문 데이터 로드 시작:", {
        userSchoolId,
        statusFilter,
        teacherInfo: {
          role: teacherInfo?.role,
          grade: teacherInfo?.grade_level,
          class: teacherInfo?.class_number,
          school: teacherInfo?.school_id,
        },
        user: {
          role: user?.role,
          grade: user?.grade,
          class: user?.class,
          schoolId: user?.school_id || user?.schoolId,
        },
      });

      let surveysData: SurveyWithStats[];

      // 사용자 권한에 따른 설문 데이터 가져오기
      if (user?.role === "homeroom_teacher" && user?.grade && user?.class) {
        // 담임선생님: 자신의 담당 학년/반의 설문만
        console.log("🔍 담임선생님용 설문 조회:", {
          schoolId: userSchoolId,
          grade: user.grade,
          class: user.class,
        });

        surveysData = await SurveyService.getSurveysBySchoolGradeClass(
          userSchoolId,
          user.grade,
          user.class,
        );

        console.log("🔍 담임선생님용 설문 데이터 로드 완료:", {
          schoolId: userSchoolId,
          grade: user.grade,
          class: user.class,
          count: surveysData.length,
          surveys: surveysData.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          })),
        });
      } else if (user?.role === "grade_teacher" && user?.grade) {
        // 학년담당: 해당 학년의 설문
        console.log("🔍 학년담당용 설문 조회:", {
          schoolId: userSchoolId,
          grade: user.grade,
        });

        surveysData = await SurveyService.getSurveysBySchoolGradeClass(
          userSchoolId,
          user.grade,
        );

        console.log("🔍 학년담당용 설문 데이터 로드 완료:", {
          schoolId: userSchoolId,
          grade: user.grade,
          count: surveysData.length,
          surveys: surveysData.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          })),
        });
      } else if (user?.role === "school_admin") {
        // 학교 관리자: 해당 학교의 모든 설문
        console.log("🔍 학교 관리자용 설문 조회:", { schoolId: userSchoolId });

        if (statusFilter !== "all") {
          surveysData = await SurveyService.getSurveysByStatus(
            userSchoolId,
            statusFilter as "waiting" | "active" | "completed" | "archived",
          );
        } else {
          surveysData = await SurveyService.getAllSurveys(userSchoolId);
        }

        console.log("🔍 학교 관리자용 설문 데이터 로드 완료:", {
          schoolId: userSchoolId,
          count: surveysData.length,
          surveys: surveysData.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          })),
        });
      } else if (user?.role === "district_admin") {
        // 교육청 관리자: 해당 교육청의 모든 학교 설문
        console.log("🔍 교육청 관리자용 설문 조회: 전체 학교");

        if (statusFilter !== "all") {
          surveysData = await SurveyService.getSurveysByStatus(
            "", // 빈 문자열로 모든 학교의 설문 조회
            statusFilter as "waiting" | "active" | "completed" | "archived",
          );
        } else {
          surveysData = await SurveyService.getAllSurveys(""); // 빈 문자열로 모든 학교의 설문 조회
        }

        console.log("🔍 교육청 관리자용 설문 데이터 로드 완료:", {
          count: surveysData.length,
          surveys: surveysData.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          })),
        });
      } else if (user?.role === "main_admin") {
        // 시스템 관리자: 모든 설문
        console.log("🔍 시스템 관리자용 설문 조회: 전체 시스템");

        if (statusFilter !== "all") {
          surveysData = await SurveyService.getSurveysByStatus(
            "all", // "all" 문자열로 모든 설문 조회
            statusFilter as "waiting" | "active" | "completed" | "archived",
          );
        } else {
          surveysData = await SurveyService.getAllSurveys("all"); // "all" 문자열로 모든 설문 조회
        }

        console.log("🔍 시스템 관리자용 설문 데이터 로드 완료:", {
          count: surveysData.length,
          surveys: surveysData.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          })),
        });
      } else {
        // 기타 역할: 학교 ID로 기본 설문 데이터
        console.log("🔍 기본 설문 조회:", { schoolId: userSchoolId });

        if (statusFilter !== "all") {
          surveysData = await SurveyService.getSurveysByStatus(
            userSchoolId,
            statusFilter as "waiting" | "active" | "completed" | "archived",
          );
        } else {
          surveysData = await SurveyService.getAllSurveys(userSchoolId);
        }

        console.log("🔍 기본 설문 데이터 로드 완료:", {
          schoolId: userSchoolId,
          count: surveysData.length,
          surveys: surveysData.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          })),
        });
      }

      console.log("🔍 필터링 전 설문 데이터:", {
        total: surveysData.length,
        byStatus: surveysData.reduce(
          (acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        allSurveys: surveysData.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          target_grades: s.target_grades,
          target_classes: s.target_classes,
          created_by: s.created_by,
          school_id: s.school_id,
        })),
      });

      // 사용자 역할에 따른 추가 필터링 (임시로 비활성화)
      console.log("🔍 필터링 전 사용자 정보:", {
        currentUserId: currentUser?.id,
        teacherRole: teacherInfo?.role,
        teacherGrade: teacherInfo?.grade_level,
        teacherClass: teacherInfo?.class_number,
      });

      // 임시로 모든 설문을 표시 (필터링 비활성화)
      console.log("🔍 필터링 비활성화: 모든 설문 표시");

      // 기존 필터링 로직 (주석 처리)
      /*
      if (currentUser?.id && teacherInfo?.role === 'homeroom_teacher') {
        // 담임교사: 자신이 생성한 설문만 표시
        const beforeFilterCount = surveysData.length;
        const filteredSurveys = surveysData.filter(survey => survey.created_by === currentUser.id);
        
        console.log('🔍 담임교사 필터링:', { 
          이전: beforeFilterCount, 
          이후: filteredSurveys.length,
          필터링된_수: beforeFilterCount - filteredSurveys.length,
          필터링된_설문: filteredSurveys.map(s => ({ id: s.id, title: s.title, created_by: s.created_by })),
          필터링_제외된_설문: surveysData.filter(s => s.created_by !== currentUser.id).map(s => ({ 
            id: s.id, 
            title: s.title, 
            created_by: s.created_by,
            role: '필터링 제외됨'
          }))
        });
        
        surveysData = filteredSurveys;
      }
      */

      console.log("🔍 최종 설문 목록 설정:", {
        count: surveysData.length,
        surveys: surveysData.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          grade: s.target_grades,
          class: s.target_classes,
        })),
      });

      // 데이터가 비어있으면 빈 배열로 설정
      if (surveysData.length === 0) {
        console.log("🔍 설문 데이터가 비어있음");
        setSurveys([]);
      } else {
        setSurveys(surveysData);
      }
    } catch (error) {
      console.error("🔍 설문 데이터 로드 실패:", error);
      setError("설문 데이터를 불러오는데 실패했습니다.");

      // 에러 발생 시 빈 배열로 설정
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  // 설문 데이터 로드
  useEffect(() => {
    if (
      !userSchoolId &&
      user?.role !== "district_admin" &&
      user?.role !== "main_admin"
    )
      return; // 학교 ID가 없으면 로드하지 않음 (단, 관리자는 제외)
    loadSurveys();
    // 페이지네이션 초기화
    setCurrentPage(1);
  }, [userSchoolId, statusFilter, user]);

  // 실시간 상태 업데이트 (5분마다)
  useEffect(() => {
    if (
      !userSchoolId &&
      user?.role !== "district_admin" &&
      user?.role !== "main_admin"
    )
      return;

    const interval = setInterval(
      () => {
        console.log("🔍 실시간 상태 업데이트 실행");
        loadSurveys();
      },
      5 * 60 * 1000,
    ); // 5분마다

    return () => clearInterval(interval);
  }, [userSchoolId, user]);

  // const handleCreateSurvey = async (surveyData: any) => {
  //   try {
  //     if (!userSchoolId || !currentUser?.id) {
  //       setError('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
  //       return;
  //     }

  //     console.log('🔍 설문 생성 데이터:', {
  //       surveyData,
  //       teacherInfo,
  //       userSchoolId,
  //       currentUser: currentUser.id
  //     });

  //     // questions 필드가 없으면 빈 배열로 설정
  //     const questions = surveyData.questions || [];

  //     const newSurvey = await SurveyService.createSurvey(
  //       userSchoolId,
  //       surveyData.title,
  //       surveyData.description,
  //       surveyData.template_id, // template_id 전달
  //       surveyData.target_grades,
  //       surveyData.target_classes,
  //       surveyData.start_date,
  //       surveyData.end_date,
  //       currentUser.id,
  //       questions
  //     );

  //     if (newSurvey) {
  //       console.log('🔍 새 설문 생성 성공:', newSurvey);

  //       // 새 설문을 기존 목록에 직접 추가 (즉시 UI 업데이트)
  //       const newSurveyWithStats = {
  //         ...newSurvey,
  //         response_count: 0,
  //         responseRate: 0
  //       };

  //       console.log('🔍 새 설문을 목록에 추가:', newSurveyWithStats);

  //       // 기존 목록에 새 설문 추가
  //       setSurveys(prev => {
  //         const updatedSurveys = [newSurveyWithStats, ...prev];
  //         console.log('🔍 설문 목록 업데이트:', {
  //           이전_수: prev.length,
  //           이후_수: updatedSurveys.length,
  //           새설문: { id: newSurveyWithStats.id, title: newSurveyWithStats.title }
  //         });
  //         return updatedSurveys;
  //       });

  //       // 성공 메시지 표시
  //       toast.success('설문이 성공적으로 생성되었습니다!');

  //       // 새 설문 생성 알림 생성
  //       try {
  //         await NotificationService.createSystemNotification(
  //           currentUser.id,
  //           'survey_created',
  //           {
  //             surveyTitle: newSurvey.title,
  //             surveyId: newSurvey.id,
  //             targetGrades: surveyData.target_grades,
  //             targetClasses: surveyData.target_classes
  //           },
  //           'success'
  //         );

  //         // 권한별 알림 생성 (학년부장, 학교 관리자 등)
  //         if (teacherInfo?.role && userSchoolId) {
  //           await NotificationService.createSystemNotification(
  //             currentUser.id,
  //             'survey_created',
  //             {
  //               surveyTitle: newSurvey.title,
  //               surveyId: newSurvey.id,
  //               targetGrades: surveyData.target_grades,
  //               targetClasses: surveyData.target_classes
  //             },
  //             'success'
  //           );
  //         }
  //       } catch (error) {
  //         console.error('알림 생성 오류:', error);
  //       }

  //       // 모달 닫기
  //       setIsCreateModalOpen(false);

  //       // 백그라운드에서 설문 목록 새로고침 (데이터 동기화)
  //       console.log('🔍 백그라운드에서 설문 목록 새로고침 시작');
  //       setTimeout(async () => {
  //         try {
  //           await loadSurveys();
  //           console.log('🔍 백그라운드 설문 목록 새로고침 완료');
  //         } catch (error) {
  //           console.error('🔍 백그라운드 설문 목록 새로고침 실패:', error);
  //         }
  //       }, 1000);
  //     } else {
  //       setError('설문 생성에 실패했습니다.');
  //     }
  //   } catch (error) {
  //     console.error('설문 생성 오류:', error);
  //     setError('설문 생성 중 오류가 발생했습니다.');
  //   }
  // };

  const handleEditSurvey = (survey: SurveyWithStats) => {
    setEditingSurvey(survey);
    setIsEditModalOpen(true);
  };

  const handleUpdateSurvey = async (updatedData: any) => {
    try {
      if (!editingSurvey) return;

      const updatedSurvey = await SurveyService.updateSurvey(editingSurvey.id, {
        title: updatedData.title,
        description: updatedData.description,
        start_date: updatedData.start_date,
        end_date: updatedData.end_date,
      });

      if (updatedSurvey) {
        setSurveys((prev) =>
          prev.map((survey) =>
            survey.id === editingSurvey.id ? updatedSurvey : survey,
          ),
        );
        setIsEditModalOpen(false);
        setEditingSurvey(null);
        toast.success("설문이 성공적으로 수정되었습니다!");
      }
    } catch (error) {
      console.error("Failed to update survey:", error);
      setError("설문 수정에 실패했습니다.");
    }
  };

  // 설문 삭제 관련 함수들
  const confirmDeleteSurvey = async () => {
    try {
      console.log("🔍 설문 삭제 시도:", { deletingSurvey });

      if (!deletingSurvey) {
        console.error("삭제할 설문이 없음");
        toast.error("삭제할 설문을 찾을 수 없습니다.");
        return;
      }

      console.log("🔍 SurveyService.deleteSurvey 호출 전:", {
        surveyId: deletingSurvey.id,
      });

      const success = await SurveyService.deleteSurvey(deletingSurvey.id);

      console.log("🔍 SurveyService.deleteSurvey 결과:", { success });

      if (success) {
        // 목록에서 삭제된 설문 제거
        setSurveys((prev) => {
          const updatedSurveys = prev.filter(
            (survey) => survey.id !== deletingSurvey.id,
          );
          console.log("🔍 설문 목록 업데이트:", {
            이전: prev.length,
            이후: updatedSurveys.length,
            삭제된ID: deletingSurvey.id,
          });
          return updatedSurveys;
        });

        setIsDeleteModalOpen(false);
        setDeletingSurvey(null);
        toast.success("설문이 성공적으로 삭제되었습니다!");

        console.log("🔍 설문 삭제 완료");
      } else {
        console.error("설문 삭제 실패: success = false");
        toast.error("설문 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("🔍 설문 삭제 중 오류 발생:", error);
      toast.error("설문 삭제에 실패했습니다.");
    }
  };

  const cancelDeleteSurvey = () => {
    setIsDeleteModalOpen(false);
    setDeletingSurvey(null);
  };

  // const handleSendMobileSurvey = (survey: SurveyWithStats) => {
  //   setSelectedSurveyForMobile(survey);
  //   setIsMobileSendModalOpen(true);
  // };

  const handleMobileSend = async (sendOptions: any) => {
    try {
      const { survey, method, includeQR, customMessage } = sendOptions;

      // TODO: 실제 모바일 발송 API 호출
      console.log("Sending mobile survey:", {
        surveyId: survey.id,
        method,
        includeQR,
        customMessage,
        targetGrades: survey.target_grades,
        targetClasses: survey.target_classes,
      });

      const methodMap: Record<string, string> = {
        sms: "SMS 문자",
        kakao: "카카오톡 알림톡",
        app_push: "앱 푸시 알림",
      };
      const methodName = methodMap[method] || "SMS 문자";

      alert(
        `모바일 설문 발송이 완료되었습니다!\n\n발송 방법: ${methodName}\n학생들에게 설문 링크가 전송되었습니다.`,
      );
    } catch (error) {
      console.error("Failed to send mobile survey:", error);
      alert("모바일 설문 발송에 실패했습니다.");
    }
  };

  const handleGetSurveyLink = (survey: SurveyWithStats) => {
    setSelectedSurveyForLink(survey);
    setIsLinkModalOpen(true);
  };

  const handleMonitorSurvey = (survey: SurveyWithStats) => {
    // 모니터링 페이지로 이동
    window.open(`/survey-monitoring/${survey.id}`, "_blank");
  };

  const handleStatusChange = async (surveyId: string, newStatus: string) => {
    try {
      console.log("🔍 설문 상태 변경 시도:", {
        surveyId,
        newStatus,
        surveyIdType: typeof surveyId,
        surveyIdLength: surveyId?.length,
        surveyIdValue: JSON.stringify(surveyId),
      });

      // surveyId 유효성 검사
      if (
        !surveyId ||
        surveyId === "1" ||
        surveyId === "undefined" ||
        surveyId === "null"
      ) {
        console.error("🔍 잘못된 surveyId:", {
          surveyId,
          type: typeof surveyId,
        });
        toast.error("잘못된 설문 ID입니다. 페이지를 새로고침해주세요.");
        return;
      }

      // 현재 설문 정보 찾기
      const currentSurvey = surveys.find((s) => s.id === surveyId);
      if (!currentSurvey) {
        console.error("🔍 설문을 찾을 수 없음:", {
          surveyId,
          availableIds: surveys.map((s) => ({ id: s.id, title: s.title })),
        });
        toast.error("설문을 찾을 수 없습니다.");
        return;
      }

      console.log("🔍 현재 설문 정보:", {
        id: currentSurvey.id,
        title: currentSurvey.title,
        currentStatus: currentSurvey.status,
      });

      // 상태가 실제로 변경되었는지 확인
      if (currentSurvey.status === newStatus) {
        console.log("🔍 상태가 동일함, 변경 불필요:", {
          surveyId,
          currentStatus: currentSurvey.status,
          newStatus,
        });
        return;
      }

      // SurveyService를 통해 상태 업데이트
      console.log("🔍 SurveyService 상태 업데이트 시도:", {
        surveyId,
        newStatus,
      });

      const success = await SurveyService.updateSurveyStatus(
        surveyId,
        newStatus,
      );

      if (success) {
        // 상태 변경 후 목록 즉시 업데이트
        setSurveys((prev) =>
          prev.map((survey) =>
            survey.id === surveyId
              ? {
                  ...survey,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                }
              : survey,
          ),
        );

        console.log("🔍 설문 상태 변경 성공:", {
          surveyId,
          oldStatus: currentSurvey.status,
          newStatus,
        });

        // 성공 메시지 표시
        const statusLabels = {
          draft: "작성중",
          active: "진행중",
          completed: "완료",
          archived: "보관",
        };

        toast.success(
          `설문 상태가 '${
            statusLabels[currentSurvey.status as keyof typeof statusLabels]
          }'에서 '${
            statusLabels[newStatus as keyof typeof statusLabels]
          }'로 변경되었습니다.`,
        );

        // 설문 상태 변경 알림 생성
        try {
          await NotificationService.createSystemNotification(
            currentUser?.id || "",
            "survey_status_changed",
            {
              surveyTitle: currentSurvey.title,
              oldStatus: currentSurvey.status,
              newStatus: newStatus,
              surveyId: surveyId,
            },
            "info",
          );

          // 권한별 알림 생성 (학년부장, 학교 관리자 등)
          if (teacherInfo?.role && userSchoolId) {
            await NotificationService.createRoleBasedNotification(
              teacherInfo.role,
              userSchoolId,
              "survey_status_changed",
              {
                title: "설문 상태 변경",
                message: `"${currentSurvey.title}" 설문의 상태가 ${
                  statusLabels[
                    currentSurvey.status as keyof typeof statusLabels
                  ]
                }에서 ${
                  statusLabels[newStatus as keyof typeof statusLabels]
                }로 변경되었습니다.`,
                type: "info",
                category: "설문",
              },
            );
          }
        } catch (error) {
          console.error("알림 생성 오류:", error);
        }
      } else {
        throw new Error("상태 업데이트가 실패했습니다.");
      }
    } catch (error) {
      console.error("🔍 설문 상태 변경 실패:", error);

      // 에러 메시지 표시
      toast.error("설문 상태 변경에 실패했습니다. 다시 시도해주세요.");

      // 에러 상태 설정
      setError("설문 상태 변경에 실패했습니다.");

      // 잠시 후 에러 메시지 제거
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    // 설문 ID로 설문 객체 찾기
    const survey = surveys.find((s) => s.id === surveyId);
    if (survey) {
      setDeletingSurvey(survey);
      setIsDeleteModalOpen(true);
    }
  };

  const filteredSurveys = surveys.filter((survey) => {
    const matchesSearch =
      survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (survey.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || survey.status === statusFilter;

    // 디버깅: 필터링 과정 로그
    if (searchTerm || statusFilter !== "all") {
      console.log("🔍 설문 필터링:", {
        surveyId: survey.id,
        title: survey.title,
        status: survey.status,
        matchesSearch,
        matchesStatus,
        searchTerm,
        statusFilter,
      });
    }

    return matchesSearch && matchesStatus;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSurveys = filteredSurveys.slice(startIndex, endIndex);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 스크롤을 맨 위로
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 페이지네이션 컴포넌트
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
        // 전체 페이지가 5개 이하면 모두 표시
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 현재 페이지 주변의 페이지들 표시
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // 끝 페이지가 totalPages에 가까우면 시작 페이지 조정
        if (endPage === totalPages) {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
          pages.push(i);
        }
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            이전
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            다음
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{startIndex + 1}</span> -{" "}
              <span className="font-medium">
                {Math.min(endIndex, filteredSurveys.length)}
              </span>{" "}
              / <span className="font-medium">{filteredSurveys.length}</span>{" "}
              개의 설문
            </p>
          </div>
          <div>
            <nav
              className="isolate inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="sr-only">이전</span>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    page === currentPage
                      ? "z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="sr-only">다음</span>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01-.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="mb-4">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">설문 관리</h1>
        <p className="text-gray-600">
          교우관계 분석을 위한 설문조사를 생성하고 관리합니다.
        </p>
        {/* 사용자 권한 정보 표시 */}
        {user?.role === "homeroom_teacher" && user?.grade && user?.class && (
          <div></div>
        )}
        {user?.role === "grade_teacher" && user?.grade && (
          <div className="mt-2 rounded-lg bg-green-50 p-3">
            <p className="text-sm text-green-800">
              <span className="font-semibold">학년담당 권한:</span> {user.grade}
              학년 담당
            </p>
          </div>
        )}
        {user?.role === "school_admin" && (
          <div className="mt-2 rounded-lg bg-purple-50 p-3">
            <p className="text-sm text-purple-800">
              <span className="font-semibold">학교 관리자 권한:</span> 전체 학교
              설문 관리
            </p>
          </div>
        )}
        {user?.role === "district_admin" && (
          <div className="mt-2 rounded-lg bg-orange-50 p-3">
            <p className="text-sm text-orange-800">
              <span className="font-semibold">교육청 관리자 권한:</span> 전체
              교육청 설문 관리
            </p>
          </div>
        )}
        {user?.role === "main_admin" && (
          <div className="mt-2 rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-800">
              <span className="font-semibold">시스템 관리자 권한:</span> 전체
              시스템 설문 관리
            </p>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 컨트롤 패널 */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            {/* 검색 */}
            <div className="relative">
              <input
                type="text"
                placeholder="설문 제목 또는 설명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-80"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-400"
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
              </div>
            </div>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">진행중</option>
              <option value="completed">완료</option>
            </select>

            {/* 페이지당 항목 수 선택 */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // 페이지당 항목 수 변경 시 첫 페이지로
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5개씩</option>
              <option value={10}>10개씩</option>
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
            </select>
          </div>

          {/* 새 설문 생성 버튼 - 주석 처리 */}
          {/* <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>새 설문 생성</span>
            </button> */}
        </div>
      </div>

      {/* 설문 목록 */}
      <div className="space-y-3">
        {filteredSurveys.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              설문이 없습니다
            </h3>
            <p className="mb-4 text-gray-500">
              새로운 설문을 생성하여 시작해보세요.
            </p>
            {/* 첫 설문 생성하기 버튼 - 주석 처리 */}
            {/* <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                첫 설문 생성하기
              </button> */}
          </div>
        ) : (
          <>
            {/* 설문 목록 */}
            <div className="space-y-3">
              {currentSurveys.map((survey) => (
                <SurveyItem
                  key={survey.id}
                  survey={survey}
                  onEdit={handleEditSurvey}
                  onDelete={handleDeleteSurvey}
                  // onSendMobile={handleSendMobileSurvey} // 모바일 발송 주석 처리
                  onGetSurveyLink={handleGetSurveyLink}
                  onMonitor={handleMonitorSurvey}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>

            {/* 페이지네이션 */}
            <Pagination />
          </>
        )}
      </div>

      {/* 설문 생성 모달 - 주석 처리 */}
      {/* <CreateSurveyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSurvey}
        teacherInfo={teacherInfo}
      /> */}

      {/* 모바일 발송 모달 */}
      {/* <MobileSendModal
        isOpen={isMobileSendModalOpen}
        onClose={() => setIsMobileSendModalOpen(false)}
        survey={selectedSurveyForMobile}
        onSend={handleMobileSend}
      /> */}

      {/* 설문 수정 모달 */}
      <EditSurveyModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSurvey(null);
        }}
        onSubmit={handleUpdateSurvey}
        survey={editingSurvey}
      />

      {/* 설문 삭제 확인 모달 */}
      {isDeleteModalOpen && deletingSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                설문 삭제 확인
              </h3>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-gray-600">
                다음 설문을 삭제하시겠습니까?
              </p>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">
                  {deletingSurvey.title}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {deletingSurvey.description}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  상태:{" "}
                  {deletingSurvey.status === "draft"
                    ? "작성중"
                    : deletingSurvey.status === "active"
                      ? "진행중"
                      : deletingSurvey.status === "completed"
                        ? "완료"
                        : "보관"}
                </p>
              </div>
              <p className="mt-3 text-sm text-red-600">
                ⚠️ 이 작업은 되돌릴 수 없으며, 설문 응답 데이터도 함께
                삭제됩니다.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelDeleteSurvey}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteSurvey}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 링크 복사 모달 */}
      {isLinkModalOpen && selectedSurveyForLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                설문 링크 공유
              </h3>
            </div>

            <div className="mb-6">
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-medium text-gray-900">
                  {selectedSurveyForLink.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedSurveyForLink.description}
                </p>
              </div>

              {/* 설문 링크 */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  설문 링크
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={`${window.location.origin}/survey/${selectedSurveyForLink.id}`}
                    readOnly
                    className="flex-1 rounded-l-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/survey/${selectedSurveyForLink.id}`,
                      );
                      toast.success("링크가 클립보드에 복사되었습니다!");
                    }}
                    className="rounded-r-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                  >
                    복사
                  </button>
                </div>
              </div>

              {/* 문자 메시지 템플릿 */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  문자 메시지 템플릿
                </label>
                <textarea
                  value={`안녕하세요! ${selectedSurveyForLink.title} 설문에 참여해주세요.\n\n설문 링크: ${window.location.origin}/survey/${selectedSurveyForLink.id}\n\n설문 기간: ${selectedSurveyForLink.start_date} ~ ${selectedSurveyForLink.end_date}\n\n많은 참여 부탁드립니다.`}
                  readOnly
                  rows={6}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `안녕하세요! ${selectedSurveyForLink.title} 설문에 참여해주세요.\n\n설문 링크: ${window.location.origin}/survey/${selectedSurveyForLink.id}\n\n설문 기간: ${selectedSurveyForLink.start_date} ~ ${selectedSurveyForLink.end_date}\n\n많은 참여 부탁드립니다.`,
                    );
                    toast.success("메시지가 클립보드에 복사되었습니다!");
                  }}
                  className="mt-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
                >
                  메시지 복사
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedSurveyForLink(null);
                }}
                className="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyManagement;
