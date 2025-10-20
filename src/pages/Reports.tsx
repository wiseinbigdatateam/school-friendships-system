import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline/index.js';
import { 
  generateStudentGuidanceReport, 
  generateFallbackReport,
  type StudentAnalysisData,
  type GeneratedReport 
} from '../services/chatgptService';

// 담임교사 정보 타입
interface TeacherInfo {
  id: string;
  school_id: string;
  grade_level: number;
  class_number: number;
  role: string;
}

// 학생 정보 타입
interface Student {
  id: string;
  name: string;
  grade: number;
  class: number;
  current_school_id: string;
}

// 네트워크 분석 결과 타입
interface NetworkAnalysisResult {
  survey_id: string;
  student_id: string;
  centrality_scores: {
    centrality: number;
    community: number;
  };
  risk_indicators: {
    total_relationships: number;
    isolation_risk: string;
  };
  recommendations: {
    friendship_development: string;
    community_integration: string;
    personal_summary?: any;
  };
  calculated_at: string;
}

// AI 리포트 DB 저장 타입
interface AiReportDB {
  id: string;
  student_id: string;
  survey_id: string | null;
  teacher_id: string;
  summary: string;
  current_status: string;
  risk_assessment: string;
  guidance_plan: string;
  specific_actions: string[];
  monitoring_points: string[];
  expected_outcomes: string[];
  created_at: string;
  updated_at: string;
}

