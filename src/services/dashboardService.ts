import { supabase, Tables } from '../lib/supabase';
import { NotificationService } from './notificationService';

export interface DashboardData {
  totalStudents: number;
  activeSurveys: number;
  completedSurveys: number;
  draftSurveys: number; // 초안 설문 수 추가
  highRiskStudents: number;
  mediumRiskStudents: number; // 관찰중인 학생 수 추가
  recentSurveys: Tables<'surveys'>[];
  alerts: Alert[];
  surveyCompletionRate: number;
  networkAnalysisProgress: number;
  activeSurveyResponseRate: number; // 진행 중인 설문 답변률 추가
  // 학년별/반별 통계 추가
  studentsByGrade: Record<string, number>;
  studentsByClass: Record<string, number>;
  surveysByGrade: Record<string, number>;
  surveysByClass: Record<string, number>;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  category: string;
}

export class DashboardService {
  // 대시보드 전체 데이터 조회
  static async getDashboardData(schoolId: string, teacherInfo?: { grade_level?: string; class_number?: string; role?: string }): Promise<DashboardData> {
    try {
      // 디버깅: teacherInfo 로그
      console.log('🔍 DashboardService.getDashboardData 호출:', {
        schoolId,
        teacherInfo,
        isHomeroomTeacher: teacherInfo?.role === 'homeroom_teacher',
        hasGradeLevel: !!teacherInfo?.grade_level,
        hasClassNumber: !!teacherInfo?.class_number
      });
      // 병렬로 여러 데이터 조회
      const [
        studentsResult,
        surveysResult,
        activeSurveysResult,
        completedSurveysResult,
        draftSurveysResult,
        recentSurveysResult
      ] = await Promise.all([
        // 전체 학생 수 (담임인 경우 담당 학년/반만)
        (() => {
          const isHomeroomQuery = teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number;
          console.log('🔍 학생 조회 쿼리:', {
            isHomeroomQuery,
            grade: teacherInfo?.grade_level,
            class: teacherInfo?.class_number,
            schoolId
          });
          
          return isHomeroomQuery ?
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('current_school_id', schoolId)
              .eq('is_active', true)
              .eq('grade', teacherInfo.grade_level!)
              .eq('class', teacherInfo.class_number!) :
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('current_school_id', schoolId)
              .eq('is_active', true);
        })(),
        
        // 전체 설문 수 (담임인 경우 담당 학년/반 대상 설문만)
        teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number ?
          supabase
            .from('surveys')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .contains('target_grades', [teacherInfo.grade_level])
            .contains('target_classes', [teacherInfo.class_number]) :
        supabase
          .from('surveys')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId),
        
        // 진행 중인 설문 수 (담임인 경우 담당 학년/반 대상 설문만)
        teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number ?
          supabase
            .from('surveys')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('status', 'active')
            .contains('target_grades', [teacherInfo.grade_level])
            .contains('target_classes', [teacherInfo.class_number]) :
        supabase
          .from('surveys')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'active'),
        
        // 완료된 설문 수 (담임인 경우 담당 학년/반 대상 설문만)
        teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number ?
          supabase
            .from('surveys')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('status', 'completed')
            .contains('target_grades', [teacherInfo.grade_level])
            .contains('target_classes', [teacherInfo.class_number]) :
        supabase
          .from('surveys')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'completed'),
        
        // 초안 설문 수 (담임인 경우 담당 학년/반 대상 설문만)
        teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number ?
          supabase
            .from('surveys')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('status', 'draft')
            .contains('target_grades', [teacherInfo.grade_level])
            .contains('target_classes', [teacherInfo.class_number]) :
        supabase
          .from('surveys')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'draft'),
        
