import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline/index.js";
import { unifiedNetworkAnalysisService } from "../services/unifiedNetworkAnalysisService";
import { IndividualAnalysisResult } from "../types/unifiedNetworkTypes";

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  student_number: string;
  gender: string;
  birth_date: string;
  phone: string | null;
  enrolled_at: string;
  network_metrics?: any;
  teacher_memos?: any[];
  intervention_logs?: any[];
  parent_contact?: any;
  parent_consent?: boolean;
}

interface TeacherMemo {
  id: string;
  content: string;
  created_at: string;
  teacher_name?: string;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  // 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [editMemoModalOpen, setEditMemoModalOpen] = useState(false);
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [deleteStudentModalOpen, setDeleteStudentModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<TeacherMemo | null>(null);
  const [newMemoContent, setNewMemoContent] = useState("");
  const [editMemoContent, setEditMemoContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("memo");

  // 학생 추가 폼 상태
  const [newStudent, setNewStudent] = useState({
    name: "",
    grade: "",
    class: "",
    student_number: "",
    gender: "male",
    birth_date: "",
    phone: "",
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
  });

  // 담임 정보 및 정렬 관련 상태
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [unifiedAnalysisData, setUnifiedAnalysisData] = useState<
    Map<string, IndividualAnalysisResult>
  >(new Map());
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // 통합 서비스를 사용한 학생 네트워크 분석 데이터 로드
  const loadUnifiedAnalysisData = async () => {
    if (!teacherInfo || students.length === 0) return;

    try {
      setAnalysisLoading(true);

      // 최신 설문 ID 찾기
      const { data: surveys, error: surveyError } = await supabase
        .from("surveys")
        .select("id, title, status")
        .eq("school_id", teacherInfo.school_id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (surveyError || !surveys || surveys.length === 0) {
        return;
      }

      const latestSurvey = surveys[0];

      // 각 학생에 대한 개별 분석 수행
      const analysisMap = new Map<string, IndividualAnalysisResult>();

      for (const student of students) {
        try {
          const analysis =
            await unifiedNetworkAnalysisService.getIndividualAnalysis(
              latestSurvey.id,
              student.id,
            );
          analysisMap.set(student.id, analysis);
        } catch (error) {
          console.error(`학생 ${student.name} 분석 오류:`, error);
        }
      }

      setUnifiedAnalysisData(analysisMap);
    } catch (error) {
      console.error("❌ 통합 분석 데이터 로드 오류:", error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!teacherInfo) return;
    fetchStudents();
  }, [teacherInfo]);

  useEffect(() => {
    if (students.length > 0) {
      loadUnifiedAnalysisData();
    }
  }, [students]);

  // 담임선생님 정보가 로드되면 학생 추가 폼의 학년/반을 자동 설정
  useEffect(() => {
    if (teacherInfo?.grade_level && teacherInfo?.class_number) {
      setNewStudent((prev) => ({
        ...prev,
        grade: teacherInfo.grade_level,
        class: teacherInfo.class_number,
      }));
    }
  }, [teacherInfo]);

  // 권한별 접근 제어
  const canAccessPage = () => {
    if (!teacherInfo) return false;

    const allowedRoles = [
      "homeroom_teacher",
      "grade_teacher",
      "school_admin",
      "district_admin",
    ];
    return allowedRoles.includes(teacherInfo.role);
  };

  const getAccessScope = () => {
    if (!teacherInfo) return { type: "none", description: "" };

    switch (teacherInfo.role) {
      case "homeroom_teacher":
        return {
          type: "class",
          description: `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반 학생만`,
        };
      case "grade_teacher":
        return {
          type: "grade",
          description: `${teacherInfo.grade_level}학년 전체 학생`,
        };
      case "school_admin":
        return {
          type: "school",
          description: "학교 전체 학생",
        };
      case "district_admin":
        return {
          type: "district",
          description: "전체 소속 학교 학생",
        };
      default:
        return { type: "none", description: "" };
    }
  };

  const fetchCurrentUser = async () => {
    try {
      // 로컬 스토리지에서 사용자 정보 확인
      const userStr = localStorage.getItem("wiseon_user");
      const authToken = localStorage.getItem("wiseon_auth_token");

      if (!userStr || !authToken) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(userStr);
      setCurrentUser(user);

      // 사용자의 담임 정보 조회
      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (teacherError) throw teacherError;
      setTeacherInfo(teacherData);

      // 담임인 경우 학년과 반을 고정하고, 일반 사용자도 담임의 학년과 반을 기본값으로 설정
      if (teacherData && teacherData.role === "homeroom_teacher") {
        setGradeFilter(teacherData.grade_level || "all");
        setClassFilter(teacherData.class_number || "all");
      } else if (
        teacherData &&
        teacherData.grade_level &&
        teacherData.class_number
      ) {
        // 일반 사용자도 담임의 학년과 반을 기본값으로 설정
        setGradeFilter(teacherData.grade_level);
        setClassFilter(teacherData.class_number);
      }

      // 학교 이름 조회
      if (teacherData.school_id) {
        try {
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("name")
            .eq("id", teacherData.school_id)
            .single();

          if (!schoolError && schoolData) {
            setSchoolName(schoolData.name);
          }
        } catch (schoolError) {
          console.error("학교 이름 조회 오류:", schoolError);
          setSchoolName("알 수 없는 학교");
        }
      }
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      // 에러 발생 시 로그인 페이지로 이동
      window.location.href = "/login";
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // 권한별 학생 조회
      let query = supabase
        .from("students")
        .select(
          `
          *,
          parent_contact
        `,
        )
        .eq("is_active", true);

      // 학교별 필터링
      if (teacherInfo?.role === "district_admin") {
        // 교육청 관리자: 모든 학교 학생 조회 (필터링 없음)
      } else if (teacherInfo?.school_id) {
        // 다른 역할: 해당 학교 학생만 조회
        query = query.eq("current_school_id", teacherInfo.school_id);
      }

      // 역할별 추가 필터링
      if (
        teacherInfo?.role === "homeroom_teacher" &&
        teacherInfo.grade_level &&
        teacherInfo.class_number
      ) {
        query = query
          .eq("grade", teacherInfo.grade_level)
          .eq("class", teacherInfo.class_number);
      } else if (
        teacherInfo?.role === "grade_teacher" &&
        teacherInfo.grade_level
      ) {
        query = query.eq("grade", teacherInfo.grade_level);
      } else if (teacherInfo?.role === "school_admin") {
      } else if (teacherInfo?.role === "district_admin") {
      }

      const { data: studentsData, error: studentsError } = await query
        .order("grade", { ascending: true })
        .order("class", { ascending: true })
        .order("name", { ascending: true });

      if (studentsError) throw studentsError;

      if (studentsData && studentsData.length > 0) {
      }

      // 네트워크 분석 결과 조회 (지도 리포트와 동일한 방식)
      const { data: networkData, error: networkError } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("analysis_type", "complete_network_analysis")
        .order("calculated_at", { ascending: false })
        .limit(1);

      if (networkError) throw networkError;

      // 교사 메모 조회 (users 테이블과 조인하여 teacher_name 가져오기)
      const { data: memosData, error: memosError } = await supabase.from(
        "teacher_memos",
      ).select(`
          *,
          users!teacher_memos_teacher_id_fkey (
            name,
            email
          )
        `);

      if (memosError) throw memosError;

      // 개입 로그 조회
      const { data: interventionData, error: interventionError } =
        await supabase.from("intervention_logs").select("*");

      if (interventionError) throw interventionError;

      // 학생 데이터에 네트워크 메트릭, 메모, 개입 로그 연결 (지도 리포트와 동일한 방식)
      const studentsWithData = studentsData?.map((student) => {
        // parent_consent 필드 추가 (기본값: false)
        const studentWithConsent = {
          ...student,
          parent_consent: student.parent_consent || false,
        };
        // complete_network_analysis에서 해당 학생의 데이터 추출
        let metrics = null;
        if (networkData && networkData.length > 0) {
          const completeAnalysis = networkData[0];
          const recommendations = completeAnalysis.recommendations as any;
          const completeData = recommendations?.complete_analysis_data;

          if (completeData?.nodes) {
            const node = completeData.nodes.find(
              (n: any) =>
                n.id === student.id ||
                (n.name === student.name &&
                  n.grade === student.grade &&
                  n.class === student.class),
            );

            if (node) {
              metrics = {
                centrality_scores: {
                  centrality: node.centrality,
                  degree: node.centrality, // 호환성을 위해 degree도 설정
                  betweenness: node.betweenness || 0,
                  closeness: node.closeness || 0,
                },
                community_membership: node.community || 0,
                recommendations: node.recommendations || {},
              };
            }
          }
        }

        // 메모 데이터 매핑
        const studentMemos =
          memosData?.filter((m) => m.student_id === student.id) || [];
        const mappedMemos: TeacherMemo[] = studentMemos.map((memo) => ({
          id: memo.id,
          content: memo.content,
          created_at: memo.created_at || new Date().toISOString(),
          teacher_name: memo.users?.name || memo.users?.email || "교사",
        }));

        const interventions =
          interventionData?.filter((i) => i.student_id === student.id) || [];

        return {
          ...studentWithConsent,
          network_metrics: metrics,
          teacher_memos: mappedMemos,
          intervention_logs: interventions,
        };
      });

      setStudents(studentsWithData || []);
    } catch (error) {
      console.error("학생 데이터 조회 오류:", error);
      toast.error("학생 데이터를 불러오는 중 오류가 발생했습니다.");

      // 샘플 데이터 생성
      generateSampleStudents();
    } finally {
      setLoading(false);
    }
  };

  const generateSampleStudents = () => {
    const sampleStudents: Student[] = [
      {
        id: "1",
        name: "김지우",
        grade: "3",
        class: "2",
        student_number: "2024003",
        gender: "male",
        birth_date: "2017-01-10",
        phone: "010-1234-5678",
        enrolled_at: "2024-03-01",
        network_metrics: {
          centrality_scores: {
            degree: 0.6,
            betweenness: 0.4,
            closeness: 0.5,
          },
          community_membership: "group_a",
          risk_indicators: {
            isolation_score: "medium",
          },
          recommendations: "light_monitoring",
        },
        teacher_memos: [
          {
            id: "1",
            content:
              "조용한 편이지만 친구들과의 관계는 양호함. 좀 더 관심을 가져볼 필요가 있음.",
            created_at: "2025-08-11",
            teacher_name: "김선생님",
          },
        ],
        intervention_logs: [],
        parent_contact: {
          mother: {
            name: "김영희",
            phone: "010-1234-5678",
          },
          father: {
            name: "김철수",
            phone: "010-8765-4321",
          },
        },
        parent_consent: true,
      },
      {
        id: "2",
        name: "박서연",
        grade: "3",
        class: "2",
        student_number: "2024002",
        gender: "female",
        birth_date: "2017-07-22",
        phone: "010-2345-6789",
        enrolled_at: "2024-03-01",
        network_metrics: {
          centrality_scores: {
            degree: 0.8,
            betweenness: 0.6,
            closeness: 0.7,
          },
          community_membership: "group_a",
          risk_indicators: {
            isolation_score: "low",
          },
          recommendations: "no_action",
        },
        teacher_memos: [],
        intervention_logs: [],
        parent_contact: {
          mother: {
            name: "박미영",
            phone: "010-2345-6789",
          },
          father: {
            name: "박성호",
            phone: "010-9876-5432",
          },
        },
        parent_consent: false,
      },
      {
        id: "3",
        name: "이준호",
        grade: "3",
        class: "2",
        student_number: "2024001",
        gender: "male",
        birth_date: "2017-03-15",
        phone: "010-3456-7890",
        enrolled_at: "2024-03-01",
        network_metrics: {
          centrality_scores: {
            degree: 0.7,
            betweenness: 0.5,
            closeness: 0.6,
          },
          community_membership: "group_a",
          risk_indicators: {
            isolation_score: "low",
          },
          recommendations: "no_action",
        },
        teacher_memos: [
          {
            id: "2",
            content: "리더십이 뛰어나고 친구들을 잘 이끌어줌.",
            created_at: "2025-08-10",
            teacher_name: "이선생님",
          },
        ],
        intervention_logs: [],
        parent_contact: {
          mother: {
            name: "이순자",
            phone: "010-3456-7890",
          },
          father: {
            name: "이민수",
            phone: "010-0987-6543",
          },
        },
        parent_consent: true,
      },
    ];
    setStudents(sampleStudents);
  };

  const getGradeOptions = () => {
    if (students.length === 0) return [];
    const grades = students
      .map((s) => s.grade)
      .filter((grade, index, arr) => arr.indexOf(grade) === index)
      .sort((a, b) => parseInt(a) - parseInt(b));
    return grades;
  };

  const getClassOptions = () => {
    if (students.length === 0) return [];
    const classes = students
      .map((s) => s.class)
      .filter((cls, index, arr) => arr.indexOf(cls) === index)
      .sort((a, b) => parseInt(a) - parseInt(b));
    return classes;
  };

  const getRiskLevel = (student: Student) => {
    // 통합 분석 결과 우선 사용
    const unifiedAnalysis = unifiedAnalysisData.get(student.id);
    if (unifiedAnalysis) {
      return unifiedAnalysis.isolationRisk.level;
    }

    // 기존 방식 폴백
    if (!student.network_metrics) return "low";

    const centrality =
      student.network_metrics.centrality_scores?.centrality ||
      student.network_metrics.centrality_scores?.degree ||
      0;
    if (centrality < 0.3) return "high";
    if (centrality < 0.6) return "medium";
    return "low";
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case "high":
        return "주의 필요";
      case "medium":
        return "관찰 중";
      default:
        return "안정";
    }
  };

  // 주의학생 수 계산 함수
  const getHighRiskStudentCount = () => {
    return students.filter((student) => getRiskLevel(student) === "high")
      .length;
  };

  // 위험도별 학생 수 계산 함수
  const getRiskLevelCounts = () => {
    const counts = { high: 0, medium: 0, low: 0 };
    students.forEach((student) => {
      const riskLevel = getRiskLevel(student);
      counts[riskLevel as keyof typeof counts]++;
    });
    return counts;
  };

  const getGenderLabel = (gender: string) => {
    return gender === "male" ? "남자" : "여자";
  };

  // 객체를 안전하게 문자열로 변환하는 함수
  const safeStringify = (value: any): string => {
    try {
      if (value === undefined || value === null) return "N/A";

      // 배열인 경우 JSON.stringify로 변환
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }

      // 객체인 경우 JSON.stringify로 변환
      if (typeof value === "object") {
        return JSON.stringify(value);
      }

      // 문자열이나 숫자인 경우 그대로 반환
      return String(value);
    } catch (error) {
      console.error("값 변환 오류:", error, value);
      return "N/A";
    }
  };

  // DB role을 사용자 친화적인 직책으로 변환
  const getRoleDisplayName = (role: string | undefined) => {
    if (!role) return "없음";

    switch (role) {
      case "homeroom_teacher":
        return "담임교사";
      case "grade_lead":
        return "학년부장";
      case "school_admin":
        return "학교 관리자";
      case "district_admin":
        return "교육청 관리자";
      case "grade_teacher":
        return "학년 담당 교사";
      default:
        return role;
    }
  };

  // 전화번호 포맷팅 함수 (자동 하이픈 추가)
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "");

