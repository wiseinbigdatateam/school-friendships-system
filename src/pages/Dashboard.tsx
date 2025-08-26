import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import BarChart from '../components/BarChart';

interface SurveyProject {
  id: string;
  title: string;
  templateType: string;
  date: string;
  status: 'active' | 'completed';
  questions: any[];
  targetGrades: any;
  targetClasses: any;
  isSelected: boolean;
  template_id?: string | null;
}

interface SurveyTemplate {
  id: string;
  name: string;
  metadata: {
    category: string;
    answer_options?: any;
  };
}


const Dashboard: React.FC = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [surveyProjects, setSurveyProjects] = useState<Array<SurveyProject>>([]);
  const [surveyTemplates, setSurveyTemplates] = useState<Array<SurveyTemplate>>([]);
  const [participationData, setParticipationData] = useState({
    totalStudents: 0,
    participatedStudents: 0,
    nonParticipatedStudents: 0,
    completionRate: 0
  });
  const [dailyParticipationData, setDailyParticipationData] = useState<Array<{
    date: string;
    count: number;
    cumulative: number;
  }>>([]);
  const [studentParticipationList, setStudentParticipationList] = useState<Array<{
    id: number;
    name: string;
    participated: boolean;
    ownName: string;
    closeFriends: string;
    playFriends: string;
    talkFriends: string;
  }>>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  // 상태를 한글로 변환하는 함수
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active':
        return '진행중';
      case 'completed':
        return '완료';
      default:
        return status;
    }
  };

  // 상태에 따른 스타일 클래스 반환
  const getStatusStyle = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 설문 프로젝트 선택 핸들러
  const handleProjectSelect = async (projectId: string) => {
    // 모든 프로젝트의 선택 상태 초기화
    const updatedProjects = surveyProjects.map(project => ({
      ...project,
      isSelected: project.id === projectId
    }));
    
    setSurveyProjects(updatedProjects);
    setSelectedProject(projectId);
    
    // 선택된 설문의 응답 데이터 조회
    if (projectId && students.length > 0) {
      try {
        // 해당 설문의 응답 조회
        const { data: responsesData, error: responsesError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('survey_id', projectId)
          .order('submitted_at', { ascending: true });
        
        if (responsesError) {
          // 설문 응답 조회 실패
        } else {
          setResponses(responsesData || []);
          
          // 참여 현황 재계산 (현재 반 기준)
          const currentClassStudents = students.filter(student => {
            // 담임교사인 경우 현재 반 학생만 표시
            if (authUser?.role === 'homeroom_teacher' && gradeLevel && classNumber) {
              return student.grade === gradeLevel && student.class === classNumber;
            }
            // 관리자인 경우 전체 학생 표시
            return true;
          });
          
          const totalStudents = currentClassStudents.length;
          const participatedStudents = responsesData ? responsesData.filter(r => 
            currentClassStudents.some(s => s.id === r.student_id)
          ).length : 0;
          const nonParticipatedStudents = totalStudents - participatedStudents;
          const completionRate = totalStudents > 0 ? Math.round((participatedStudents / totalStudents) * 100) : 0;
          
          setParticipationData({
            totalStudents,
            participatedStudents,
            nonParticipatedStudents,
            completionRate
          });
          
          // 학생 참여 리스트 업데이트 (현재 반 학생만)
          const studentList = currentClassStudents.map((student, index) => {
            const response = responsesData?.find(r => r.student_id === student.id);
            const participated = !!response;
            
            return {
              id: index + 1,
              name: student.name,
              participated,
              ownName: student.name,
              closeFriends: '', // 이제 동적으로 계산됨
              playFriends: '',  // 이제 동적으로 계산됨
              talkFriends: ''   // 이제 동적으로 계산됨
            };
          });
          
          setStudentParticipationList(studentList);
          
          // 일별 참여 데이터 업데이트
          const dailyData = responsesData ? responsesData.reduce((acc: any[], response) => {
            if (!response.submitted_at) return acc;
            
            const date = new Date(response.submitted_at).toLocaleDateString('ko-KR', { 
              month: '2-digit', 
              day: '2-digit' 
            }).replace(/\./g, '-');
            
            const existingDate = acc.find(d => d.date === date);
            if (existingDate) {
              existingDate.count += 1;
            } else {
              acc.push({
                date,
                count: 1,
                cumulative: 0
              });
            }
            
            // 누적 응답수 계산
            acc.forEach((dayData, index) => {
              if (index === 0) {
                dayData.cumulative = dayData.count;
              } else {
                dayData.cumulative = acc[index - 1].cumulative + dayData.count;
              }
            });
            
            return acc;
          }, []).sort((a, b) => {
            // 날짜순으로 정렬
            const dateA = new Date(a.date.replace(/-/g, '/'));
            const dateB = new Date(b.date.replace(/-/g, '/'));
            return dateA.getTime() - dateB.getTime();
          }) : [];
          
                            setDailyParticipationData(dailyData);
        }
      } catch (error) {
        // 설문 응답 데이터 조회 실패
      }
    }
  };

  // 실제 데이터베이스에서 데이터 로드
  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    if (!authUser) {
      return;
    }
    
    const loadRealData = async () => {
      try {
        // 1. AuthContext에서 사용자 정보 확인
        if (authLoading) {
          return;
        }
        
        if (!authUser) {
          setLoading(false);
          return;
        }
        
        const user = authUser;

        // 사용자 역할에 따라 적절한 데이터 조회
        let schoolId = '';
        let gradeLevel = '';
        let classNumber = '';
        let teacherName = '';
        let teacherRole = '';

        // 사용자 정보에서 학교 및 반 정보 가져오기
        schoolId = user.school_id || user.schoolId || '';
        gradeLevel = user.grade || '';
        classNumber = user.class || '';
        teacherName = user.name || '';
        teacherRole = user.role || '';



        // 학교 ID가 없으면 기본값 사용 (테스트용)
        if (!schoolId) {
          schoolId = 'ab466857-5c16-4329-a9f6-f2d081c864f0'; // 와이즈인컴퍼니
          gradeLevel = gradeLevel || '1';
          classNumber = classNumber || '1';
        }

        setGradeLevel(gradeLevel);
        setClassNumber(classNumber);

        // 3. 학교 이름 조회
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('name')
          .eq('id', schoolId)
          .single();

        if (schoolError || !schoolData) {
          setSchoolName('알 수 없는 학교');
        } else {
          setSchoolName(schoolData.name);
        }
        
        // 4. 학생 목록 조회 (교우관계 설문을 위해 전체 학교 학생 조회)
        let studentsQuery = supabase
          .from('students')
          .select('*')
          .eq('current_school_id', schoolId);

        // 교우관계 설문의 경우 전체 학교 학생이 필요하므로 필터링 제거
        // if (user.role === 'homeroom_teacher' && gradeLevel && classNumber) {
        //   studentsQuery = studentsQuery
        //     .eq('grade', gradeLevel)
        //     .eq('class', classNumber);
        // }

        const { data: studentsData, error: studentsError } = await studentsQuery;
        
        if (studentsError) {
          setLoading(false);
          return;
        }
        
        setStudents(studentsData || []);
        
        if (studentsData && studentsData.length > 0) {
          // 5. 설문 목록 조회 (active와 completed 상태만 포함)
          const { data: surveys, error: surveysError } = await supabase
            .from('surveys')
            .select('*')
            .eq('school_id', schoolId)
            .in('status', ['active', 'completed']) // draft 제외
            .order('created_at', { ascending: false });
          
          if (surveysError) {
            // 설문 조회 실패
          } else {
            // 담임교사인 경우 해당 반 설문만, 관리자인 경우 전체 설문
            let filteredSurveys = surveys || [];
            
            if (user.role === 'homeroom_teacher' && gradeLevel && classNumber) {
              filteredSurveys = surveys?.filter(survey => {
                const targetGrades = survey.target_grades;
                const targetClasses = survey.target_classes;
                
                const gradeMatch = Array.isArray(targetGrades) 
                  ? targetGrades.includes(gradeLevel)
                  : targetGrades === gradeLevel;
                
                const classMatch = Array.isArray(targetClasses)
                  ? targetClasses.includes(classNumber)
                  : targetClasses === classNumber;
                
                return gradeMatch && classMatch;
              }) || [];
            }
            

            
            // 설문 프로젝트 목록 설정 (더 자세한 정보 포함)
            const projects = await Promise.all(filteredSurveys.map(async (survey) => {
              let templateType = '커스텀 설문';
              
              // 템플릿 정보 가져오기
              if (survey.template_id) {
                try {
                  const { data: templateData, error: templateError } = await supabase
                    .from('survey_templates')
                    .select('name, metadata')
                    .eq('id', survey.template_id)
                    .single();
                  
                  if (!templateError && templateData) {
                    const metadata = templateData.metadata as any;
                    const category = metadata?.category || '';
                    templateType = `템플릿형: ${category}`;
                  }
                } catch (error) {
                  templateType = '템플릿형: 알 수 없음';
                }
              }
              
              return {
                id: survey.id,
                title: survey.title || '제목 없음',
                templateType,
                date: survey.created_at ? new Date(survey.created_at).toLocaleDateString('ko-KR') : '날짜 없음',
                status: survey.status as 'active' | 'completed' || 'draft',
                questions: Array.isArray(survey.questions) ? survey.questions : [],
                targetGrades: survey.target_grades,
                targetClasses: survey.target_classes,
                description: survey.description || '',
                startDate: survey.start_date || '',
                endDate: survey.end_date || '',
                isSelected: false
              };
            }));
            
            setSurveyProjects(projects);
            
            // 설문 템플릿 정보 저장
            const templateIds = filteredSurveys
              .filter(survey => survey.template_id)
              .map(survey => survey.template_id)
              .filter((id): id is string => id !== null);
            
            if (templateIds.length > 0) {
              try {
                const { data: templatesData, error: templatesError } = await supabase
                  .from('survey_templates')
                  .select('id, name, metadata')
                  .in('id', templateIds);
                
                if (!templatesError && templatesData) {
                  const processedTemplates = templatesData.map(template => ({
                    id: template.id,
                    name: template.name,
                    metadata: template.metadata as any
                  }));
                  setSurveyTemplates(processedTemplates);

                }
              } catch (error) {
                // 템플릿 정보 조회 실패
              }
            }
            
            // 6. 첫 번째 설문 선택 및 응답 데이터 조회
            if (projects.length > 0) {
              const firstProject = projects[0];
              firstProject.isSelected = true;
              setSelectedProject(firstProject.id);
              

              
              // 해당 설문의 응답 조회 (더 자세한 정보 포함)
              const { data: responsesData, error: responsesError } = await supabase
                .from('survey_responses')
                .select('*')
                .eq('survey_id', firstProject.id)
                .order('submitted_at', { ascending: true });
              
              if (responsesError) {
                // 설문 응답 조회 실패
              } else {
                setResponses(responsesData || []);
                
                // 참여 현황 계산 (현재 반 기준)
                const currentClassStudents = studentsData.filter(student => {
                  // 담임교사인 경우 현재 반 학생만 표시
                  if (user.role === 'homeroom_teacher' && gradeLevel && classNumber) {
                    return student.grade === gradeLevel && student.class === classNumber;
                  }
                  // 관리자인 경우 전체 학생 표시
                  return true;
                });
                
                const totalStudents = currentClassStudents.length;
                const participatedStudents = responsesData ? responsesData.filter(r => 
                  currentClassStudents.some(s => s.id === r.student_id)
                ).length : 0;
                const nonParticipatedStudents = totalStudents - participatedStudents;
                const completionRate = totalStudents > 0 ? Math.round((participatedStudents / totalStudents) * 100) : 0;
                
                setParticipationData({
                  totalStudents,
                  participatedStudents,
                  nonParticipatedStudents,
                  completionRate
                });
                
                // 학생 참여 리스트 설정 (현재 반 학생만 표시, 전체 학교 학생은 친구 이름 변환용)
                const studentList = currentClassStudents.map((student, index) => {
                  const response = responsesData?.find(r => r.student_id === student.id);
                  const participated = !!response;
                  
                  // 응답 데이터에서 친구 정보 추출 (더 정확한 파싱)
                  let closeFriends = '';
                  let playFriends = '';
                  let talkFriends = '';
                  
                  if (response && response.responses) {
                    try {
                      const responseData = response.responses as any;
                      
                      // q1: 가장 친한 친구 3명
                      if (responseData.q1 && Array.isArray(responseData.q1)) {
                        const friendNames = responseData.q1.map((friendId: string) => {
                          const friend = studentsData.find(s => s.id === friendId);
                          return friend ? friend.name : '알 수 없음';
                        }).filter((name: string) => name !== '알 수 없음');
                        closeFriends = friendNames.join(', ');
                      }
                      
                      // q2: 함께 놀고 싶은 친구 5명
                      if (responseData.q2 && Array.isArray(responseData.q2)) {
                        const friendNames = responseData.q2.map((friendId: string) => {
                          const friend = studentsData.find(s => s.id === friendId);
                          return friend ? friend.name : '알 수 없음';
                        }).filter((name: string) => name !== '알 수 없음');
                        playFriends = friendNames.join(', ');
                      }
                      
                      // q3: 고민 상담하고 싶은 친구
                      if (responseData.q3 && Array.isArray(responseData.q3)) {
                        const friendNames = responseData.q3.map((friendId: string) => {
                          const friend = studentsData.find(s => s.id === friendId);
                          return friend ? friend.name : '알 수 없음';
                        }).filter((name: string) => name !== '알 수 없음');
                        talkFriends = friendNames.join(', ');
                      }
                      
                      // q4: 존경하거나 닮고 싶은 친구 (있는 경우)
                      if (responseData.q4 && Array.isArray(responseData.q4)) {
                        const friendNames = responseData.q4.map((friendId: string) => {
                          const friend = studentsData.find(s => s.id === friendId);
                          return friend ? friend.name : '알 수 없음';
                        }).filter((name: string) => name !== '알 수 없음');
                        // q4는 별도 컬럼이 없으므로 closeFriends에 추가
                        if (friendNames.length > 0) {
                          closeFriends = closeFriends ? `${closeFriends}, ${friendNames.join(', ')}` : friendNames.join(', ');
                        }
                      }
                      
                    } catch (e) {
                      // 응답 데이터 파싱 오류
                    }
                  }
                  
                  return {
                    id: index + 1,
                    name: student.name,
                    participated,
                    ownName: student.name,
                    closeFriends: closeFriends || (participated ? '친구 선택됨' : ''),
                    playFriends: playFriends || (participated ? '친구 선택됨' : ''),
                    talkFriends: talkFriends || (participated ? '친구 선택됨' : '')
                  };
                });
                
                setStudentParticipationList(studentList);
                
                // 일별 참여 데이터 설정 (실제 제출 시간 기반)
                const dailyData = responsesData ? responsesData.reduce((acc: any[], response) => {
                  if (!response.submitted_at) return acc;
                  
                  const date = new Date(response.submitted_at).toLocaleDateString('ko-KR', { 
                    month: '2-digit', 
                    day: '2-digit' 
                  }).replace(/\./g, '-');
                  
                  const existingDate = acc.find(d => d.date === date);
                  if (existingDate) {
                    existingDate.count += 1;
                  } else {
                    acc.push({
                      date,
                      count: 1,
                      cumulative: 0
                    });
                  }
                  
                  // 누적 응답수 계산
                  acc.forEach((dayData, index) => {
                    if (index === 0) {
                      dayData.cumulative = dayData.count;
                    } else {
                      dayData.cumulative = acc[index - 1].cumulative + dayData.count;
                    }
                  });
                  
                  return acc;
                }, []).sort((a, b) => {
                  // 날짜순으로 정렬
                  const dateA = new Date(a.date.replace(/-/g, '/'));
                  const dateB = new Date(b.date.replace(/-/g, '/'));
                  return dateA.getTime() - dateB.getTime();
                }) : [];
                
                setDailyParticipationData(dailyData);
              }
            } else {
              // 설문이 없으면 기본 데이터만 설정 (현재 반 기준)
              const currentClassStudents = studentsData.filter(student => {
                // 담임교사인 경우 현재 반 학생만 표시
                if (user.role === 'homeroom_teacher' && gradeLevel && classNumber) {
                  return student.grade === gradeLevel && student.class === classNumber;
                }
                // 관리자인 경우 전체 학생 표시
                return true;
              });
              
              setParticipationData({
                totalStudents: currentClassStudents.length,
                participatedStudents: 0,
                nonParticipatedStudents: currentClassStudents.length,
                completionRate: 0
              });
              
              setStudentParticipationList([]);
              setDailyParticipationData([]);
            }
          }
        }
        
        setLoading(false);
        
      } catch (error) {
        setLoading(false);
      }
    };

    loadRealData();
  }, [authUser, authLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // dashboardData 조건문 제거 - 테스트 데이터가 정상적으로 로드됨

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 페이지 제목 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center space-x-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedProject ? surveyProjects.find(p => p.id === selectedProject)?.title || '설문 현황' : '설문 현황'}
            </h1>
            
            {/* 설문 상태 */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedProject && surveyProjects.find(p => p.id === selectedProject)?.status 
                ? getStatusStyle(surveyProjects.find(p => p.id === selectedProject)?.status || '')
                : 'bg-gray-100 text-gray-800'
            }`}>
              {selectedProject && surveyProjects.find(p => p.id === selectedProject)?.status 
                ? getStatusLabel(surveyProjects.find(p => p.id === selectedProject)?.status || '')
                : '상태 없음'
              }
            </div>
              </div>
            </div>
          </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* 왼쪽 사이드바 - 설문 프로젝트 목록 */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                설문 프로젝트 총 {surveyProjects.length}개
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {surveyProjects.map(project => (
                  <div 
                    key={project.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                      project.isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleProjectSelect(project.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-medium text-sm ${
                        project.isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {project.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>{project.templateType}</p>
                      <p>생성일: {project.date}</p>
            </div>

                    {project.isSelected && (
                      <div className="mt-3 pt-2 border-t border-blue-200">
                        <div className="flex items-center text-xs text-blue-600">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          선택됨
                        </div>
                  </div>
                )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽 메인 콘텐츠 - 현황 파악 */}
          <div className="flex-1">


            {/* 설문 참여 현황 요약 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                {schoolName || '학교명 없음'} {gradeLevel && classNumber ? `[${gradeLevel}학년 ${classNumber}반]` : ''}
              </h3>
              <div className="grid grid-cols-4 gap-8">
                {/* 설문 참여 예상 학생 수 */}
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {participationData.totalStudents}
                  </div>
                  <div className="text-sm text-gray-600 text-center leading-tight">
                    설문 참여 예상<br />학생 수
                  </div>
                </div>
                
                {/* 참여 학생 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-24 mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
                      {/* 배경 반원 */}
                      <path 
                        d="M 10 40 A 40 40 0 0 1 90 40" 
                        fill="none" 
                        stroke="#e5e7eb" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                      />
                      {/* 진행률 반원 */}
                      <path 
                        d="M 10 40 A 40 40 0 0 1 90 40" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 - (participationData.participatedStudents / participationData.totalStudents) * 125.6}
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text x="3" y="49" className="text-xs fill-gray-500">0</text>
                      <text x="90" y="49" className="text-xs fill-gray-500">{participationData.participatedStudents}/{participationData.totalStudents}</text>
                    </svg>
                    {/* 중앙 텍스트 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{participationData.participatedStudents}명</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    참여 학생
                  </div>
                </div>
                
                {/* 미참여 학생 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-24 mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
                      {/* 배경 반원 */}
                      <path 
                        d="M 10 40 A 40 40 0 0 1 90 40" 
                        fill="none" 
                        stroke="#e5e7eb" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                      />
                      {/* 진행률 반원 */}
                      <path 
                        d="M 10 40 A 40 40 0 0 1 90 40" 
                        fill="none" 
                        stroke="#6b7280" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 - (participationData.nonParticipatedStudents / participationData.totalStudents) * 125.6}
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text x="3" y="49" className="text-xs fill-gray-500">0</text>
                      <text x="90" y="49" className="text-xs fill-gray-500">{participationData.nonParticipatedStudents}/{participationData.totalStudents}</text>
                    </svg>
                    {/* 중앙 텍스트 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{participationData.nonParticipatedStudents}명</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    미참여 학생
                  </div>
                </div>
                
                {/* 진행 상태 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-24 mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
                      {/* 배경 반원 */}
                      <path 
                        d="M 10 40 A 40 40 0 0 1 90 40" 
                        fill="none" 
                        stroke="#e5e7eb" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                      />
                      {/* 진행률 반원 */}
                      <path 
                        d="M 10 40 A 40 40 0 0 1 90 40" 
                        fill="none" 
                        stroke="#8b5cf6" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 - (participationData.completionRate / 100) * 125.6}
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text x="3" y="49" className="text-xs fill-gray-500">0</text>
                      <text x="90" y="49" className="text-xs fill-gray-500">{participationData.completionRate}%</text>
                    </svg>
                    {/* 중앙 텍스트 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{participationData.completionRate}%</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    진행 상태
                  </div>
                </div>
              </div>
            </div>

            {/* 참여 현황 리스트 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">참여 현황 리스트</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">참여상태</th>
                      {selectedProject && surveyProjects.find(p => p.id === selectedProject)?.questions?.map((question: any, index: number) => (
                        <th key={question.id || index} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {question.text || `질문 ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentParticipationList.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{student.id}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full ${student.participated ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          </div>
                        </td>
                        {selectedProject && surveyProjects.find(p => p.id === selectedProject)?.questions?.map((question: any, index: number) => {
                          // 현재 선택된 설문의 응답 데이터에서 해당 학생의 응답 찾기
                          let questionResponse = '';
                          
                          if (student.participated) {
                            // survey_responses 테이블에서 해당 설문과 학생의 응답 찾기
                            const actualStudentId = students?.find(s => s.name === student.name)?.id;
                            
                            const studentResponse = responses?.find((r: any) => r.student_id === actualStudentId);
                            
                            if (studentResponse && studentResponse.responses) {
                              try {
                                const responseData = studentResponse.responses as any;
                                const answerValue = responseData[question.id];
                                
                                if (answerValue) {
                                  // UUID를 이름으로 변환하는 함수
                                  const convertUuidToName = (value: any): string => {
                                    if (Array.isArray(value)) {
                                      // 배열인 경우: 각 UUID를 이름으로 변환
                                      const names = value.map((uuid: string) => {
                                        const student = students?.find((s: any) => s.id === uuid);
                                        return student ? student.name : uuid;
                                      });
                                      return names.join(', ');
                                    } else if (typeof value === 'string') {
                                      // 문자열인 경우: UUID인지 확인하고 이름으로 변환
                                      const student = students?.find((s: any) => s.id === value);
                                      return student ? student.name : value;
                                    } else {
                                      // 기타 타입은 그대로 반환
                                      return String(value);
                                    }
                                  };
                                  
                                  questionResponse = convertUuidToName(answerValue);
                                } else {
                                  questionResponse = '응답 없음';
                                }
                              } catch (e) {
                                questionResponse = '파싱 오류';
                              }
                            } else {
                              questionResponse = '응답 데이터 없음';
                            }
                          }
                          
                          return (
                            <td key={question.id || index} className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.participated ? (questionResponse || '응답 없음') : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 일별 참여 현황 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 참여 현황</h3>
              <BarChart data={dailyParticipationData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