        // 최근 설문 목록 (담임인 경우 담당 학년/반 대상 설문만)
        teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number ?
        supabase
            .from('surveys')
            .select('*')
            .eq('school_id', schoolId)
            .contains('target_grades', [teacherInfo.grade_level])
            .contains('target_classes', [teacherInfo.class_number])
            .order('created_at', { ascending: false })
            .limit(5) :
        supabase
          .from('surveys')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // 위험도별 학생 수를 네트워크 분석 결과 기반으로 계산 (학생관리 페이지와 동일한 방식)
      let highRiskStudentsResult = { count: 0, error: null };
      let mediumRiskStudentsResult = { count: 0, error: null };
      try {
        // complete_network_analysis에서 최신 분석 결과 조회
        const { data: completeAnalysis, error: analysisError } = await supabase
          .from('network_analysis_results')
          .select('*')
          .eq('analysis_type', 'complete_network_analysis')
          .order('calculated_at', { ascending: false })
          .limit(1);

        if (analysisError) {
          console.error('네트워크 분석 결과 조회 오류:', analysisError);
          highRiskStudentsResult = { count: 0, error: null };
          mediumRiskStudentsResult = { count: 0, error: null };
        } else if (completeAnalysis && completeAnalysis.length > 0) {
          const analysis = completeAnalysis[0];
          const recommendations = analysis.recommendations as any;
          const completeData = recommendations?.complete_analysis_data;
          
          console.log('🔍 네트워크 분석 결과 디버깅:', {
            analysisId: analysis.id,
            surveyId: analysis.survey_id,
            calculatedAt: analysis.calculated_at,
            recommendationsKeys: Object.keys(recommendations || {}),
            completeDataKeys: Object.keys(completeData || {}),
            nodesCount: completeData?.nodes?.length || 0,
            sampleNode: completeData?.nodes?.[0]
          });
          
          if (completeData?.nodes) {
            let highRiskCount = 0;
            let mediumRiskCount = 0;
            
            // 권한별로 학생 필터링
            if (teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number) {
              // 담임인 경우 담당 학년/반 학생만
              console.log('🔍 담임교사 필터링:', {
                grade: teacherInfo.grade_level,
                class: teacherInfo.class_number,
                totalNodes: completeData.nodes.length
              });
              
              completeData.nodes.forEach((node: any, index: number) => {
                console.log(`🔍 노드 ${index}:`, {
                  id: node.id,
                  name: node.name,
                  grade: node.grade,
                  class: node.class,
                  centrality: node.centrality,
                  matchesFilter: node.grade === teacherInfo.grade_level && node.class === teacherInfo.class_number,
                  gradeType: typeof node.grade,
                  classType: typeof node.class,
                  teacherGradeType: typeof teacherInfo.grade_level,
                  teacherClassType: typeof teacherInfo.class_number
                });
                
                // 타입 변환을 통한 비교
                const nodeGrade = parseInt(String(node.grade)) || node.grade;
                const nodeClass = parseInt(String(node.class)) || node.class;
                const teacherGrade = parseInt(String(teacherInfo.grade_level)) || teacherInfo.grade_level;
                const teacherClass = parseInt(String(teacherInfo.class_number)) || teacherInfo.class_number;
                
                if (nodeGrade === teacherGrade && nodeClass === teacherClass) {
                  const centrality = node.centrality || 0;
                  if (centrality < 0.3) {
                    highRiskCount++;
                    console.log(`🚨 주의학생 발견: ${node.name} (중심성: ${centrality})`);
                  } else if (centrality < 0.6) {
                    mediumRiskCount++;
                    console.log(`⚠️ 관찰중인 학생 발견: ${node.name} (중심성: ${centrality})`);
                  }
                } else {
                  console.log(`❌ 필터 불일치: ${node.name} (${nodeGrade}학년 ${nodeClass}반 vs ${teacherGrade}학년 ${teacherClass}반)`);
                }
              });
            } else {
              // 다른 역할: 전체 학생 대상
              console.log('🔍 전체 학생 대상 필터링:', {
                role: teacherInfo?.role,
                totalNodes: completeData.nodes.length
              });
              
              completeData.nodes.forEach((node: any, index: number) => {
                const centrality = node.centrality || 0;
                if (centrality < 0.3) {
                  highRiskCount++;
                  console.log(`🚨 주의학생 발견: ${node.name} (중심성: ${centrality})`);
                } else if (centrality < 0.6) {
                  mediumRiskCount++;
                  console.log(`⚠️ 관찰중인 학생 발견: ${node.name} (중심성: ${centrality})`);
                }
              });
            }
            
            console.log('🔍 최종 위험도 카운트:', {
              highRisk: highRiskCount,
              mediumRisk: mediumRiskCount,
              totalNodes: completeData.nodes.length
            });
            
            // 고위험 학생 감지 시 알림 생성 (한 번만)
            if (highRiskCount > 0) {
              try {
                // 이미 고위험 학생 알림이 생성되었는지 확인
                const hasExistingNotification = await NotificationService.checkExistingHighRiskNotification(schoolId);
                
                if (!hasExistingNotification) {
                  // 권한별 알림 생성
                  if (teacherInfo?.role && schoolId) {
                    await NotificationService.createRoleBasedNotification(
                      teacherInfo.role,
                      schoolId,
                      'high_risk_students_detected',
                      {
                        title: '고위험 학생 감지',
                        message: `${highRiskCount}명의 고위험 학생이 감지되었습니다. 즉시 개입이 필요합니다.`,
                        type: 'warning',
                        category: '위험 관리'
                      }
                    );
                  }
                  
                  console.log('🔔 고위험 학생 알림 생성 완료:', { count: highRiskCount });
                } else {
                  console.log('🔔 고위험 학생 알림이 이미 존재하여 생성하지 않음');
                }
              } catch (error) {
                console.error('고위험 학생 알림 생성 오류:', error);
              }
            }
            
            highRiskStudentsResult = { count: highRiskCount, error: null };
            mediumRiskStudentsResult = { count: mediumRiskCount, error: null };
          } else {
            console.log('🔍 completeData.nodes가 없음:', {
              completeData,
              recommendations
            });
          }
        } else {
          console.log('🔍 네트워크 분석 결과가 없음:', {
            completeAnalysis,
            analysisError
          });
        }
      } catch (error) {
        console.error('위험도별 학생 수 계산 오류:', error);
        highRiskStudentsResult = { count: 0, error: null };
        mediumRiskStudentsResult = { count: 0, error: null };
      }

