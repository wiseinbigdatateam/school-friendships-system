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
} from "@heroicons/react/24/outline/index.js";

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  student_number: string;
  gender: string;
  birth_date: string;
  lifelong_education_id: string;
  enrolled_at: string;
  network_metrics?: any;
  teacher_memos?: any[];
  intervention_logs?: any[];
  parent_contact?: any;
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newMemoContent, setNewMemoContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);

  // 담임 정보 및 정렬 관련 상태
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!teacherInfo) return;
    fetchStudents();
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
        console.log("🔍 로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
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
            console.log("🔍 학교 이름 조회 완료:", schoolData.name);
          }
        } catch (schoolError) {
          console.error("학교 이름 조회 오류:", schoolError);
          setSchoolName("알 수 없는 학교");
        }
      }

      console.log("🔍 StudentManagement 사용자 정보 설정 완료:", {
        user,
        teacherData,
      });
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      // 에러 발생 시 로그인 페이지로 이동
      window.location.href = "/login";
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);

      console.log("fetchStudents - teacherInfo:", teacherInfo);
      console.log("fetchStudents - role:", teacherInfo?.role);
      console.log("fetchStudents - grade_level:", teacherInfo?.grade_level);
      console.log("fetchStudents - class_number:", teacherInfo?.class_number);

      // 권한별 학생 조회
      let query = supabase
        .from("students")
        .select(
          `
          *,
          parent_contact
        `
        )
        .eq("is_active", true);

      // 학교별 필터링
      if (teacherInfo?.role === "district_admin") {
        // 교육청 관리자: 모든 학교 학생 조회 (필터링 없음)
        console.log("교육청 관리자: 모든 학교 학생 조회");
      } else if (teacherInfo?.school_id) {
        // 다른 역할: 해당 학교 학생만 조회
        console.log("학교별 필터링 적용:", teacherInfo.school_id);
        query = query.eq("current_school_id", teacherInfo.school_id);
      }

      // 역할별 추가 필터링
      if (
        teacherInfo?.role === "homeroom_teacher" &&
        teacherInfo.grade_level &&
        teacherInfo.class_number
      ) {
        // 담임교사: 담당 학년/반만
        console.log(
          "담임교사 필터링 적용:",
          teacherInfo.grade_level,
          "학년",
          teacherInfo.class_number,
          "반"
        );
        query = query
          .eq("grade", teacherInfo.grade_level)
          .eq("class", teacherInfo.class_number);
      } else if (
        teacherInfo?.role === "grade_teacher" &&
        teacherInfo.grade_level
      ) {
        // 학년 부장: 해당 학년만
        console.log("학년 부장 필터링 적용:", teacherInfo.grade_level, "학년");
        query = query.eq("grade", teacherInfo.grade_level);
      } else if (teacherInfo?.role === "school_admin") {
        // 학교 관리자: 해당 학교 전체 (추가 필터링 없음)
        console.log("학교 관리자: 해당 학교 전체 학생 조회");
      } else if (teacherInfo?.role === "district_admin") {
        // 교육청 관리자: 모든 학교 (추가 필터링 없음)
        console.log("교육청 관리자: 모든 학교 학생 조회");
      }

      const { data: studentsData, error: studentsError } = await query
        .order("grade", { ascending: true })
        .order("class", { ascending: true })
        .order("name", { ascending: true });

      if (studentsError) throw studentsError;

      console.log("조회된 학생 수:", studentsData?.length || 0);
      if (studentsData && studentsData.length > 0) {
        console.log("첫 번째 학생 정보:", studentsData[0]);
        console.log(
          "학생들의 학년/반 분포:",
          studentsData.map((s) => `${s.grade}학년${s.class}반`)
        );
      }

      // 네트워크 분석 결과 조회 (지도 리포트와 동일한 방식)
      const { data: networkData, error: networkError } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("analysis_type", "complete_network_analysis")
        .order("calculated_at", { ascending: false })
        .limit(1);

      if (networkError) throw networkError;

      // 교사 메모 조회
      const { data: memosData, error: memosError } = await supabase
        .from("teacher_memos")
        .select("*");

      if (memosError) throw memosError;

      // 개입 로그 조회
      const { data: interventionData, error: interventionError } =
        await supabase.from("intervention_logs").select("*");

      if (interventionError) throw interventionError;

      // 학생 데이터에 네트워크 메트릭, 메모, 개입 로그 연결 (지도 리포트와 동일한 방식)
      const studentsWithData = studentsData?.map((student) => {
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
                  n.class === student.class)
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

        const memos =
          memosData?.filter((m) => m.student_id === student.id) || [];
        const interventions =
          interventionData?.filter((i) => i.student_id === student.id) || [];

        return {
          ...student,
          network_metrics: metrics,
          teacher_memos: memos,
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
        lifelong_education_id: "LEI20170003",
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
      },
      {
        id: "2",
        name: "박서연",
        grade: "3",
        class: "2",
        student_number: "2024002",
        gender: "female",
        birth_date: "2017-07-22",
        lifelong_education_id: "LEI20170002",
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
      },
      {
        id: "3",
        name: "이준호",
        grade: "3",
        class: "2",
        student_number: "2024001",
        gender: "male",
        birth_date: "2017-03-15",
        lifelong_education_id: "LEI20170001",
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
    if (!student.network_metrics) return "low";

    // 지도 리포트와 동일한 방식으로 위험도 계산
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
        excelStartDate.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000
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
      return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const handleDownloadTemplate = () => {
    // Excel 템플릿 생성
    const headers = [
      "번호 (1, 2, 3...)",
      "이름",
      "학년",
      "반",
      "성별",
      "생년월일",
      "입학일",
      "교육ID",
      "어머니_이름",
      "어머니_전화번호",
      "아버지_이름",
      "아버지_전화번호",
    ];

    const sampleData = [
      "1",
      "홍길동",
      "3",
      "2",
      "남자",
      "2017-01-01",
      "2024-03-01",
      "LEI2025_000001",
      "홍엄마",
      "010-1234-5678",
      "홍아빠",
      "010-8765-4321",
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 워크시트 데이터 생성
    const worksheetData = [headers, sampleData];
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
            "지원하지 않는 파일 형식입니다. CSV 또는 Excel 파일을 사용해주세요."
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

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = lines.slice(1).filter((line) => line.trim());

    if (data.length === 0) {
      toast.error("파일에 데이터가 없습니다.");
      return;
    }

    // 데이터 파싱 및 검증
    const students = data.map((line, index) => {
      const values = line.split(",").map((v) => v.trim());
      const student: any = {};

      headers.forEach((header, i) => {
        student[header] = values[i] || "";
      });

      return student;
    });

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

      if (jsonData.length < 2) {
        toast.error("Excel 파일에 데이터가 없습니다.");
        return;
      }

      // 헤더와 데이터 분리
      const headers = jsonData[0] as string[];
      const data = jsonData.slice(1) as any[][];

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
        { duration: 0 }
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
            lifelong_education_id:
              student["교육ID"] ||
              `LEI${new Date().getFullYear()}_${String(i + 1).padStart(
                6,
                "0"
              )}`, // 엑셀에서 가져오거나 자동 생성
            current_school_id: teacherInfo?.school_id || null, // 담임선생님의 학교 ID로 자동 설정
            parent_contact:
              student["어머니_이름"] ||
              student["어머니_전화번호"] ||
              student["아버지_이름"] ||
              student["아버지_전화번호"]
                ? {
                    mother_name: student["어머니_이름"] || null,
                    mother_phone: student["어머니_전화번호"] || null,
                    father_name: student["아버지_이름"] || null,
                    father_phone: student["아버지_전화번호"] || null,
                  }
                : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // 디버깅을 위한 로그
          console.log(`학생 ${student["이름"]} 데이터 준비:`, studentData);

          // 데이터 타입 검증
          console.log("데이터 타입 검증:");
          console.log("- name:", typeof studentData.name, studentData.name);
          console.log("- grade:", typeof studentData.grade, studentData.grade);
          console.log("- class:", typeof studentData.class, studentData.class);
          console.log(
            "- student_number:",
            typeof studentData.student_number,
            studentData.student_number
          );
          console.log(
            "- gender:",
            typeof studentData.gender,
            studentData.gender
          );
          console.log(
            "- birth_date:",
            typeof studentData.birth_date,
            studentData.birth_date,
            "(원본:",
            student["생년월일"],
            ")"
          );
          console.log(
            "- enrolled_at:",
            typeof studentData.enrolled_at,
            studentData.enrolled_at,
            "(원본:",
            student["입학일"],
            ")"
          );
          console.log(
            "- is_active:",
            typeof studentData.is_active,
            studentData.is_active
          );
          console.log(
            "- lifelong_education_id:",
            typeof studentData.lifelong_education_id,
            studentData.lifelong_education_id
          );
          console.log(
            "- parent_contact:",
            typeof studentData.parent_contact,
            studentData.parent_contact
          );
          console.log(
            "- created_at:",
            typeof studentData.created_at,
            studentData.created_at
          );
          console.log(
            "- updated_at:",
            typeof studentData.updated_at,
            studentData.updated_at
          );

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
              `${student["이름"]} 저장 실패: ${insertError.message}`
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
            lifelong_education_id: result.student!.lifelong_education_id,
            enrolled_at: result.student!.enrolled_at,
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
            `${successfulUploads.length}명의 학생 정보가 성공적으로 업로드되었습니다.`
          );
        } else {
          toast.success(
            `${successfulUploads.length}명 업로드 성공, ${failedUploads.length}명 실패`
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
      console.log("🔍 상세보기 열기:", student);
      console.log("🔍 parent_contact 데이터:", student.parent_contact);
      console.log("🔍 parent_contact 타입:", typeof student.parent_contact);
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
      toast.error("메모 내용을 입력해주세요.");
      return;
    }

    try {
      // 실제로는 Supabase에 저장
      const newMemo: TeacherMemo = {
        id: Date.now().toString(),
        content: newMemoContent,
        created_at: new Date().toISOString(),
        teacher_name: "현재 교사",
      };

      // 로컬 상태 업데이트
      setStudents((prev) =>
        prev.map((student) =>
          student.id === selectedStudent.id
            ? {
                ...student,
                teacher_memos: [...(student.teacher_memos || []), newMemo],
              }
            : student
        )
      );

      toast.success("메모가 성공적으로 저장되었습니다.");
      setMemoModalOpen(false);
      setNewMemoContent("");
      setSelectedStudent(null);
    } catch (error) {
      toast.error("메모 저장 중 오류가 발생했습니다.");
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedStudent(null);
  };

  const closeMemoModal = () => {
    setMemoModalOpen(false);
    setNewMemoContent("");
    setSelectedStudent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900 mb-2">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            접근 권한이 없습니다
          </h2>
          <p className="text-gray-600">
            학생 관리 페이지에 접근할 수 있는 권한이 없습니다.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            담임교사, 학년 부장, 학교 관리자, 교육청 관리자만 접근 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                학생 관리
              </h1>
              <p className="text-gray-600">
                학생들의 기본 정보와 교우관계 분석 결과를 확인하고 관리합니다.
              </p>
              {/* 권한별 접근 범위 표시 */}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">
                    현재 접근 범위: {getAccessScope().description}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                엑셀 템플릿 다운로드
              </button>
              <button
                onClick={handleUploadStudents}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title={
                  teacherInfo?.school_id
                    ? `${schoolName || "현재 학교"}에 학생 등록`
                    : "학교 정보가 없습니다"
                }
              >
                <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                학생 명단 업로드
                {teacherInfo?.school_id && (
                  <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    {schoolName || "현재 학교"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 담임 정보 표시 */}
        {teacherInfo &&
          (teacherInfo.role === "homeroom_teacher" ||
            teacherInfo.role === "grade_teacher") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">담</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-900">
                      {teacherInfo.name || currentUser?.email}{" "}
                      {getRoleDisplayName(teacherInfo.role)}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {teacherInfo.grade_level}학년 {teacherInfo.class_number}반
                      담당
                    </p>
                  </div>
                </div>
                <div className="text-sm text-blue-600">
                  학년과 반이 자동으로 고정되었습니다
                </div>
              </div>
            </div>
          )}

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* 필터 및 통계 정보 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
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
            </div>

            {/* 담임 정보 표시 */}
            {(teacherInfo?.role === "homeroom_teacher" ||
              teacherInfo?.role === "grade_teacher") &&
              teacherInfo.grade_level &&
              teacherInfo.class_number && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  🎯 {getRoleDisplayName(teacherInfo.role)}:{" "}
                  {teacherInfo.grade_level}학년 {teacherInfo.class_number}반 -
                  담당 반 학생만 표시
                </div>
              )}
          </div>

          {/* 위험도 통계 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-yellow-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-3">
              📊 위험도별 학생 현황
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-800">
                  {getHighRiskStudentCount()}
                </div>
                <div className="text-sm text-red-700 font-medium">
                  주의 필요
                </div>
                <div className="text-xs text-red-600">중심성 &lt; 0.3</div>
              </div>
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-800">
                  {getRiskLevelCounts().medium}
                </div>
                <div className="text-sm text-yellow-700 font-medium">
                  관찰 중
                </div>
                <div className="text-xs text-yellow-600">중심성 0.3~0.6</div>
              </div>
              <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-800">
                  {getRiskLevelCounts().low}
                </div>
                <div className="text-sm text-green-700 font-medium">안정</div>
                <div className="text-xs text-green-600">중심성 &ge; 0.6</div>
              </div>
            </div>
            <div className="mt-3 text-center text-sm text-red-700">
              🚨 <strong>주의 학생 수: {getHighRiskStudentCount()}명</strong> -
              즉시 관찰 및 개입이 필요한 학생들
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 검색 */}
            <div className="relative">
              <input
                type="text"
                placeholder="Q 학생 이름 또는 학번 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* 학년 필터 */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              disabled={teacherInfo?.role === "homeroom_teacher"}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                teacherInfo?.role === "homeroom_teacher"
                  ? "bg-gray-100 cursor-not-allowed"
                  : ""
              }`}
            >
              <option value="all">모든 학년</option>
              {getGradeOptions().map((grade) => (
                <option key={grade} value={grade}>
                  {grade}학년
                </option>
              ))}
              {/* 디버깅용: 실제 옵션 개수 표시 */}
              {getGradeOptions().length === 0 && (
                <option disabled>학년 데이터 없음</option>
              )}
            </select>

            {/* 반 필터 */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              disabled={teacherInfo?.role === "homeroom_teacher"}
              className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                teacherInfo?.role === "homeroom_teacher"
                  ? "bg-gray-100 cursor-not-allowed"
                  : ""
              }`}
            >
              <option value="all">모든 반</option>
              {getClassOptions().map((cls) => (
                <option key={cls} value={cls}>
                  {cls}반
                </option>
              ))}
              {/* 디버깅용: 실제 옵션 개수 표시 */}
              {getClassOptions().length === 0 && (
                <option disabled>반 데이터 없음</option>
              )}
            </select>

            {/* 위험도 필터 */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">모든 위험도</option>
              <option value="high">주의 필요</option>
              <option value="medium">관찰 중</option>
              <option value="low">안정</option>
            </select>
          </div>
        </div>

        {/* 정렬 옵션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">정렬 기준</h3>
            <div className="flex space-x-2">
              {[
                { field: "name", label: "이름" },
                // { field: 'grade', label: '학년' },
                // { field: 'class', label: '반' },
                { field: "student_number", label: "번호" },
                { field: "risk_level", label: "위험도" },
                { field: "network_centrality", label: "교우관계 중심성" },
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    sortField === field
                      ? "border-blue-500 text-blue-700 bg-blue-50"
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
        </div>

        {/* 업로드 진행 상황 */}
        {isUploading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-blue-900">
                학생 명단 업로드 중...
              </h3>
              <span className="text-sm text-blue-700">
                {uploadProgress} / {uploadTotal}
              </span>
            </div>

            {/* 학교 정보 표시 */}
            {teacherInfo?.school_id && (
              <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded text-sm text-blue-800">
                <p>
                  <strong>등록 학교:</strong> {schoolName || "현재 학교"}
                </p>
                <p className="text-xs mt-1">
                  모든 학생이 이 학교에 자동으로 등록됩니다.
                </p>
              </div>
            )}

            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress / uploadTotal) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              {uploadProgress}명의 학생 정보를 업로드했습니다. (
              {Math.round((uploadProgress / uploadTotal) * 100)}%)
            </p>
          </div>
        )}

        {/* 학생 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
          {sortedStudents.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                학생이 없습니다
              </h3>
              <p className="text-gray-500">검색 조건을 변경해보세요.</p>
            </div>
          ) : (
            sortedStudents.map((student) => (
              <div
                key={student.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {student.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {student.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {student.grade}학년 {student.class}반{" "}
                        {parseInt(student.student_number)}번
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(
                      getRiskLevel(student)
                    )}`}
                  >
                    {getRiskLabel(getRiskLevel(student))}
                  </span>
                </div>

                {/* 메모 수 */}
                <div className="mb-4 text-sm">
                  <span className="text-gray-600">교사 메모:</span>
                  <span className="ml-2 text-gray-900">
                    {student.teacher_memos?.length || 0}개
                  </span>
                  <span className="ml-4 text-gray-600">개입 기록:</span>
                  <span className="ml-2 text-gray-900">
                    {student.intervention_logs?.length || 0}개
                  </span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewDetails(student)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    상세보기
                  </button>
                  <button
                    onClick={() => handleAddMemo(student)}
                    className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    메모 추가
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 상세보기 모달 */}
      {detailModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedStudent.name} 상세 정보
              </h2>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  기본 정보
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">학생 번호:</span>
                    <span className="ml-2 text-gray-900 font-medium text-blue-600">
                      {parseInt(selectedStudent.student_number)}번
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">성별:</span>
                    <span className="ml-2 text-gray-900">
                      {getGenderLabel(selectedStudent.gender)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">교육 ID:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedStudent.lifelong_education_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">입학일:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(
                        selectedStudent.enrolled_at
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">학급:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedStudent.grade}학년 {selectedStudent.class}반
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">생년월일:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedStudent.birth_date}
                    </span>
                  </div>
                </div>
              </div>

              {/* 학부모 연락처 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  학부모 연락처
                </h3>
                {selectedStudent.parent_contact &&
                typeof selectedStudent.parent_contact === "object" ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
                            console.error("어머니 이름 파싱 오류:", error);
                            return "정보 없음";
                          }
                        })()}
                      </span>
                      {(() => {
                        try {
                          const phone = (selectedStudent.parent_contact as any)
                            ?.mother_phone;
                          return phone &&
                            phone !== undefined &&
                            phone !== null ? (
                            <span className="ml-2 text-gray-600">
                              ({phone})
                            </span>
                          ) : null;
                        } catch (error) {
                          console.error("어머니 전화번호 파싱 오류:", error);
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
                            console.error("아버지 이름 파싱 오류:", error);
                            return "정보 없음";
                          }
                        })()}
                      </span>
                      {(() => {
                        try {
                          const phone = (selectedStudent.parent_contact as any)
                            ?.father_phone;
                          return phone &&
                            phone !== undefined &&
                            phone !== null ? (
                            <span className="ml-2 text-gray-600">
                              ({phone})
                            </span>
                          ) : null;
                        } catch (error) {
                          console.error("아버지 전화번호 파싱 오류:", error);
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

              {/* 교우관계 분석 */}
              {selectedStudent.network_metrics &&
                typeof selectedStudent.network_metrics === "object" &&
                selectedStudent.network_metrics !== null && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      교우관계 분석
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-md font-medium text-gray-700 mb-2">
                          중심성 지수
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">연결 중심성:</span>
                            <span className="ml-2 text-gray-900">
                              {safeStringify(
                                (selectedStudent.network_metrics as any)
                                  ?.centrality_scores?.centrality || "N/A"
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">매개 중심성:</span>
                            <span className="ml-2 text-gray-900">
                              {safeStringify(
                                (selectedStudent.network_metrics as any)
                                  ?.centrality_scores?.betweenness || "N/A"
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">근접 중심성:</span>
                            <span className="ml-2 text-gray-900">
                              {safeStringify(
                                (selectedStudent.network_metrics as any)
                                  ?.centrality_scores?.closeness || "N/A"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">소속 그룹:</span>
                          <span className="ml-2 text-gray-900">
                            {safeStringify(
                              (selectedStudent.network_metrics as any)
                                ?.community_membership || "N/A"
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            네트워크 위험도:
                          </span>
                          <span
                            className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(
                              getRiskLevel(selectedStudent)
                            )}`}
                          >
                            {getRiskLabel(getRiskLevel(selectedStudent))}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">중심성 점수:</span>
                        <span className="ml-2 text-gray-900">
                          {selectedStudent.network_metrics?.centrality_scores
                            ?.centrality
                            ? (
                                selectedStudent.network_metrics
                                  .centrality_scores.centrality * 100
                              ).toFixed(1) + "%"
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">권장사항:</span>
                        <span className="ml-2 text-gray-900">
                          {safeStringify(
                            (selectedStudent.network_metrics as any)
                              ?.recommendations || "N/A"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              {/* 교사 메모 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  교사 메모
                </h3>
                {selectedStudent.teacher_memos &&
                Array.isArray(selectedStudent.teacher_memos) &&
                selectedStudent.teacher_memos.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStudent.teacher_memos.map((memo, index) => (
                      <div
                        key={memo.id || index}
                        className="bg-gray-50 p-4 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-600">
                            {memo.created_at
                              ? new Date(memo.created_at).toLocaleDateString()
                              : "날짜 없음"}
                          </span>
                          {memo.teacher_name && (
                            <span className="text-sm text-gray-500">
                              {memo.teacher_name}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900">
                          {(() => {
                            try {
                              const content = memo.content;
                              return content !== undefined && content !== null
                                ? content
                                : "내용 없음";
                            } catch (error) {
                              console.error("메모 내용 파싱 오류:", error);
                              return "내용 없음";
                            }
                          })()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">등록된 메모가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메모 추가 모달 */}
      {memoModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedStudent.name} 학생 메모 추가
              </h2>
              <button
                onClick={closeMemoModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              <div className="mb-4">
                <label
                  htmlFor="memoContent"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  메모 내용
                </label>
                <textarea
                  id="memoContent"
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="학생에 대한 메모를 입력하세요..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMemoModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveMemo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  저장
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