    // 길이에 따라 하이픈 추가
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      // 11자리 초과 시 11자리까지만
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  // Excel 날짜 serial number를 실제 날짜로 변환하는 함수
  const convertExcelDate = (excelDate: any): string => {
    if (!excelDate) return new Date().toISOString().split("T")[0];

    // 숫자인 경우 Excel serial number로 처리
    if (typeof excelDate === "number" || !isNaN(Number(excelDate))) {
      const serialNumber = Number(excelDate);
      // Excel의 시작 날짜는 1900년 1월 1일 (serial number 1)
      // 1900년 1월 1일부터의 일수를 계산
      const excelStartDate = new Date(1900, 0, 1);
      const targetDate = new Date(
        excelStartDate.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000,
      );
      return targetDate.toISOString().split("T")[0];
    }

    // 이미 날짜 형식인 경우 그대로 반환
    if (typeof excelDate === "string") {
      // YYYY-MM-DD 형식인지 확인
      if (/^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
        return excelDate;
      }
      // 다른 형식의 날짜 문자열인 경우 Date 객체로 파싱
      const parsedDate = new Date(excelDate);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split("T")[0];
      }
    }

    // 기본값으로 현재 날짜 반환
    return new Date().toISOString().split("T")[0];
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_number.includes(searchTerm);
    const matchesGrade = gradeFilter === "all" || student.grade === gradeFilter;
    const matchesClass = classFilter === "all" || student.class === classFilter;