      // 오류 체크
      if (studentsResult.error) throw studentsResult.error;
      if (surveysResult.error) throw surveysResult.error;
      if (activeSurveysResult.error) throw activeSurveysResult.error;
      if (completedSurveysResult.error) throw completedSurveysResult.error;
      if (draftSurveysResult.error) throw draftSurveysResult.error;
      if (highRiskStudentsResult.error) throw highRiskStudentsResult.error;
      if (recentSurveysResult.error) throw recentSurveysResult.error;

      // 설문 완료율 계산
      const totalSurveys = surveysResult.count || 0;
      const completedSurveys = completedSurveysResult.count || 0;
      const surveyCompletionRate = totalSurveys > 0 ? (completedSurveys / totalSurveys) * 100 : 0;

      // 진행 중인 설문 답변률 계산 (진행 중인 설문만)
      let activeSurveyResponseRate = 0;
      try {
        if (teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number) {
          // 담임인 경우 담당 학년/반의 진행 중인 설문에 대한 응답률만
          const { data: surveyResponses } = await supabase
            .from('survey_responses')
            .select(`
              *,
              students!inner(grade, class, current_school_id),
              surveys!inner(status)
            `)
            .eq('students.current_school_id', schoolId)
            .eq('students.grade', teacherInfo.grade_level)
            .eq('students.class', teacherInfo.class_number)
            .eq('surveys.status', 'active'); // 진행 중인 설문만
          
          const totalStudentsInClass = studentsResult.count || 0;
          const respondedStudents = surveyResponses?.length || 0;
          
          // 디버깅 로그 추가
          console.log('🔍 진행 중인 설문 답변률 계산:', {
            schoolId,
            grade: teacherInfo.grade_level,
            class: teacherInfo.class_number,
            totalStudentsInClass,
            respondedStudents,
            surveyResponses: surveyResponses?.length || 0,
            surveyResponsesData: surveyResponses
          });
          
                  activeSurveyResponseRate = totalStudentsInClass > 0 ? 
          Math.round((respondedStudents / totalStudentsInClass) * 100) : 0;
        
        console.log('🔍 최종 계산된 답변률:', activeSurveyResponseRate);
        } else {
          // 학교 관리자인 경우 전체 학교의 진행 중인 설문에 대한 응답률만
          const { data: surveyResponses } = await supabase
            .from('survey_responses')
            .select(`
              *,
              students!inner(current_school_id),
              surveys!inner(status)
            `)
            .eq('students.current_school_id', schoolId)
            .eq('surveys.status', 'active'); // 진행 중인 설문만
          
          const totalStudentsInSchool = studentsResult.count || 0;
          const respondedStudents = surveyResponses?.length || 0;
          
          // 디버깅 로그 추가
          console.log('🔍 학교 전체 진행 중인 설문 답변률 계산:', {
            schoolId,
            totalStudentsInSchool,
            respondedStudents,
            surveyResponses: surveyResponses?.length || 0,
            surveyResponsesData: surveyResponses
          });
          
          activeSurveyResponseRate = totalStudentsInSchool > 0 ? 
            Math.round((respondedStudents / totalStudentsInSchool) * 100) : 0;
          
          console.log('🔍 최종 계산된 답변률 (학교 전체):', activeSurveyResponseRate);
        }
      } catch (error) {
        console.error('진행 중인 설문 답변률 계산 오류:', error);
        activeSurveyResponseRate = 0;
      }