const Reports: React.FC = () => {
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [analysisResults, setAnalysisResults] = useState<NetworkAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedReport, setSelectedReport] = useState<NetworkAnalysisResult | null>(null);
  const [aiReport, setAiReport] = useState<GeneratedReport | null>(null);
  const [generatingAiReport, setGeneratingAiReport] = useState(false);
  
  // 정렬 관련 상태
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // 사용자 정보와 학생 데이터 가져오기
  useEffect(() => {
    if (userSchoolId && teacherInfo) {
      fetchStudents();
    }
  }, [userSchoolId, teacherInfo]);

  // 학생 데이터가 로드된 후 분석 결과 가져오기
  useEffect(() => {
    if (students.length > 0) {
      // 먼저 localStorage에서 임시 분석 결과 확인
      const tempAnalysis = localStorage.getItem('temp_network_analysis');
      if (tempAnalysis) {
        try {
          const parsed = JSON.parse(tempAnalysis);
          const now = new Date();
          const timestamp = new Date(parsed.timestamp);
          
          // 5분 이내의 데이터만 유효하게 처리
          if (now.getTime() - timestamp.getTime() < 5 * 60 * 1000) {
            
            // 임시 분석 결과를 개별 학생별로 변환
            const validResults: NetworkAnalysisResult[] = students.map(student => {
              // 학생 ID와 이름으로 매칭 시도 (더 안전한 매칭)
              const node = parsed.analysis_data.nodes.find((n: any) => 
                n.id === student.id || 
                (n.name === student.name && n.grade === student.grade && n.class === student.class)
              );
              
              if (!node) {
                return null;
              }

              return {
                survey_id: parsed.survey_id,
                student_id: student.id,
                centrality_scores: {
                  centrality: node.centrality,
                  community: node.community
                },
                risk_indicators: {
                  total_relationships: parsed.analysis_data.edges.filter((e: any) => 
                    e.source === student.id || e.target === student.id
                  ).length,
                  isolation_risk: node.centrality < 0.3 ? 'high' : 'low'
                },
                recommendations: {
                  friendship_development: node.centrality < 0.3 ? 
                    '친구 관계를 더 발전시킬 필요가 있습니다.' : 
                    '좋은 친구 관계를 유지하고 있습니다.',
                  community_integration: node.community >= 0 ? 
                    '커뮤니티에 잘 통합되어 있습니다.' : 
                    '커뮤니티 참여를 늘릴 필요가 있습니다.'
                },
                calculated_at: parsed.timestamp
              };
            }).filter(Boolean) as NetworkAnalysisResult[];

            setAnalysisResults(validResults);
            
            // 사용 후 localStorage에서 제거
            localStorage.removeItem('temp_network_analysis');
            return;
          } else {
            localStorage.removeItem('temp_network_analysis');
          }
        } catch (error) {
          console.error('🔍 임시 분석 결과 파싱 오류:', error);
          localStorage.removeItem('temp_network_analysis');
        }
      }
      
      // 임시 결과가 없으면 DB에서 조회
      fetchAnalysisResults();
    }
  }, [students.length]); // students 배열의 길이만 의존성으로 사용

  // AI 리포트 불러오기
  const fetchAiReport = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_reports' as any)
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const report = data[0] as any;
        // DB 데이터를 GeneratedReport 형식으로 변환
        const convertedReport: GeneratedReport = {
          // 새로운 구조 (기본값으로 설정)
          comprehensiveDiagnosis: {
            studentType: '일반형',
            summary: report.summary || '분석 결과가 없습니다.',
            keyCharacteristics: [],
            challenges: []
          },
          detailedAnalysis: {
            schoolLifeSatisfaction: {
              surveyResults: [],
              analysis: '설문 결과 분석이 필요합니다.'
            },
            peerNetworkAnalysis: {
              receivedChoices: 0,
              madeChoices: 0,
              networkPosition: '분석 필요',
              analysis: '네트워크 분석이 필요합니다.'
            }
          },
          strengthsAndImprovements: {
            strengths: [],
            improvementAreas: []
          },
          customizedSolutions: {
            overallGoal: report.guidance_plan || '학생의 전인적 성장을 지원합니다.',
            shortTermSolutions: [],
            midTermSolutions: [],
            longTermSolutions: []
          },
          // 기존 필드들 (호환성을 위해 유지)
          summary: report.summary,
          currentStatus: report.current_status,
          riskAssessment: report.risk_assessment,
          guidancePlan: report.guidance_plan,
          specificActions: report.specific_actions || [],
          monitoringPoints: report.monitoring_points || [],
          expectedOutcomes: report.expected_outcomes || []
        };
        setAiReport(convertedReport);
      } else {
        setAiReport(null);
      }
    } catch (error) {
      console.error('AI 리포트 불러오기 오류:', error);
      setAiReport(null);
    }
  };

  // 권한별 접근 제어
  const canAccessPage = () => {
    if (!teacherInfo) return false;
    
    const allowedRoles = ['homeroom_teacher', 'grade_teacher', 'school_admin', 'district_admin'];
    return allowedRoles.includes(teacherInfo.role);
  };

  const getAccessScope = () => {
    if (!teacherInfo) return { type: 'none', description: '' };
    
    switch (teacherInfo.role) {
      case 'homeroom_teacher':
        return { 
          type: 'class', 
          description: `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반 학생만` 
        };
      case 'grade_teacher':
        return { 
          type: 'grade', 
          description: `${teacherInfo.grade_level}학년 전체 학생` 
        };
      case 'school_admin':
        return { 
          type: 'school', 
          description: '학교 전체 학생' 
        };
      case 'district_admin':
        return { 
          type: 'district', 
          description: '전체 소속 학교 학생' 
        };
      default:
        return { type: 'none', description: '' };
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const userStr = localStorage.getItem('wiseon_user');
      const authToken = localStorage.getItem('wiseon_auth_token');
      
      if (!userStr || !authToken) {
        window.location.href = '/login';
        return;
      }
      
      const user = JSON.parse(userStr);
      
      // Supabase에서 최신 사용자 정보 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('사용자 정보 조회 오류:', userError);
        window.location.href = '/login';
        return;
      }
      
      if (userData.school_id) {
        setUserSchoolId(userData.school_id);
        setTeacherInfo({
          id: userData.id,
          school_id: userData.school_id,
          grade_level: parseInt(userData.grade_level?.toString() || '1'),
          class_number: parseInt(userData.class_number?.toString() || '1'),
          role: userData.role || 'homeroom_teacher'
        });
      }
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error);
    }
  };

  const fetchStudents = async () => {
    if (!userSchoolId || !teacherInfo) return;
    
    try {
      let query = supabase
        .from('students')
        .select('*')
        .eq('is_active', true);

      // 학교별 필터링
      if (teacherInfo.role === 'district_admin') {
        // 교육청 관리자: 모든 학교 학생 조회 (필터링 없음)
      } else {
        // 다른 역할: 해당 학교 학생만 조회
        query = query.eq('current_school_id', userSchoolId);
      }

      // 권한별 학생 데이터 필터링
      if (teacherInfo.role === 'homeroom_teacher') {
        // 담임교사: 특정 학년/반만
        query = query
          .eq('grade', teacherInfo.grade_level.toString())
          .eq('class', teacherInfo.class_number.toString());
      } else if (teacherInfo.role === 'grade_teacher') {
        // 학년담당: 해당 학년 전체
        query = query.eq('grade', teacherInfo.grade_level.toString());
      } else if (teacherInfo.role === 'school_admin') {
        // 학교관리자: 해당 학교 전체 (추가 필터링 없음)
      } else if (teacherInfo.role === 'district_admin') {
        // 교육청관리자: 모든 학교 (추가 필터링 없음)
      }

      const { data, error } = await query;

      if (error) {
        console.error('학생 데이터 조회 오류:', error);
        return;
      }

      const convertedStudents: Student[] = (data || []).map(student => ({
        id: student.id,
        name: student.name,
        grade: parseInt(student.grade) || 1,
        class: parseInt(student.class) || 1,
        current_school_id: student.current_school_id || (userSchoolId ?? '')
      }));
      
      
      setStudents(convertedStudents);
    } catch (error) {
      console.error('학생 데이터 조회 오류:', error);
    }
  };

  const fetchAnalysisResults = async () => {
    if (students.length === 0) {
      return;
    }
    
    try {
      setLoading(true);
      
      
      // 전체 네트워크 분석 결과 조회 (새로운 저장 방식)
      const { data, error } = await supabase
        .from('network_analysis_results')
        .select('*')
        .eq('analysis_type', 'complete_network_analysis')
        .order('calculated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('🔍 분석 결과 조회 오류:', error);
        return;
      }


      if (!data || data.length === 0) {
        setAnalysisResults([]);
        return;
      }

      // 전체 분석 결과에서 개별 학생 데이터 추출
      if (!data || data.length === 0) {
        setAnalysisResults([]);
        return;
      }

      const completeAnalysis = data[0];
      const recommendations = completeAnalysis.recommendations as any;
      const completeData = recommendations?.complete_analysis_data;

      if (!completeData) {
        setAnalysisResults([]);
        return;
      }

      // 전체 분석 결과를 개별 학생별로 변환하고 학생들의 network_metrics도 업데이트
      const validResults: NetworkAnalysisResult[] = students.map(student => {
        const node = completeData.nodes.find((n: any) => n.id === student.id);
        if (!node) {
          return null;
        }

        // 학생의 network_metrics는 별도로 관리하지 않음 (무한 루프 방지)

        // 학생별 개별 분석 결과 생성
        return {
          survey_id: completeAnalysis.survey_id!,
          student_id: student.id,
          centrality_scores: {
            centrality: node.centrality,
            community: node.community
          },
          risk_indicators: {
            total_relationships: completeData.edges.filter((e: any) => 
              e.source === student.id || e.target === student.id
            ).length,
            isolation_risk: node.centrality < 0.3 ? 'high' : 'low'
          },
          recommendations: {
            friendship_development: node.centrality < 0.3 ? 
              '친구 관계를 더 발전시킬 필요가 있습니다.' : 
              '좋은 친구 관계를 유지하고 있습니다.',
            community_integration: node.community >= 0 ? 
              '커뮤니티에 잘 통합되어 있습니다.' : 
              '커뮤니티 참여를 늘릴 필요가 있습니다.'
          },
          calculated_at: completeAnalysis.calculated_at || new Date().toISOString()
        };
      }).filter(Boolean) as NetworkAnalysisResult[];

      setAnalysisResults(validResults);
    } catch (error) {
      console.error('🔍 분석 결과 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentReport = (studentId: string) => {
    return analysisResults.find(result => result.student_id === studentId);
  };

  // 학생관리 페이지와 동일한 위험도 계산 방식
  const getRiskLevel = (centrality: number) => {
    if (centrality < 0.3) return { level: 'high', label: '주의 필요', color: 'text-red-600 bg-red-100' };
    if (centrality < 0.6) return { level: 'medium', label: '관찰 중', color: 'text-yellow-600 bg-yellow-100' };
    return { level: 'low', label: '안정', color: 'text-green-600 bg-green-100' };
  };



  const handleViewReport = async (student: Student) => {
    const report = getStudentReport(student.id);
    if (report) {
      setSelectedStudent(student);
      setSelectedReport(report);
      // AI 리포트 불러오기
      await fetchAiReport(student.id);
    } else {
      toast.error('해당 학생의 분석 결과가 없습니다. 네트워크 분석을 먼저 진행해주세요.');
    }
  };

  const handleDownloadReport = async (student: Student) => {
    try {
      toast.success(`${student.name} 학생의 리포트 다운로드를 시작합니다...`);
      
      // 해당 학생의 리포트 데이터 가져오기
      const studentReport = analysisResults.find(result => result.student_id === student.id);
      if (!studentReport) {
        toast.error('해당 학생의 리포트 데이터를 찾을 수 없습니다.');
        return;
      }

      // AI 리포트 조회
      const { data: aiReportData } = await supabase
        .from('ai_reports' as any)
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(1);

      let studentAiReport = aiReportData && aiReportData.length > 0 ? (aiReportData[0] as any) : null;

      // 임시 모달 내용 생성 (화면에 표시하지 않고)
      const tempModalContent = document.createElement('div');
      tempModalContent.className = 'modal-content-for-capture';
      tempModalContent.style.position = 'absolute';
      tempModalContent.style.left = '-9999px';
      tempModalContent.style.top = '-9999px';
      tempModalContent.style.width = '800px';
      tempModalContent.style.backgroundColor = 'white';
      tempModalContent.style.padding = '20px';
      tempModalContent.style.fontFamily = 'Arial, sans-serif';
      
      // 리포트 내용 HTML 생성
      tempModalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 8px;">
            ${student.name} 학생 지도 리포트
          </h2>
          <p style="color: #6b7280; font-size: 16px;">
            ${student.grade}학년 ${student.class}반
          </p>
        </div>
        
        ${studentAiReport ? `
        <div style="background: linear-gradient(to right, #fdf4ff, #eff6ff); border: 1px solid #c084fc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <div style="margin-bottom: 16px;">
            <h4 style="font-size: 18px; font-weight: 600; color: #581c87; margin-bottom: 8px;">🤖 AI 지도 리포트</h4>
          </div>
          
          <div style="margin-bottom: 16px;">
            <h5 style="font-weight: 600; color: #581c87; margin-bottom: 8px;">📋 전반적 요약</h5>
            <p style="color: #374151; font-size: 14px;">${studentAiReport.summary}</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <h5 style="font-weight: 600; color: #581c87; margin-bottom: 8px;">📍 현재 상태 분석</h5>
            <p style="color: #374151; font-size: 14px;">${studentAiReport.current_status}</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <h5 style="font-weight: 600; color: #581c87; margin-bottom: 8px;">⚠️ 위험 요소 평가</h5>
            <p style="color: #374151; font-size: 14px;">${studentAiReport.risk_assessment}</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <h5 style="font-weight: 600; color: #581c87; margin-bottom: 8px;">🎯 지도 방향</h5>
            <p style="color: #374151; font-size: 14px;">${studentAiReport.guidance_plan}</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <h5 style="font-weight: 600; color: #581c87; margin-bottom: 8px;">🛠️ 구체적 지도 행동</h5>
            <ul style="color: #374151; font-size: 14px; margin: 0; padding-left: 20px;">
              ${studentAiReport.specific_actions.map((action: string) => `<li style="margin-bottom: 4px;">• ${action}</li>`).join('')}
            </ul>
          </div>
          
          <div style="margin-bottom: 16px;">
            <h5 style="font-weight: 600; color: #581c87; margin-bottom: 8px;">👀 모니터링 포인트</h5>
            <ul style="color: #374151; font-size: 14px; margin: 0; padding-left: 20px;">
              ${studentAiReport.monitoring_points.map((point: string) => `<li style="margin-bottom: 4px;">• ${point}</li>`).join('')}
            </ul>
          </div>
          
          <div style="margin-bottom: 16px;">
            <h5 style="font-weight: 600; color: #581c87; margin-bottom: 8px;">📈 기대 성과</h5>
            <ul style="color: #374151; font-size: 14px; margin: 0; padding-left: 20px;">
              ${studentAiReport.expected_outcomes.map((outcome: string) => `<li style="margin-bottom: 4px;">• ${outcome}</li>`).join('')}
            </ul>
          </div>
        </div>
        ` : ''}
        
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <h4 style="font-weight: 600; color: #111827; margin-bottom: 12px;">기본 분석 정보</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; font-size: 14px;">
            <div>
              <span style="color: #6b7280;">중심성:</span>
              <div style="font-weight: 600;">${(studentReport.centrality_scores.centrality * 100).toFixed(1)}%</div>
            </div>
            <div>
              <span style="color: #6b7280;">커뮤니티:</span>
              <div style="font-weight: 600;">${studentReport.centrality_scores.community + 1}번 그룹</div>
            </div>
            <div>
              <span style="color: #6b7280;">친구 관계:</span>
              <div style="font-weight: 600;">${studentReport.risk_indicators.total_relationships}명</div>
            </div>
            <div>
              <span style="color: #6b7280;">분석 일시:</span>
              <div style="font-weight: 600;">${new Date(studentReport.calculated_at).toLocaleDateString('ko-KR')}</div>
            </div>
          </div>
        </div>
        
        <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <h4 style="font-weight: 600; color: #111827; margin-bottom: 12px;">위험 지표</h4>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; font-size: 14px;">
            <div>
              <span style="color: #6b7280;">네트워크 위험도:</span>
              <div style="font-weight: 600; color: #dc2626;">${studentReport.risk_indicators.isolation_risk}</div>
            </div>
            <div>
              <span style="color: #6b7280;">중심성 점수:</span>
              <div style="font-weight: 600;">${(studentReport.centrality_scores.centrality * 100).toFixed(1)}%</div>
            </div>
            <div>
              <span style="color: #6b7280;">친구 관계 수:</span>
              <div style="font-weight: 600;">${studentReport.risk_indicators.total_relationships}명</div>
            </div>
          </div>
        </div>
        
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px;">
          <h4 style="font-weight: 600; color: #111827; margin-bottom: 12px;">지도 권장사항</h4>
          <ul style="color: #374151; font-size: 14px; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 4px;">• ${studentReport.recommendations.friendship_development}</li>
            <li style="margin-bottom: 4px;">• ${studentReport.recommendations.community_integration}</li>
          </ul>
        </div>
      `;
      
      // DOM에 임시 추가
      document.body.appendChild(tempModalContent);
      
      // html2canvas로 캡쳐
      const canvas = await html2canvas(tempModalContent, {
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // 임시 요소 제거
      document.body.removeChild(tempModalContent);

      // 캔버스를 이미지로 변환
      const imgData = canvas.toDataURL('image/png');

      // PDF 생성
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 너비
      const pageHeight = 295; // A4 높이
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0; // 이미지 시작 위치

      // 첫 페이지 추가
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 여러 페이지가 필요한 경우 추가
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 파일명 생성
      const fileName = `${student.name}_${student.grade}학년${student.class}반_지도리포트.pdf`;
      
      // PDF 다운로드
      pdf.save(fileName);
      
      toast.success('리포트 다운로드가 완료되었습니다!');
      
    } catch (error) {
      console.error('리포트 다운로드 오류:', error);
      toast.error('리포트 다운로드에 실패했습니다.');
    }
  };





  // 정렬된 학생 목록 계산
  const sortedStudents = useMemo(() => {
    if (!students.length) return [];
    
    return [...students].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'grade':
          aValue = a.grade;
          bValue = b.grade;
          break;
        case 'class':
          aValue = a.class;
          bValue = b.class;
          break;
        case 'centrality':
          const reportA = getStudentReport(a.id);
          const reportB = getStudentReport(b.id);
          aValue = reportA?.centrality_scores?.centrality || 0;
          bValue = reportB?.centrality_scores?.centrality || 0;
          break;
        case 'relationships':
          const reportA2 = getStudentReport(a.id);
          const reportB2 = getStudentReport(b.id);
          aValue = reportA2?.risk_indicators?.total_relationships || 0;
          bValue = reportB2?.risk_indicators?.total_relationships || 0;
          break;
        case 'risk':
          const reportA3 = getStudentReport(a.id);
          const reportB3 = getStudentReport(b.id);
          const riskA = getRiskLevel(reportA3?.centrality_scores?.centrality || 0);
          const riskB = getRiskLevel(reportB3?.centrality_scores?.centrality || 0);
          const riskOrder = { '주의 필요': 3, '관찰 중': 2, '안정': 1 };
          aValue = riskOrder[riskA.label as keyof typeof riskOrder] || 0;
          bValue = riskOrder[riskB.label as keyof typeof riskOrder] || 0;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [students, sortBy, sortOrder, analysisResults]);

  const generateAiReport = async (student: Student, report: NetworkAnalysisResult) => {
    try {
      setGeneratingAiReport(true);
      
      // ChatGPT API에 전달할 데이터 준비
      const analysisData: StudentAnalysisData = {
        studentName: student.name,
        grade: student.grade,
        class: student.class,
        centrality: report.centrality_scores.centrality,
        community: report.centrality_scores.community,
        totalRelationships: report.risk_indicators.total_relationships,
        isolationRisk: report.risk_indicators.isolation_risk,
        friendshipDevelopment: report.recommendations.friendship_development,
        communityIntegration: report.recommendations.community_integration,
        personalSummary: report.recommendations.personal_summary
      };

      // ChatGPT API 호출
      const aiGeneratedReport = await generateStudentGuidanceReport(analysisData);
      setAiReport(aiGeneratedReport);
      
      // AI 리포트를 DB에 저장
      try {
        const { error: saveError } = await supabase
          .from('ai_reports' as any)
          .insert([{
            student_id: student.id,
            survey_id: report.survey_id,
            teacher_id: teacherInfo?.id,
            summary: aiGeneratedReport.summary,
            current_status: aiGeneratedReport.currentStatus,
            risk_assessment: aiGeneratedReport.riskAssessment,
            guidance_plan: aiGeneratedReport.guidancePlan,
            specific_actions: aiGeneratedReport.specificActions,
            monitoring_points: aiGeneratedReport.monitoringPoints,
            expected_outcomes: aiGeneratedReport.expectedOutcomes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (saveError) throw saveError;
        toast.success('AI 지도 리포트가 생성되고 저장되었습니다!');
      } catch (saveError) {
        console.error('AI 리포트 저장 오류:', saveError);
        toast.success('AI 지도 리포트가 생성되었습니다! (DB 저장 실패)');
      }
      
    } catch (error) {
      console.error('AI 리포트 생성 오류:', error);
      toast.error('AI 리포트 생성에 실패했습니다. 기본 리포트를 표시합니다.');
      
      // API 실패 시 대체 리포트 생성
      const fallbackData: StudentAnalysisData = {
        studentName: student.name,
        grade: student.grade,
        class: student.class,
        centrality: report.centrality_scores.centrality,
        community: report.centrality_scores.community,
        totalRelationships: report.risk_indicators.total_relationships,
        isolationRisk: report.risk_indicators.isolation_risk,
        friendshipDevelopment: report.recommendations.friendship_development,
        communityIntegration: report.recommendations.community_integration,
        personalSummary: report.recommendations.personal_summary
      };
      
      const fallbackReport = generateFallbackReport(fallbackData);
      setAiReport(fallbackReport);
      
      // Fallback 리포트도 DB에 저장
      try {
        const { error: saveError } = await supabase
          .from('ai_reports' as any)
          .insert([{
            student_id: student.id,
            survey_id: report.survey_id,
            teacher_id: teacherInfo?.id,
            summary: fallbackReport.summary,
            current_status: fallbackReport.currentStatus,
            risk_assessment: fallbackReport.riskAssessment,
            guidance_plan: fallbackReport.guidancePlan,
            specific_actions: fallbackReport.specificActions,
            monitoring_points: fallbackReport.monitoringPoints,
            expected_outcomes: fallbackReport.expectedOutcomes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (saveError) throw saveError;
      } catch (saveError) {
        console.error('Fallback 리포트 저장 오류:', saveError);
      }
    } finally {
      setGeneratingAiReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">리포트를 불러오는 중...</p>
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
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.732 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-600">지도 리포트 페이지에 접근할 수 있는 권한이 없습니다.</p>
          <p className="text-sm text-gray-500 mt-2">담임교사, 학년 부장, 학교 관리자, 교육청 관리자만 접근 가능합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
                 <div className="flex items-center justify-between">
                   <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">지도 리포트</h1>
                     <p className="text-gray-600">
                       {teacherInfo?.role === 'homeroom_teacher' && 
                         `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반 학생들의 교우관계 분석 리포트를 확인하고 관리합니다.`
                       }
                       {teacherInfo?.role === 'grade_teacher' && 
                         `${teacherInfo.grade_level}학년 전체 학생들의 교우관계 분석 리포트를 확인하고 관리합니다.`
                       }
                       {teacherInfo?.role === 'school_admin' && 
                         '학교 전체 학생들의 교우관계 분석 리포트를 확인하고 관리합니다.'
                       }
                       {teacherInfo?.role === 'district_admin' && 
                         '전체 학교 학생들의 교우관계 분석 리포트를 확인하고 관리합니다.'
                       }
                     </p>
        </div>

                   {/* 버튼들 주석처리
                   <div className="flex space-x-3">
                     <button
                       onClick={async () => {
                         try {
                           setLoading(true);
                           await fetchAnalysisResults();
                           toast.success('분석 결과를 새로고침했습니다!');
                         } catch (error) {
                           console.error('새로고침 오류:', error);
                           toast.error('새로고침에 실패했습니다.');
                         } finally {
                           setLoading(false);
                         }
                       }}
                       disabled={loading}
                       className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                         loading
                           ? 'bg-gray-400 cursor-not-allowed'
                           : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                       }`}
                     >
                       {loading ? (
                         <div className="flex items-center space-x-2">
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                           <span>새로고침 중...</span>
                         </div>
                       ) : (
                         <div className="flex items-center space-x-2">
                           <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                           </svg>
                           <span>분석 결과 새로고침</span>
                         </div>
                       )}
                     </button>

                     <button
                       onClick={async () => {
                         try {
                           setLoading(true);
                           
                           // 모든 네트워크 분석 결과 조회 (학생 ID 제한 없이)
                           const { data, error } = await supabase
                             .from('network_analysis_results')
                             .select('*')
                             .eq('analysis_type', 'network_analysis');

                           if (error) {
                             console.error('🔍 강제 조회 오류:', error);
                             toast.error('강제 조회에 실패했습니다.');
                             return;
                           }

                           toast.success(`총 ${data?.length || 0}개의 분석 결과를 찾았습니다.`);
                           
                         } catch (error) {
                           console.error('🔍 강제 조회 오류:', error);
                           toast.error('강제 조회에 실패했습니다.');
                         } finally {
                           setLoading(false);
                         }
                       }}
                       disabled={loading}
                       className="inline-flex items-center px-4 py-2 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-colors"
                     >
                       🔍 강제 확인
                     </button>

                     <button
                       onClick={async () => {
                         try {
                           setLoading(true);
                           toast.success('네트워크 분석을 시작합니다. 교우관계 분석 페이지로 이동합니다.');
                           
                           // 잠시 후 교우관계 분석 페이지로 이동
                           setTimeout(() => {
                             window.location.href = '/network-analysis';
                           }, 1500);
                         } catch (error) {
                           console.error('페이지 이동 오류:', error);
                           toast.error('페이지 이동에 실패했습니다.');
                         } finally {
                           setLoading(false);
                         }
                       }}
                       disabled={loading}
                       className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                         loading
                           ? 'bg-gray-400 cursor-not-allowed'
                           : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                       }`}
                     >
                       {loading ? (
                         <div className="flex items-center space-x-2">
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                           <span>이동 중...</span>
                         </div>
                     ) : (
                       <div className="flex items-center space-x-2">
                         <ChartBarIcon className="h-5 w-5" />
                         <span>네트워크 분석 실행</span>
                       </div>
                     )}
                   </button>
                 </div>
                   */}
                 </div>
               </div>


               {/* 학생별 리포트 요약 */}
               {analysisResults.length > 0 ? (
                 <>
                   {/* 정렬 컨트롤 */}
                   <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                       <div className="flex items-center space-x-4">
                         <label className="text-sm font-medium text-gray-700">정렬 기준:</label>
                         <select
                           value={sortBy}
                           onChange={(e) => setSortBy(e.target.value)}
                           className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         >
                           <option value="name">이름</option>
                           <option value="grade">학년</option>
                           <option value="class">반</option>
                           <option value="centrality">중심성 점수</option>
                           <option value="relationships">친구 관계 수</option>
                           <option value="risk">위험도</option>
                         </select>
                         
                         <button
                           onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                           className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         >
                           {sortOrder === 'asc' ? '오름차순' : '내림차순'}
                           <svg className={`ml-2 h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
                         </button>
                       </div>
                       
                       <div className="text-sm text-gray-600">
                         총 {sortedStudents.length}명의 학생
                       </div>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                     {sortedStudents.map((student) => {
                     const report = getStudentReport(student.id);
                     // 네트워크 분석 결과 기반으로 위험도 계산
                     let riskLevel = null;
                     if (report) {
                       riskLevel = getRiskLevel(report.centrality_scores.centrality);
                     }
                     
                     return (
                       <div key={student.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                         <div className="flex items-center justify-between mb-4">
                           <h3 className="text-lg font-medium text-gray-900">{student.name}</h3>
                           {riskLevel && (
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskLevel.color}`}>
                               {riskLevel.label}
                             </span>
                           )}
                         </div>
                         
                         <div className="space-y-3 mb-4">
                           <div className="flex justify-between text-sm">
                             <span className="text-gray-600">학년/반:</span>
                             <span className="font-medium">{student.grade}학년 {student.class}반</span>
                           </div>
                           
                           {report && (
                             <>
                               <div className="flex justify-between text-sm">
                                 <span className="text-gray-600">중심성:</span>
                                 <span className="font-medium">{(report.centrality_scores.centrality * 100).toFixed(1)}%</span>
                               </div>
                               <div className="flex justify-between text-sm">
                                 <span className="text-gray-600">친구 관계:</span>
                                 <span className="font-medium">{report.risk_indicators.total_relationships}명</span>
                               </div>
                               <div className="flex justify-between text-sm">
                                 <span className="text-gray-600">커뮤니티:</span>
                                 <span className="font-medium">{report.centrality_scores.community + 1}번 그룹</span>
                               </div>
                             </>
                           )}
                         </div>

                         <div className="flex space-x-2">
                           <button
                             onClick={() => handleViewReport(student)}
                             className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
                           >
                             <EyeIcon className="w-4 h-4 mr-1" />
                             상세보기
                           </button>
                           <button
                             onClick={() => handleDownloadReport(student)}
                             className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center"
                           >
                             <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                             다운로드
                           </button>
                         </div>
                       </div>
                     );
                   })}
            </div>
               </>
               ) : (
                 <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                   <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                   <h3 className="text-lg font-medium text-gray-900 mb-2">아직 교우관계 분석이 진행되지 않았습니다</h3>
            <p className="text-gray-600 mb-6">
                     학생들의 교우관계를 분석하고 지도 리포트를 생성하려면 먼저 네트워크 분석을 실행해주세요.
                   </p>
                   <button
                     onClick={() => window.location.href = '/network'}
                     className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                   >
                     <ChartBarIcon className="h-5 w-5 mr-2" />
                     교우관계 분석 페이지로 이동
                   </button>
                 </div>
               )}

        {/* 상세 리포트 모달 */}
        {selectedStudent && selectedReport && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3 modal-content-for-capture">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedStudent.name} 학생 지도 리포트
                    </h3>
                    <p className="text-gray-600">
                      {selectedStudent.grade}학년 {selectedStudent.class}반
                    </p>
                  </div>
                                    <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setSelectedReport(null);
                      setAiReport(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
                  </button>
                </div>

                {/* AI 리포트 생성/재생성 버튼 */}
                <div className="mb-6">
                  {aiReport ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600 font-medium">AI 리포트가 이미 생성되어 있습니다</span>
                      </div>
                      <button
                        onClick={() => generateAiReport(selectedStudent, selectedReport)}
                        disabled={generatingAiReport}
                        className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                          generatingAiReport
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
                        }`}
                      >
                        {generatingAiReport ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>AI 리포트 재생성 중...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <SparklesIcon className="h-5 w-5" />
                            <span>AI 리포트 새로 생성</span>
                          </div>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateAiReport(selectedStudent, selectedReport)}
                      disabled={generatingAiReport}
                      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                        generatingAiReport
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                      }`}
                    >
                      {generatingAiReport ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>AI 리포트 생성 중...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <SparklesIcon className="h-5 w-5" />
                          <span>AI 지도 리포트 생성</span>
                        </div>
                      )}
                    </button>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    AI를 활용하여 맞춤형 지도 방안을 생성합니다.
                    {generatingAiReport && (
                      <span className="text-purple-600 font-medium ml-2">
                        ⏳ AI가 분석 중입니다...
                      </span>
                    )}
                  </p>
                </div>

                {/* AI 리포트 (생성된 경우) */}
                {aiReport && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
                    <div className="mb-4">
                      <div className="flex items-center">
                        <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
                        <h4 className="text-lg font-medium text-purple-900">🤖 AI 지도 리포트</h4>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* 요약 */}
                      <div className="bg-white p-4 rounded-lg border border-purple-100">
                        <h5 className="font-medium text-purple-900 mb-2">📋 전반적 요약</h5>
                        <p className="text-sm text-gray-700">{aiReport.summary}</p>
                      </div>

                      {/* 현재 상태 */}
                      <div className="bg-white p-4 rounded-lg border border-purple-100">
                        <h5 className="font-medium text-purple-900 mb-2">📍 현재 상태 분석</h5>
                        {typeof aiReport.currentStatus === 'string' ? (
                          <p className="text-sm text-gray-700">{aiReport.currentStatus}</p>
                        ) : (
                          <div className="space-y-2">
                            {aiReport.currentStatus?.schoolLifeSatisfaction && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">학교생활 만족도:</span> {aiReport.currentStatus.schoolLifeSatisfaction}
                              </p>
                            )}
                            {aiReport.currentStatus?.relationshipWithTeacher && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">교사 관계:</span> {aiReport.currentStatus.relationshipWithTeacher}
                              </p>
                            )}
                            {aiReport.currentStatus?.peerRelationship && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">또래 관계:</span> {aiReport.currentStatus.peerRelationship}
                              </p>
                            )}
                            {aiReport.currentStatus?.networkParticipation && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">네트워크 참여도:</span> {aiReport.currentStatus.networkParticipation}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 위험 평가 */}
                      <div className="bg-white p-4 rounded-lg border border-purple-100">
                        <h5 className="font-medium text-purple-900 mb-2">⚠️ 위험 요소 평가</h5>
                        {typeof aiReport.riskAssessment === 'string' ? (
                          <p className="text-sm text-gray-700">{aiReport.riskAssessment}</p>
                        ) : (
                          <div className="space-y-2">
                            {aiReport.riskAssessment?.overall && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">전체 평가:</span> {aiReport.riskAssessment.overall}
                              </p>
                            )}
                            {aiReport.riskAssessment?.strengths && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">강점:</span> {aiReport.riskAssessment.strengths}
                              </p>
                            )}
                            {aiReport.riskAssessment?.concerns && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">우려사항:</span> {aiReport.riskAssessment.concerns}
                              </p>
                            )}
                            {aiReport.riskAssessment?.recommendations && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">권장사항:</span> {aiReport.riskAssessment.recommendations}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 지도 방향 */}
                      <div className="bg-white p-4 rounded-lg border border-purple-100">
                        <h5 className="font-medium text-purple-900 mb-2">🎯 지도 방향</h5>
                        <p className="text-sm text-gray-700">{aiReport.guidancePlan}</p>
                      </div>

                      {/* 구체적 행동 */}
                      <div className="bg-white p-4 rounded-lg border border-purple-100">
                        <h5 className="font-medium text-purple-900 mb-2">🛠️ 구체적 지도 행동</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {aiReport.specificActions?.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-purple-600 mr-2">•</span>
                              {action}
                            </li>
                          )) || []}
                        </ul>
                      </div>

                      {/* 모니터링 포인트 */}
                      <div className="bg-white p-4 rounded-lg border border-purple-100">
                        <h5 className="font-medium text-purple-900 mb-2">👀 모니터링 포인트</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {aiReport.monitoringPoints?.map((point, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-purple-600 mr-2">•</span>
                              {point}
                            </li>
                          )) || []}
                        </ul>
                      </div>

                      {/* 기대 성과 */}
                      <div className="bg-white p-4 rounded-lg border border-purple-100">
                        <h5 className="font-medium text-purple-900 mb-2">📈 기대 성과</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {aiReport.expectedOutcomes?.map((outcome, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-purple-600 mr-2">•</span>
                              {outcome}
                            </li>
                          )) || []}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 리포트 내용 */}
                <div className="space-y-6">
                  {/* 기본 정보 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">기본 분석 정보</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">중심성:</span>
                        <div className="font-medium">{(selectedReport.centrality_scores.centrality * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600">커뮤니티:</span>
                        <div className="font-medium">{selectedReport.centrality_scores.community + 1}번 그룹</div>
                      </div>
                      <div>
                        <span className="text-gray-600">친구 관계:</span>
                        <div className="font-medium">{selectedReport.risk_indicators.total_relationships}명</div>
                      </div>
                      <div>
                        <span className="text-gray-600">분석 일시:</span>
                        <div className="font-medium">{new Date(selectedReport.calculated_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* 위험 지표 */}
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-3">위험 지표</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-red-700">네트워크 위험도:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevel(selectedReport.centrality_scores.centrality).color}`}>
                          {getRiskLevel(selectedReport.centrality_scores.centrality).label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">중심성 점수:</span>
                        <span className="font-medium text-red-900">
                          {(selectedReport.centrality_scores.centrality * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">친구 관계 수:</span>
                        <span className="font-medium text-red-900">
                          {selectedReport.risk_indicators.total_relationships}명
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 권장사항 */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">지도 권장사항</h4>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div>• {selectedReport.recommendations.friendship_development}</div>
                      <div>• {selectedReport.recommendations.community_integration}</div>
                    </div>
                  </div>

                  {/* 개인별 요약 (있는 경우) */}
                  {selectedReport.recommendations.personal_summary && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-3">개인별 요약</h4>
                      <div className="space-y-3 text-sm text-green-800">
                        <div>
                          <span className="font-medium">현재 상태:</span>
                          <div className="ml-4">
                            • 네트워크 위치: {selectedReport.recommendations.personal_summary.current_status.network_position}
                            • 커뮤니티 그룹: {selectedReport.recommendations.personal_summary.current_status.community_group}번
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">개선방안:</span>
                          <div className="ml-4">
                            {selectedReport.recommendations.personal_summary.improvement_plan.map((plan: string, index: number) => (
                              <div key={index}>• {plan}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;