    let matchesRisk = true;
    if (riskFilter !== "all") {
      const riskLevel = getRiskLevel(student);
      matchesRisk = riskLevel === riskFilter;
    }

    return matchesSearch && matchesGrade && matchesClass && matchesRisk;
  });

  // 학생 정렬 함수
  const sortStudents = (students: Student[]) => {
    return [...students].sort((a, b) => {
      let aValue: any = a[sortField as keyof Student];
      let bValue: any = b[sortField as keyof Student];

      // 특별한 정렬 로직
      switch (sortField) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "student_number":
          aValue = parseInt(a.student_number);
          bValue = parseInt(b.student_number);
          break;
        case "grade":
          aValue = parseInt(a.grade);
          bValue = parseInt(b.grade);
          break;
        case "class":
          aValue = parseInt(a.class);
          bValue = parseInt(b.class);
          break;
        case "risk_level":
          aValue = getRiskLevel(a);
          bValue = getRiskLevel(b);
          break;
        case "network_centrality":
          aValue =
            a.network_metrics?.centrality_scores?.centrality ||
            a.network_metrics?.centrality_scores?.degree ||
            0;
          bValue =
            b.network_metrics?.centrality_scores?.centrality ||
            b.network_metrics?.centrality_scores?.degree ||
            0;
          break;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedStudents = sortStudents(filteredStudents);

  // 정렬 방향 토글 함수
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // 정렬 아이콘 렌더링 함수
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-blue-600" />
    );
  };

  const handleDownloadTemplate = () => {
    // Excel 템플릿 생성
    const headers = [
      "번호 *",
      "이름 *",
      "학년 *",
      "반 *",
      "성별 *",
      "생년월일 *",
      "입학일",
      "휴대폰 *",
      "어머니_이름",
      "어머니_전화번호",
      "아버지_이름",
      "아버지_전화번호",
    ];

    const infoRow = headers.map((_, index) =>
      index === 0
        ? "※ 필수 입력 항목은 *로 표시되어 있으며, 공란으로 업로드하면 실패합니다."
        : "",
    );

    const sampleData = [
      "1",
      "홍길동",
      "3",
      "2",
      "남자",
      "2017-01-01",
      "2024-03-01",
      "010-4321-1234",
      "홍엄마",
      "010-1234-5678",
      "홍아빠",
      "010-8765-4321",
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 워크시트 데이터 생성
    const worksheetData = [infoRow, headers, sampleData];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // 컬럼 너비 자동 조정
    const columnWidths = headers.map((header) => ({
      wch: Math.max(header.length, 15),
    }));
    worksheet["!cols"] = columnWidths;

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, "학생명단");

    // 파일 다운로드
    XLSX.writeFile(workbook, "학생_명단_템플릿.xlsx");

    toast.success("Excel 템플릿이 다운로드되었습니다.");
  };

  const normalizeHeader = (header: string | undefined) => {
    if (!header) return "";
    return header.replace(/\s*(\(필수\)|\*)\s*$/, "").trim();
  };

  const handleUploadStudents = () => {
    // 담임선생님의 학교 정보 확인
    if (!teacherInfo?.school_id) {
      toast.error("학교 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.");
      return;
    }

    // 파일 입력 요소 생성
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv,.xlsx,.xls";
    fileInput.style.display = "none";

    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      try {
        // 파일 확장자 확인
        const fileExtension = file.name.split(".").pop()?.toLowerCase();

        if (fileExtension === "csv") {
          await handleCSVUpload(file);
        } else if (fileExtension === "xlsx" || fileExtension === "xls") {
          await handleExcelUpload(file);
        } else {
          toast.error(
            "지원하지 않는 파일 형식입니다. CSV 또는 Excel 파일을 사용해주세요.",
          );
        }
      } catch (error) {
        console.error("파일 업로드 오류:", error);
        toast.error("파일 업로드 중 오류가 발생했습니다.");
      }

      // 파일 입력 요소 제거
      document.body.removeChild(fileInput);
    };

    // 파일 선택 다이얼로그 열기
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  const handleCSVUpload = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n");

    // BOM 제거
    if (lines[0].startsWith("\uFEFF")) {
      lines[0] = lines[0].substring(1);
    }

    while (lines.length > 0 && lines[0].trim().startsWith("※")) {
      lines.shift();
    }

    if (lines.length === 0) {
      toast.error("파일에 데이터가 없습니다.");
      return;
    }

    const headers = lines[0]
      .split(",")
      .map((h) => normalizeHeader(h.trim()));
    const data = lines.slice(1).filter((line) => line.trim());

    if (data.length === 0) {
      toast.error("파일에 데이터가 없습니다.");
      return;
    }

    // 데이터 파싱 및 검증
    const students = data.map((line, index) => {
      const values = line.split(",").map((v) => v.trim());
      if (line.trim().startsWith("※")) {
        return null;
      }

      const student: any = {};

      headers.forEach((header, i) => {
        const normalizedHeader = normalizeHeader(header);
        if (!normalizedHeader) return;
        student[header] = values[i] || "";
      });

      return student;
    }).filter((student): student is Record<string, string> => student !== null);

    // 업로드 확인 다이얼로그
    if (
      window.confirm(`${students.length}명의 학생 정보를 업로드하시겠습니까?`)
    ) {
      await processUploadedStudents(students);
    }
  };

  const handleExcelUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // 첫 번째 워크시트 가져오기
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // 워크시트를 JSON으로 변환
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const filteredRows = (jsonData as any[][]).filter((row) => {
        if (!row || row.length === 0) return false;
        const firstCell = String(row[0] ?? "").trim();
        if (firstCell === "") {
          return row.some((cell: any) => String(cell ?? "").trim() !== "");
        }
        return !firstCell.startsWith("※");
      });

      if (filteredRows.length < 2) {
        toast.error("Excel 파일에 데이터가 없습니다.");
        return;
      }

      // 헤더와 데이터 분리
      const headers = filteredRows[0].map((header) =>
        normalizeHeader(String(header ?? "").trim()),
      );
      const data = filteredRows.slice(1) as any[][];

      // 데이터 파싱 및 검증
      const students = data.map((row, index) => {
        const student: any = {};

        headers.forEach((header, i) => {
          if (header && row[i] !== undefined) {
            student[header] = String(row[i]).trim();
          }
        });

        return student;
      });

      // 업로드 확인 다이얼로그
      if (
        window.confirm(`${students.length}명의 학생 정보를 업로드하시겠습니까?`)
      ) {
        await processUploadedStudents(students);
      }
    } catch (error) {
      console.error("Excel 파일 처리 오류:", error);
      toast.error("Excel 파일 처리 중 오류가 발생했습니다.");
    }
  };

  const processUploadedStudents = async (students: any[]) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadTotal(students.length);

      // 데이터 검증
      const validStudents = students.filter((student) => {
        return student["이름"] && student["학년"] && student["반"];
      });

      if (validStudents.length === 0) {
        toast.error("유효한 학생 데이터가 없습니다.");
        setIsUploading(false);
        return;
      }

      // 업로드 진행 상황 표시
      toast.loading(
        `${validStudents.length}명의 학생 정보를 업로드하는 중...`,
        { duration: 0 },
      );

      // Supabase에 학생 데이터 저장 (순차적으로 처리하여 진행 상황 표시)
      const results = [];

      for (let i = 0; i < validStudents.length; i++) {
        const student = validStudents[i];

        try {
          // 진행 상황 업데이트
          setUploadProgress(i);

          // 학생 번호 처리 (엑셀에서 가져오거나 자동 생성)
          let studentNumber = student["번호"] || "";

          // 번호가 없거나 8자리인 경우 처리
          if (!studentNumber) {
            // 자동 생성: 자연스러운 순번 (1, 2, 3...)
            studentNumber = String(i + 1);
          } else if (studentNumber.length === 8) {
            // 8자리인 경우 뒤 3자리만 사용하고 앞 0 제거
            studentNumber = String(parseInt(studentNumber.slice(-3)));
          } else if (studentNumber.length > 3) {
            // 3자리보다 긴 경우 뒤 3자리만 사용하고 앞 0 제거
            studentNumber = String(parseInt(studentNumber.slice(-3)));
          } else {
            // 기존 번호에서 앞 0 제거
            studentNumber = String(parseInt(studentNumber));
          }

          // 데이터베이스에는 3자리로 저장 (앞 0 포함)
          const dbStudentNumber = studentNumber.padStart(3, "0");

          // 학생 데이터 준비 (데이터베이스 스키마에 완벽하게 맞춤)
          const studentData = {
            name: student["이름"],
            grade: student["학년"],
            class: student["반"],
            student_number: dbStudentNumber,
            gender: student["성별"] === "남자" ? "male" : "female",
            birth_date: convertExcelDate(student["생년월일"]), // Excel 날짜 변환
            enrolled_at: convertExcelDate(student["입학일"]), // Excel 날짜 변환
            is_active: true,
            phone: student["휴대폰"]
              ? formatPhoneNumber(student["휴대폰"])
              : null, // 휴대폰 번호 (포맷팅)
            current_school_id: teacherInfo?.school_id || null, // 담임선생님의 학교 ID로 자동 설정
            parent_consent: false, // 기본값: 미동의
            parent_contact:
              student["어머니_이름"] ||
              student["어머니_전화번호"] ||
              student["아버지_이름"] ||
              student["아버지_전화번호"]
                ? {
                    mother_name: student["어머니_이름"] || null,
                    mother_phone: student["어머니_전화번호"]
                      ? formatPhoneNumber(student["어머니_전화번호"])
                      : null,
                    father_name: student["아버지_이름"] || null,
                    father_phone: student["아버지_전화번호"]
                      ? formatPhoneNumber(student["아버지_전화번호"])
                      : null,
                  }
                : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Supabase에 학생 데이터 삽입
          const { data: newStudent, error: insertError } = await supabase
            .from("students")
            .insert([studentData])
            .select()
            .single();

          if (insertError) {
            console.error(`학생 ${student["이름"]} 저장 오류:`, insertError);
            console.error("전송된 데이터:", studentData);
            console.error("오류 코드:", insertError.code);
            console.error("오류 메시지:", insertError.message);
            console.error("오류 세부사항:", insertError.details);
            console.error("오류 힌트:", insertError.hint);
            throw new Error(
              `${student["이름"]} 저장 실패: ${insertError.message}`,
            );
          }

          // 학부모 연락처 정보는 이미 studentData.parent_contact에 포함되어 있음

          results.push({
            success: true,
            student: newStudent,
            originalData: student,
          });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : "알 수 없는 오류",
            originalData: student,
          });
        }
      }

      // 최종 진행 상황 업데이트
      setUploadProgress(validStudents.length);

      // 결과 분석
      const successfulUploads = results.filter((r) => r.success);
      const failedUploads = results.filter((r) => !r.success);

      // 토스트 메시지 제거
      toast.dismiss();

      if (successfulUploads.length > 0) {
        // 성공한 학생들을 로컬 상태에 추가
        const newStudents: Student[] = successfulUploads
          .filter((result) => result.student)
          .map((result) => ({
            id: result.student!.id,
            name: result.student!.name,
            grade: result.student!.grade,
            class: result.student!.class,
            student_number: result.student!.student_number,
            gender: result.student!.gender,
            birth_date: result.student!.birth_date,
            phone: result.student!.phone,
            enrolled_at: result.student!.enrolled_at,
            parent_consent: result.student!.parent_consent || false,
            parent_contact: {
              mother_name: result.originalData["어머니_이름"],
              mother_phone: result.originalData["어머니_전화번호"],
              father_name: result.originalData["아버지_이름"],
              father_phone: result.originalData["아버지_전화번호"],
            },
            network_metrics: null,
            teacher_memos: [],
            intervention_logs: [],
          }));

        setStudents((prev) => [...prev, ...newStudents]);

        // 성공 메시지
        if (failedUploads.length === 0) {
          toast.success(
            `${successfulUploads.length}명의 학생 정보가 성공적으로 업로드되었습니다.`,
          );
        } else {
          toast.success(
            `${successfulUploads.length}명 업로드 성공, ${failedUploads.length}명 실패`,
          );
        }
      }

      // 실패한 업로드가 있다면 상세 정보 표시
      if (failedUploads.length > 0) {
        const failedNames = failedUploads
          .map((f) => f.originalData["이름"])
          .join(", ");
        toast.error(`다음 학생들의 업로드에 실패했습니다: ${failedNames}`);

        // 실패 상세 정보를 콘솔에 출력
        console.error("업로드 실패 상세:", failedUploads);
      }
    } catch (error) {
      toast.dismiss();
      console.error("학생 데이터 처리 오류:", error);
      toast.error("학생 데이터 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadTotal(0);
    }
  };

  const handleViewDetails = (student: Student) => {
    try {
      setSelectedStudent(student);
      setDetailModalOpen(true);
    } catch (error) {
      console.error("상세보기 열기 오류:", error);
      toast.error("상세보기를 열 수 없습니다. 다시 시도해주세요.");
    }
  };

  const handleAddMemo = (student: Student) => {
    setSelectedStudent(student);
    setNewMemoContent("");
    setMemoModalOpen(true);
  };

  const handleSaveMemo = async () => {
    if (!selectedStudent || !newMemoContent.trim()) {
      toast.error("상담 내용을 입력해주세요.");
      return;
    }

    try {
      // Supabase에 메모 저장
      const memoData = {
        student_id: selectedStudent.id,
        teacher_id: teacherInfo.id,
        content: newMemoContent.trim(),
        memo_type: "general", // 기본값으로 설정
        visibility: "private", // 기본값으로 설정
        tags: [], // 빈 배열로 설정
      };

      const { data: savedMemo, error } = await supabase
        .from("teacher_memos")
        .insert([memoData])
        .select()
        .single();

      if (error) throw error;

      // 로컬 상태 업데이트
      const newMemo: TeacherMemo = {
        id: savedMemo.id,
        content: savedMemo.content,
        created_at: savedMemo.created_at || new Date().toISOString(),
        teacher_name: teacherInfo.name || currentUser?.email || "현재 교사",
      };

      // 로컬 상태 업데이트
      const updatedStudents = students.map((student) =>
        student.id === selectedStudent.id
          ? {
              ...student,
              teacher_memos: [...(student.teacher_memos || []), newMemo],
            }
          : student,
      );
      setStudents(updatedStudents);

      // 현재 선택된 학생의 상태도 업데이트
      const updatedStudent = updatedStudents.find(
        (s) => s.id === selectedStudent.id,
      );
      if (updatedStudent) {
        setSelectedStudent(updatedStudent);
      }

      toast.success("상담 기록이 성공적으로 저장되었습니다.");
      setMemoModalOpen(false);
      setNewMemoContent("");
      setSelectedStudent(null);
    } catch (error) {
      console.error("메모 저장 오류:", error);
      toast.error("상담 기록 저장 중 오류가 발생했습니다.");
    }
  };

  const handleEditMemo = (memo: TeacherMemo) => {
    setSelectedMemo(memo);
    setEditMemoContent(memo.content);
    setEditMemoModalOpen(true);
  };

  const handleUpdateMemo = async () => {
    if (!selectedMemo || !editMemoContent.trim()) {
      toast.error("상담 내용을 입력해주세요.");
      return;
    }

    try {
      // Supabase에서 메모 수정
      const { data: updatedMemo, error } = await supabase
        .from("teacher_memos")
        .update({
          content: editMemoContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedMemo.id)
        .select()
        .single();

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedStudents = students.map((student) =>
        student.id === selectedStudent?.id
          ? {
              ...student,
              teacher_memos: student.teacher_memos?.map((memo) =>
                memo.id === selectedMemo.id
                  ? { ...memo, content: editMemoContent }
                  : memo,
              ),
            }
          : student,
      );
      setStudents(updatedStudents);

      // 현재 선택된 학생의 상태도 업데이트
      const updatedStudent = updatedStudents.find(
        (s) => s.id === selectedStudent?.id,
      );
      if (updatedStudent) {
        setSelectedStudent(updatedStudent);
      }

      toast.success("상담 기록이 성공적으로 수정되었습니다.");
      setEditMemoModalOpen(false);
      setEditMemoContent("");
      setSelectedMemo(null);
    } catch (error) {
      console.error("메모 수정 오류:", error);
      toast.error("상담 기록 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteMemo = async (memo: TeacherMemo) => {
    if (!window.confirm("정말로 이 상담 기록을 삭제하시겠습니까?")) {
      return;
    }

    try {
      // Supabase에서 메모 삭제
      const { error } = await supabase
        .from("teacher_memos")
        .delete()
        .eq("id", memo.id);

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedStudents = students.map((student) =>
        student.id === selectedStudent?.id
          ? {
              ...student,
              teacher_memos: student.teacher_memos?.filter(
                (m) => m.id !== memo.id,
              ),
            }
          : student,
      );
      setStudents(updatedStudents);

      // 현재 선택된 학생의 상태도 업데이트
      const updatedStudent = updatedStudents.find(
        (s) => s.id === selectedStudent?.id,
      );
      if (updatedStudent) {
        setSelectedStudent(updatedStudent);
      }

      toast.success("상담 기록이 성공적으로 삭제되었습니다.");
      setEditMemoModalOpen(false);
      setSelectedMemo(null);
    } catch (error) {
      console.error("메모 삭제 오류:", error);
      toast.error("상담 기록 삭제 중 오류가 발생했습니다.");
    }
  };

  // 학부모 동의 상태 업데이트
  const handleParentConsentChange = async (
    studentId: string,
    consent: boolean,
  ) => {
    try {
      // Supabase에서 학부모 동의 상태 업데이트
      const { error } = await supabase
        .from("students")
        .update({ parent_consent: consent })
        .eq("id", studentId);

      if (error) throw error;

      // 로컬 상태 업데이트
      const updatedStudents = students.map((student) =>
        student.id === studentId
          ? { ...student, parent_consent: consent }
          : student,
      );
      setStudents(updatedStudents);

      // 현재 선택된 학생의 상태도 업데이트
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent({ ...selectedStudent, parent_consent: consent });
      }

      toast.success(
        `학부모 동의 상태가 ${consent ? "동의" : "미동의"}로 변경되었습니다.`,
      );
    } catch (error) {
      console.error("학부모 동의 상태 업데이트 오류:", error);
      toast.error("학부모 동의 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedStudent(null);
    setActiveTab("memo");
  };

  const closeMemoModal = () => {
    setMemoModalOpen(false);
    setNewMemoContent("");
    setSelectedStudent(null);
  };

  const closeEditMemoModal = () => {
    setEditMemoModalOpen(false);
    setEditMemoContent("");
    setSelectedMemo(null);
  };

  const closeAddStudentModal = () => {
    setAddStudentModalOpen(false);
    setNewStudent({
      name: "",
      grade: teacherInfo?.grade_level || "",
      class: teacherInfo?.class_number || "",
      student_number: "",
      gender: "male",
      birth_date: "",
      phone: "",
      mother_name: "",
      mother_phone: "",
      father_name: "",
      father_phone: "",
    });
  };

  const closeDeleteStudentModal = () => {
    setDeleteStudentModalOpen(false);
    setStudentToDelete(null);
  };

  // 학생 추가 함수
  const handleAddStudent = async () => {
    if (
      !newStudent.name ||
      !newStudent.grade ||
      !newStudent.class ||
      !newStudent.phone ||
      !newStudent.birth_date
    ) {
      toast.error("이름, 학년, 반, 생년월일, 휴대폰 번호는 필수 입력 항목입니다.");
      return;
    }

    if (!teacherInfo?.school_id) {
      toast.error("학교 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      // 학생 번호 자동 생성 (기존 학생들의 최대 번호 + 1)
      let studentNumber = newStudent.student_number;
      if (!studentNumber) {
        // 같은 학년/반의 학생들만 필터링
        const sameGradeClassStudents = students.filter(
          (s) => s.grade === newStudent.grade && s.class === newStudent.class,
        );
        const existingNumbers = sameGradeClassStudents
          .map((s) => parseInt(s.student_number))
          .filter((n) => !isNaN(n));
        const maxNumber =
          existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        studentNumber = String(maxNumber + 1).padStart(3, "0");
      } else {
        studentNumber = String(parseInt(studentNumber)).padStart(3, "0");

        // 같은 학년/반 내에서 학생 번호 중복 체크
        const isDuplicate = students.some(
          (s) =>
            s.grade === newStudent.grade &&
            s.class === newStudent.class &&
            s.student_number === studentNumber,
        );

        if (isDuplicate) {
          toast.error(
            `${newStudent.grade}학년 ${newStudent.class}반에 ${parseInt(studentNumber)}번 학생이 이미 존재합니다.`,
          );
          return;
        }
      }

      const studentData = {
        name: newStudent.name,
        grade: newStudent.grade,
        class: newStudent.class,
        student_number: studentNumber,
        gender: newStudent.gender,
        birth_date: newStudent.birth_date,
        enrolled_at: new Date().toISOString().split("T")[0],
        is_active: true,
        phone: newStudent.phone.trim(),
        current_school_id: teacherInfo.school_id,
        parent_consent: false,
        parent_contact:
          newStudent.mother_name ||
          newStudent.mother_phone ||
          newStudent.father_name ||
          newStudent.father_phone
            ? {
                mother_name: newStudent.mother_name || null,
                mother_phone: newStudent.mother_phone || null,
                father_name: newStudent.father_name || null,
                father_phone: newStudent.father_phone || null,
              }
            : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: addedStudent, error } = await supabase
        .from("students")
        .insert([studentData])
        .select()
        .single();

      if (error) throw error;

      // 로컬 상태에 새 학생 추가
      const newStudentData: Student = {
        id: addedStudent.id,
        name: addedStudent.name,
        grade: addedStudent.grade,
        class: addedStudent.class,
        student_number: addedStudent.student_number,
        gender: addedStudent.gender,
        birth_date: addedStudent.birth_date,
        phone: addedStudent.phone,
        enrolled_at: addedStudent.enrolled_at,
        parent_consent: addedStudent.parent_consent || false,
        parent_contact: addedStudent.parent_contact,
        network_metrics: null,
        teacher_memos: [],
        intervention_logs: [],
      };

      setStudents((prev) => [...prev, newStudentData]);
      toast.success(`${newStudent.name} 학생이 성공적으로 추가되었습니다.`);
      closeAddStudentModal();
    } catch (error) {
      console.error("학생 추가 오류:", error);
      toast.error("학생 추가 중 오류가 발생했습니다.");
    }
  };

  // 학생 삭제 함수
  const handleDeleteStudent = async (student: Student) => {
    setStudentToDelete(student);
    setDeleteStudentModalOpen(true);
  };

  // 학생 삭제 확인 함수
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      const { error } = await supabase
        .from("students")
        .update({ is_active: false })
        .eq("id", studentToDelete.id);

      if (error) throw error;

      // 로컬 상태에서 학생 제거
      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      toast.success(`${studentToDelete.name} 학생이 삭제되었습니다.`);
      closeDeleteStudentModal();
    } catch (error) {
      console.error("학생 삭제 오류:", error);
      toast.error("학생 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mb-2 text-lg font-medium text-gray-900">
            학생 데이터 로딩 중...
          </p>
          <p className="text-gray-600">데이터를 불러오는 중입니다.</p>
        </div>
      </div>
    );
  }

  // 권한 확인
  if (!canAccessPage()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            접근 권한이 없습니다
          </h2>
          <p className="text-gray-600">
            학생 관리 페이지에 접근할 수 있는 권한이 없습니다.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            담임교사, 학년 부장, 학교 관리자, 교육청 관리자만 접근 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            학생 등록/관리
          </h1>

          {/* 학급과 담임 정보 표시 */}
          {teacherInfo &&
            (teacherInfo.role === "homeroom_teacher" ||
              teacherInfo.role === "grade_teacher") && (
              <div className="flex gap-2 text-xl text-gray-950">
                <p>
                  {teacherInfo.grade_level}학년 {teacherInfo.class_number}반(
                  {students.length}명)
                </p>
                <p>/</p>
                <p>
                  {teacherInfo.name || currentUser?.email}{" "}
                  {getRoleDisplayName(teacherInfo.role)}
                </p>
              </div>
            )}
        </div>

        {/* 파일, 양식 다운로드 */}
        <div
          className={`flex ${teacherInfo?.role === "homeroom_teacher" && teacherInfo?.grade_level && parseInt(teacherInfo.grade_level) >= 3 ? "justify-end" : "justify-between"} rounded-lg border border-gray-200 bg-white px-5 py-7`}
        >
          {/* 중학교 3학년 미만일 때만 개인정보동의서 다운로드 버튼 표시 */}
          {!(
            teacherInfo?.role === "homeroom_teacher" &&
            teacherInfo?.grade_level &&
            parseInt(teacherInfo.grade_level) >= 3
          ) && (
            <button
              onClick={() => {
                // 개인정보동의서_가정통신문 파일 다운로드
                const link = document.createElement("a");
                link.href = "/개인정보동의서_가정통신문.hwp";
                link.download = "개인정보동의서_가정통신문.hwp";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center gap-2 rounded-md bg-gray-400 px-5 py-2 font-semibold text-[#fafafa] transition-colors hover:bg-gray-500"
              title="개인정보동의서_가정통신문 다운로드"
            >
              <ArrowDownTrayIcon className="w-[18px]" />
              개인정보동의서_가정통신문
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 rounded-lg bg-gray-500 px-5 py-2 font-semibold text-[#fafafa] transition-colors hover:bg-[#3F80EA]"
            >
              <ArrowDownTrayIcon className="w-[18px]" />
              엑셀 템플릿 다운로드
            </button>
            <button
              onClick={handleUploadStudents}
              className="flex items-center gap-2 rounded-lg bg-gray-500 px-5 py-2 font-semibold text-[#fafafa] transition-colors hover:bg-[#3F80EA]"
              title={
                teacherInfo?.school_id
                  ? `${schoolName || "현재 학교"}에 학생 등록`
                  : "학교 정보가 없습니다"
              }
            >
              <ArrowUpTrayIcon className="w-[18px]" />
              {teacherInfo?.school_id && (
                <span>({schoolName || "현재 학교"})</span>
              )}
              학생 명단 업로드
            </button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-2 mt-5 flex justify-end gap-2">
        {/* 검색 */}
        <input
          type="text"
          placeholder="학생 이름 또는 번호로 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-[320px] rounded-lg border border-gray-300 px-[13px] py-[11.5px] text-sm text-gray-950 placeholder:text-[#71717A] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* 정렬 옵션 */}
        <div className="flex gap-2">
          {[
            { field: "name", label: "이름" },
            { field: "student_number", label: "번호" },
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`rounded-md border px-[13px] py-2.5 text-sm transition-colors ${
                sortField === field
                  ? "border-blue-400 bg-blue-50 text-blue-600"
                  : "border-gray-[#e4e4e7] bg-white text-[#09090B]"
              }`}
            >
              <div className="flex items-center gap-2 space-x-1">
                <span>{label}</span>
                {getSortIcon(field)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 검색 및 필터 - 이전 버전 */}
      {/* <div className="my-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"> */}
      {/* 필터 및 통계 정보 */}
      {/* <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <div className="flex flex-wrap gap-4">
            <div>
              <strong>학년 옵션:</strong> {getGradeOptions().length}개 (
              {getGradeOptions().join(", ") || "없음"})
            </div>
            <div>
              <strong>반 옵션:</strong> {getClassOptions().length}개 (
              {getClassOptions().join(", ") || "없음"})
            </div>
            <div>
              <strong>현재 필터:</strong> {gradeFilter}학년 {classFilter}반
              {(teacherInfo?.role === "homeroom_teacher" ||
                teacherInfo?.role === "grade_teacher") &&
                " (담임 고정)"}
            </div>
            <div>
              <strong>표시 학생:</strong> {filteredStudents.length}명 /{" "}
              {students.length}명
            </div>
          </div> */}

      {/* 담임 정보 표시 */}
      {/* {(teacherInfo?.role === "homeroom_teacher" ||
            teacherInfo?.role === "grade_teacher") &&
            teacherInfo.grade_level &&
            teacherInfo.class_number && (
              <div className="mt-3 rounded bg-blue-50 p-2 text-xs text-blue-800">
                🎯 {getRoleDisplayName(teacherInfo.role)}:{" "}
                {teacherInfo.grade_level}학년 {teacherInfo.class_number}반 -
                담당 반 학생만 표시
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4"> */}
      {/* 검색 */}
      {/* <div className="relative">
            <input
              type="text"
              placeholder="학생이름 또는 번호로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div> */}

      {/* 학년 필터 */}
      {/* <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            disabled={teacherInfo?.role === "homeroom_teacher"}
            className={`rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              teacherInfo?.role === "homeroom_teacher"
                ? "cursor-not-allowed bg-gray-100"
                : ""
            }`}
          >
            <option value="all">모든 학년</option>
            {getGradeOptions().map((grade) => (
              <option key={grade} value={grade}>
                {grade}학년
              </option>
            ))}*/}
      {/* 디버깅용: 실제 옵션 개수 표시 */}
      {/* {getGradeOptions().length === 0 && (
              <option disabled>학년 데이터 없음</option>
            )}
          </select>  */}

      {/* 반 필터 */}
      {/* <select
             value={classFilter}
             onChange={(e) => setClassFilter(e.target.value)}
             disabled={teacherInfo?.role === "homeroom_teacher"}
             className={`rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
               teacherInfo?.role === "homeroom_teacher"
                 ? "cursor-not-allowed bg-gray-100"
                 : ""
             }`}
           >
             <option value="all">모든 반</option>
             {getClassOptions().map((cls) => (
               <option key={cls} value={cls}>
                 {cls}반
               </option>
             ))} */}
      {/* 디버깅용: 실제 옵션 개수 표시 */}
      {/* {getClassOptions().length === 0 && (
               <option disabled>반 데이터 없음</option>
             )}
           </select> */}

      {/* 위험도 필터 */}
      {/* <select
             value={riskFilter}
             onChange={(e) => setRiskFilter(e.target.value)}
             className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
           >
             <option value="all">전체</option>
             <option value="high">주의 필요</option>
             <option value="medium">관찰 중</option>
             <option value="low">안정</option>
           </select>
         </div>
       </div> */}

      {/* 정렬 옵션 - 기존에 사용 */}
      {/* <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">정렬 기준</h3>
          <div className="flex space-x-2">
            {[
              { field: "name", label: "이름" },
              // { field: 'grade', label: '학년' },
              // { field: 'class', label: '반' },
              { field: "student_number", label: "번호" },
              // { field: "risk_level", label: "위험도" },
              { field: "network_centrality", label: "교우관계 중심성" },
            ].map(({ field, label }) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  sortField === field
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span>{label}</span>
                  {getSortIcon(field)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div> */}

      {/* 업로드 진행 상황 */}
      {isUploading && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-medium text-blue-900">
              학생 명단 업로드 중...
            </h3>
            <span className="text-sm text-blue-700">
              {uploadProgress} / {uploadTotal}
            </span>
          </div>

          {/* 학교 정보 표시 */}
          {teacherInfo?.school_id && (
            <div className="mb-3 rounded border border-blue-300 bg-blue-100 p-2 text-sm text-blue-800">
              <p>
                <strong>등록 학교:</strong> {schoolName || "현재 학교"}
              </p>
              <p className="mt-1 text-xs">
                모든 학생이 이 학교에 자동으로 등록됩니다.
              </p>
            </div>
          )}

          <div className="h-2 w-full rounded-full bg-blue-200">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(uploadProgress / uploadTotal) * 100}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-blue-600">
            {uploadProgress}명의 학생 정보를 업로드했습니다. (
            {Math.round((uploadProgress / uploadTotal) * 100)}%)
          </p>
        </div>
      )}

      {/* 학생 목록 */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
        {sortedStudents.length === 0 ? (
          <div className="col-span-full rounded-lg border border-gray-200 bg-white p-12 text-center">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              학생이 없습니다
            </h3>
            <p className="text-gray-500">
              아래의 "학생 추가" 버튼을 클릭하여 학생을 등록해보세요.
            </p>
          </div>
        ) : (
          sortedStudents.map((student) => (
            <div
              key={student.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              {/* 이름, 번호 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gray-100">
                    <span className="text-sm text-gray-600">
                      {parseInt(student.student_number)}번
                    </span>
                  </div>

                  <p className="text-lg font-semibold text-gray-950">
                    {student.name}
                  </p>
                </div>

                {/* 학부모 동의 상태 및 삭제 버튼 */}
                <div className="flex items-center gap-2">
                  {parseInt(student.grade) <= 2 && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          student.parent_consent ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <span className="text-xs text-gray-500">
                        {student.parent_consent ? "동의" : "미동의"}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStudent(student);
                    }}
                    className="text-red-400 transition-colors hover:text-red-600"
                    title="학생 삭제"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 상담기록, 상세보기 모달 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-950">상담 기록:</span>
                  {student.teacher_memos?.length || 0}개
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(student)}
                    className="border-b border-gray-400 px-2 py-2.5 text-sm text-gray-950"
                  >
                    상세보기
                  </button>
                  <button
                    onClick={() => handleAddMemo(student)}
                    className="border-b border-gray-400 px-2 py-2.5 text-sm text-gray-950"
                  >
                    상담 기록
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* 학생 추가 카드 - 마지막에 배치 */}
        <div
          onClick={() => setAddStudentModalOpen(true)}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <PlusIcon className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-blue-600">학생 추가</p>
        </div>
      </div>

      {/* 상세보기 모달 */}
      {detailModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="min-h-[425px] w-full max-w-4xl overflow-y-auto rounded-lg bg-white">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedStudent.name} 상세 정보
              </h2>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex flex-col p-6">
              {/* 탭 메뉴 */}
              <div className="flex items-center justify-between self-end">
                <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setActiveTab("memo")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "memo"
                        ? "bg-white text-[#3F80EA] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    교사 메모
                  </button>
                  <button
                    onClick={() => setActiveTab("info")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "info"
                        ? "bg-white text-[#3F80EA] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    정보
                  </button>
                </div>
              </div>

              {/* 탭 내용 영역 - 고정 높이 */}
              <div className="mt-6 min-h-[270px]">
                {activeTab === "memo" ? (
                  // 교사메모
                  <div className="flex flex-col gap-5">
                    <h3 className="mb-4 text-base font-semibold text-gray-900">
                      • 학생 상담 기록
                    </h3>
                    {selectedStudent.teacher_memos &&
                    Array.isArray(selectedStudent.teacher_memos) &&
                    selectedStudent.teacher_memos.length > 0 ? (
                      <div className="max-h-[200px] space-y-2 overflow-y-auto">
                        {selectedStudent.teacher_memos.map((memo, index) => (
                          <div
                            key={memo.id || index}
                            className="cursor-pointer rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                            onClick={() => handleEditMemo(memo)}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="whitespace-nowrap text-sm text-gray-600">
                                {memo.created_at
                                  ? new Date(
                                      memo.created_at,
                                    ).toLocaleDateString()
                                  : "날짜 없음"}
                              </span>
                              <span className="truncate text-gray-900">
                                {(() => {
                                  try {
                                    const content = memo.content;
                                    return content !== undefined &&
                                      content !== null
                                      ? content
                                      : "내용 없음";
                                  } catch (error) {
                                    console.error(
                                      "상담 내용 파싱 오류:",
                                      error,
                                    );
                                    return "내용 없음";
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">
                        등록된 상담 기록이 없습니다.
                      </p>
                    )}
                  </div>
                ) : (
                  // 정보
                  <div className="flex flex-col gap-5">
                    {/* 개인정보 학부모 동의 - 중학교 3학년 미만일 때만 표시 */}
                    {parseInt(selectedStudent.grade) <= 2 && (
                      <div>
                        <h3 className="mb-4 text-base font-semibold text-gray-900">
                          • 개인정보 학부모 동의
                        </h3>
                        <div className="ml-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedStudent.parent_consent || false}
                              onChange={(e) => {
                                handleParentConsentChange(
                                  selectedStudent.id,
                                  e.target.checked,
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              개인정보 수집·이용에 대한 학부모 동의
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="mb-4 text-base font-semibold text-gray-900">
                        • 기본 정보
                      </h3>
                      <div className="ml-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">학급:</span>
                          <span className="ml-2 text-gray-900">
                            {selectedStudent.grade}학년 {selectedStudent.class}
                            반 {parseInt(selectedStudent.student_number)}번
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">성별:</span>
                          <span className="ml-2 text-gray-900">
                            {getGenderLabel(selectedStudent.gender)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">생년월일:</span>
                          <span className="ml-2 text-gray-900">
                            {selectedStudent.birth_date}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">핸드폰:</span>
                          <span className="ml-2 text-gray-900">
                            {selectedStudent.phone || "정보 없음"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-4 text-base font-semibold text-gray-900">
                        • 학부모 연락처
                      </h3>
                      {selectedStudent.parent_contact &&
                      typeof selectedStudent.parent_contact === "object" ? (
                        <div className="ml-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">어머니:</span>
                            <span className="ml-2 text-gray-900">
                              {(() => {
                                try {
                                  const value = (
                                    selectedStudent.parent_contact as any
                                  )?.mother_name;
                                  return value !== undefined && value !== null
                                    ? value
                                    : "정보 없음";
                                } catch (error) {
                                  console.error(
                                    "어머니 이름 파싱 오류:",
                                    error,
                                  );
                                  return "정보 없음";
                                }
                              })()}
                            </span>
                            {(() => {
                              try {
                                const phone = (
                                  selectedStudent.parent_contact as any
                                )?.mother_phone;
                                return phone &&
                                  phone !== undefined &&
                                  phone !== null ? (
                                  <span className="ml-2 text-gray-600">
                                    ({phone})
                                  </span>
                                ) : null;
                              } catch (error) {
                                console.error(
                                  "어머니 전화번호 파싱 오류:",
                                  error,
                                );
                                return null;
                              }
                            })()}
                          </div>
                          <div>
                            <span className="text-gray-600">아버지:</span>
                            <span className="ml-2 text-gray-900">
                              {(() => {
                                try {
                                  const value = (
                                    selectedStudent.parent_contact as any
                                  )?.father_name;
                                  return value !== undefined && value !== null
                                    ? value
                                    : "정보 없음";
                                } catch (error) {
                                  console.error(
                                    "아버지 이름 파싱 오류:",
                                    error,
                                  );
                                  return "정보 없음";
                                }
                              })()}
                            </span>
                            {(() => {
                              try {
                                const phone = (
                                  selectedStudent.parent_contact as any
                                )?.father_phone;
                                return phone &&
                                  phone !== undefined &&
                                  phone !== null ? (
                                  <span className="ml-2 text-gray-600">
                                    ({phone})
                                  </span>
                                ) : null;
                              } catch (error) {
                                console.error(
                                  "아버지 전화번호 파싱 오류:",
                                  error,
                                );
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          등록된 학부모 연락처가 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메모 추가 모달 */}
      {memoModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedStudent.name} 학생 상담 기록
              </h2>
              <button
                onClick={closeMemoModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              <div className="mb-4">
                <label
                  htmlFor="memoContent"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  상담 내용
                </label>
                <textarea
                  id="memoContent"
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="학생과의 상담 내용을 입력하세요..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMemoModal}
                  className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveMemo}
                  className="rounded-md bg-[#3F80EA] px-4 py-2 text-white transition-colors hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메모 수정/삭제 모달 */}
      {editMemoModalOpen && selectedMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                상담 기록 수정/삭제
              </h2>
              <button
                onClick={closeEditMemoModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              <div className="mb-4">
                <label
                  htmlFor="editMemoContent"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  상담 내용
                </label>
                <textarea
                  id="editMemoContent"
                  value={editMemoContent}
                  onChange={(e) => setEditMemoContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="상담 내용을 수정하세요..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => handleDeleteMemo(selectedMemo)}
                  className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                >
                  삭제
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleUpdateMemo}
                    className="rounded-md bg-[#3F80EA] px-4 py-2 text-white transition-colors hover:bg-blue-600"
                  >
                    수정
                  </button>
                  <button
                    onClick={closeEditMemoModal}
                    className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 학생 추가 모달 */}
      {addStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 text-gray-950">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-lg bg-white p-6">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  새 학생 추가
                </h2>
              </div>
              <button
                onClick={closeAddStudentModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="">
              <div className="flex flex-col gap-5">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    기본 정보
                  </h3>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      이름 *
                    </label>
                    <input
                      type="text"
                      value={newStudent.name}
                      onChange={(e) =>
                        setNewStudent((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="학생 이름"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        휴대폰 번호 <span>*</span>
                      </label>
                      <input
                        type="tel"
                        value={newStudent.phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setNewStudent((prev) => ({
                            ...prev,
                            phone: formatted,
                          }));
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="010-1234-5678"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        학생 번호
                      </label>
                      <input
                        type="text"
                        value={newStudent.student_number}
                        onChange={(e) =>
                          setNewStudent((prev) => ({
                            ...prev,
                            student_number: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="자동 생성 (비워두면 자동)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        생년월일 *
                      </label>
                      <input
                        type="date"
                        value={newStudent.birth_date}
                        onChange={(e) =>
                          setNewStudent((prev) => ({
                            ...prev,
                            birth_date: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        성별
                      </label>
                      <div className="flex gap-4 bg-[#F8FAFB]">
                        <label className="flex items-center gap-[10px] rounded-md p-[10px]">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={newStudent.gender === "male"}
                            onChange={(e) =>
                              setNewStudent((prev) => ({
                                ...prev,
                                gender: e.target.value,
                              }))
                            }
                          />
                          남
                        </label>
                        <label className="flex items-center gap-[10px] p-[10px]">
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={newStudent.gender === "female"}
                            onChange={(e) =>
                              setNewStudent((prev) => ({
                                ...prev,
                                gender: e.target.value,
                              }))
                            }
                          />
                          여
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 학부모 정보 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    학부모 정보
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        어머니 이름
                      </label>
                      <input
                        type="text"
                        value={newStudent.mother_name}
                        onChange={(e) =>
                          setNewStudent((prev) => ({
                            ...prev,
                            mother_name: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        어머니 전화번호
                      </label>
                      <input
                        type="tel"
                        value={newStudent.mother_phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setNewStudent((prev) => ({
                            ...prev,
                            mother_phone: formatted,
                          }));
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="010-1234-5678"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        아버지 이름
                      </label>
                      <input
                        type="text"
                        value={newStudent.father_name}
                        onChange={(e) =>
                          setNewStudent((prev) => ({
                            ...prev,
                            father_name: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        아버지 전화번호
                      </label>
                      <input
                        type="tel"
                        value={newStudent.father_phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setNewStudent((prev) => ({
                            ...prev,
                            father_phone: formatted,
                          }));
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="010-1234-5678"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex w-full">
                <button
                  onClick={handleAddStudent}
                  className="w-full rounded-md bg-[#3F80EA] px-4 py-2 text-white transition-colors hover:bg-blue-600"
                >
                  학생 추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 학생 삭제 확인 모달 */}
      {deleteStudentModalOpen && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                학생 삭제 확인
              </h2>
              <button
                onClick={closeDeleteStudentModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              <div className="mb-4">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  정말로 삭제하시겠습니까?
                </h3>
                <p className="text-gray-600">
                  <strong>{studentToDelete.name}</strong> 학생을 삭제하면 다음
                  정보들이 함께 삭제됩니다:
                </p>
              </div>

              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    학생 기본 정보
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    상담 기록 ({studentToDelete.teacher_memos?.length || 0}개)
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    학부모 연락처 정보
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    네트워크 분석 데이터
                  </li>
                </ul>
              </div>

              <div className="mb-4 rounded-lg bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  <strong>⚠️ 주의:</strong> 이 작업은 되돌릴 수 없습니다. 삭제된
                  학생의 모든 데이터는 복구할 수 없습니다.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteStudentModal}
                  className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={confirmDeleteStudent}
                  className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