      // 네트워크 분석 진행률 계산 (담임인 경우 담당 학년/반 기준)
      let networkAnalysisCount = 0;
      if (teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number) {
        // 담임교사: 담당 학년/반 학생의 분석 결과만
        const { count, error: networkError } = await supabase
          .from('network_analysis_results')
          .select('student_id', { count: 'exact', head: true });
        
        if (networkError) throw networkError;
        networkAnalysisCount = count || 0;
      } else {
        // 학교 관리자: 전체 학교 분석 결과
        const { count, error: networkError } = await supabase
          .from('network_analysis_results')
          .select('student_id', { count: 'exact', head: true });
        
        if (networkError) throw networkError;
        networkAnalysisCount = count || 0;
      }
      
      const totalStudentsForAnalysis = studentsResult.count || 0;
      const completedAnalysis = networkAnalysisCount;
      const networkAnalysisProgress = totalStudentsForAnalysis > 0 ? 
        Math.min((completedAnalysis / totalStudentsForAnalysis) * 100, 100) : 0; // 최대 100%로 제한

      // 학년별/반별 통계 계산
      const studentsByGrade: Record<string, number> = {};
      const studentsByClass: Record<string, number> = {};
      const surveysByGrade: Record<string, number> = {};
      const surveysByClass: Record<string, number> = {};

      // 담임인 경우에도 전체 학년/반 통계는 계산 (담당 학년/반만 하이라이트)
      if (teacherInfo?.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number) {
        // 담당 학년/반은 전체 학생 수로 설정
        studentsByGrade[teacherInfo.grade_level] = studentsResult.count || 0;
        studentsByClass[`${teacherInfo.grade_level}-${teacherInfo.class_number}`] = studentsResult.count || 0;
        
        // 담당 학년/반 설문 수
        surveysByGrade[teacherInfo.grade_level] = surveysResult.count || 0;
        surveysByClass[`${teacherInfo.grade_level}-${teacherInfo.class_number}`] = surveysResult.count || 0;
        
        // 다른 학년/반은 0으로 설정 (담당이 아니므로)
        for (let grade = 1; grade <= 6; grade++) {
          if (grade.toString() !== teacherInfo.grade_level) {
            studentsByGrade[grade.toString()] = 0;
            surveysByGrade[grade.toString()] = 0;
          }
        }
      } else if (teacherInfo?.role === 'grade_teacher' && teacherInfo.grade_level) {
        // 학년 담당 교사: 해당 학년의 학생만
        const { data: gradeStudents } = await supabase
          .from('students')
          .select('grade, class')
          .eq('current_school_id', schoolId)
          .eq('is_active', true)
          .eq('grade', teacherInfo.grade_level.toString());

        const { data: gradeSurveys } = await supabase
          .from('surveys')
          .select('target_grades, target_classes')
          .eq('school_id', schoolId);

        // 해당 학년 학생 통계 계산
        if (gradeStudents && gradeStudents.length > 0) {
          gradeStudents.forEach(student => {
            studentsByGrade[student.grade] = (studentsByGrade[student.grade] || 0) + 1;
            studentsByClass[`${student.grade}-${student.class}`] = (studentsByClass[`${student.grade}-${student.class}`] || 0) + 1;
          });
        } else {
          // 데이터가 없으면 기본값 설정
          studentsByGrade[teacherInfo.grade_level.toString()] = 0;
          studentsByClass[`${teacherInfo.grade_level}-1`] = 0;
          studentsByClass[`${teacherInfo.grade_level}-2`] = 0;
          studentsByClass[`${teacherInfo.grade_level}-3`] = 0;
        }

        // 해당 학년 설문 통계 계산
        if (gradeSurveys && gradeSurveys.length > 0) {
          gradeSurveys.forEach(survey => {
            const grades = survey.target_grades as string[] || [];
            const classes = survey.target_classes as string[] || [];
            
            if (grades.includes(teacherInfo.grade_level!.toString())) {
              surveysByGrade[teacherInfo.grade_level!.toString()] = (surveysByGrade[teacherInfo.grade_level!.toString()] || 0) + 1;
              
              classes.forEach((classNum: string) => {
                const key = `${teacherInfo.grade_level!}-${classNum}`;
                surveysByClass[key] = (surveysByClass[key] || 0) + 1;
              });
            }
          });
        } else {
          // 설문 데이터가 없으면 기본값 설정
          surveysByGrade[teacherInfo.grade_level.toString()] = 0;
          surveysByClass[`${teacherInfo.grade_level}-1`] = 0;
          surveysByClass[`${teacherInfo.grade_level}-2`] = 0;
          surveysByClass[`${teacherInfo.grade_level}-3`] = 0;
        }



      } else {
        // 학교 관리자 또는 교육청 관리자: 전체 학교의 학년별/반별 통계 계산
        const { data: allStudents } = await supabase
          .from('students')
          .select('grade, class')
          .eq('current_school_id', schoolId)
          .eq('is_active', true);

        const { data: allSurveys } = await supabase
          .from('surveys')
          .select('target_grades, target_classes')
          .eq('school_id', schoolId);

        // 학생 통계 계산
        allStudents?.forEach(student => {
          studentsByGrade[student.grade] = (studentsByGrade[student.grade] || 0) + 1;
          studentsByClass[`${student.grade}-${student.class}`] = (studentsByClass[`${student.grade}-${student.class}`] || 0) + 1;
        });

        // 설문 통계 계산
        allSurveys?.forEach(survey => {
          const grades = survey.target_grades as string[] || [];
          const classes = survey.target_classes as string[] || [];
          
          grades.forEach((grade: string) => {
            surveysByGrade[grade] = (surveysByGrade[grade] || 0) + 1;
          });
          
          classes.forEach((classNum: string) => {
            // 학년-반 조합으로 설문 수 계산
            grades.forEach((grade: string) => {
              const key = `${grade}-${classNum}`;
              surveysByClass[key] = (surveysByClass[key] || 0) + 1;
            });
          });
        });


      }

      // 알림은 대시보드에서 별도로 처리하므로 빈 배열 반환
      const alerts: Alert[] = [];

      return {
        totalStudents: studentsResult.count || 0,
        activeSurveys: activeSurveysResult.count || 0,
        completedSurveys: completedSurveys,
        draftSurveys: draftSurveysResult.count || 0, // 초안 설문 수 추가
        highRiskStudents: Math.min(highRiskStudentsResult.count || 0, studentsResult.count || 0), // 실제 위험군 학생 수 (최대 학생 수를 넘지 않도록)
        mediumRiskStudents: Math.min(mediumRiskStudentsResult.count || 0, studentsResult.count || 0), // 관찰중인 학생 수
        recentSurveys: recentSurveysResult.data || [],
        alerts: alerts,
        surveyCompletionRate: surveyCompletionRate,
        activeSurveyResponseRate: activeSurveyResponseRate, // 진행 중인 설문 답변률 추가
        networkAnalysisProgress: networkAnalysisProgress,
        studentsByGrade,
        studentsByClass,
        surveysByGrade,
        surveysByClass
      };
    } catch (error) {
      console.error('DashboardService.getDashboardData error:', error);
      throw error;
    }
  }



  // 학생 통계 조회
  static async getStudentStats(schoolId: string): Promise<{
    byGrade: Record<string, number>;
    byGender: Record<string, number>;
    byRiskLevel: Record<string, number>;
  }> {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('grade, gender')
        .eq('current_school_id', schoolId)
        .eq('is_active', true);

      if (error) throw error;

      const byGrade: Record<string, number> = {};
      const byGender: Record<string, number> = {};

      students?.forEach(student => {
        byGrade[student.grade] = (byGrade[student.grade] || 0) + 1;
        byGender[student.gender] = (byGender[student.gender] || 0) + 1;
      });

      // 위험도별 통계 (예시)
      const byRiskLevel = {
        low: 120,
        medium: 30,
        high: 8
      };

      return { byGrade, byGender, byRiskLevel };
    } catch (error) {
      console.error('DashboardService.getStudentStats error:', error);
      throw error;
    }
  }

  // 설문 응답에서 친구 수 계산 (더 이상 사용되지 않음 - 네트워크 분석 결과 기반으로 대체)
  // private static countFriendsFromResponse(responses: any): number {
  //   try {
  //     if (!responses || typeof responses !== 'object') return 0;
  //     
  //     let totalFriends = 0;
  //     
  //     // responses 객체의 각 질문을 순회
  //     Object.values(responses).forEach((questionResponse: any) => {
  //       if (Array.isArray(questionResponse)) {
  //         // 배열인 경우 (친구 선택 응답)
  //         totalFriends += questionResponse.length;
  //       } else if (questionResponse && typeof questionResponse === 'object') {
  //         // 객체인 경우 (복잡한 응답 구조)
  //         Object.values(questionResponse).forEach((value: any) => {
  //           if (Array.isArray(value)) {
  //             if (Array.isArray(value)) {
  //               totalFriends += value.length;
  //             }
  //           });
  //         });
  //       }
  //     });
  //     
  //     return totalFriends;
  //   } catch (error) {
  //     console.error('친구 수 계산 오류:', error);
  //     return 0;
  //     return 0;
  //   }
  // }

  // 설문 진행 상황 조회
  static async getSurveyProgress(schoolId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    draft: number;
    averageResponseRate: number;
  }> {
    try {
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select(`
          status,
          survey_responses(count)
        `)
        .eq('school_id', schoolId);

      if (error) throw error;

      const stats = {
        total: surveys?.length || 0,
        active: 0,
        completed: 0,
        draft: 0,
        averageResponseRate: 0
      };

      let totalResponseRate = 0;
      let surveysWithResponses = 0;

      surveys?.forEach(survey => {
        stats[survey.status as keyof typeof stats]++;
        
        const responseCount = (survey as any).survey_responses?.[0]?.count || 0;
        if (responseCount > 0) {
          totalResponseRate += responseCount;
          surveysWithResponses++;
        }
      });

      stats.averageResponseRate = surveysWithResponses > 0 ? 
        (totalResponseRate / surveysWithResponses) : 0;

      return stats;
    } catch (error) {
      console.error('DashboardService.getSurveyProgress error:', error);
      throw error;
    }
  }
}