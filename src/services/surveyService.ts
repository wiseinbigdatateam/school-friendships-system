import { supabase, Tables } from '../lib/supabase';

export type SurveyWithStats = Tables<'surveys'> & {
  response_count?: number;
  responseRate?: number;
};

export class SurveyService {
  // 모든 설문 조회
  static async getAllSurveys(schoolId: string): Promise<SurveyWithStats[]> {
    try {
      console.log('🔍 SurveyService.getAllSurveys 호출:', { schoolId });
      
      let query = supabase
        .from('surveys')
        .select(`
          *,
          survey_responses(count)
        `)
        .order('created_at', { ascending: false });

      // schoolId가 유효한 경우에만 필터링 적용
      if (schoolId && schoolId !== '' && schoolId !== 'undefined' && schoolId !== 'null' && schoolId !== 'all') {
        console.log('🔍 학교 ID 필터링 적용:', { schoolId });
        query = query.eq('school_id', schoolId);
      } else {
        console.log('🔍 학교 ID 필터링 제외 (전체 설문 조회):', { schoolId });
      }

      const { data, error } = await query;

      console.log('🔍 Supabase 조회 결과:', { data, error });

      if (error) {
        console.error('Error fetching surveys:', error);
        throw error;
      }

      // 응답 수 계산
      const surveysWithStats = data?.map(survey => ({
        ...survey,
        response_count: (survey as any).survey_responses?.[0]?.count || 0,
        responseRate: 0 // TODO: 대상 학생 수 대비 응답률 계산
      }));

      console.log('🔍 응답 수 계산 후 설문 데이터:', surveysWithStats);

      return surveysWithStats as SurveyWithStats[];
    } catch (error) {
      console.error('SurveyService.getAllSurveys error:', error);
      throw error;
    }
  }

    // 상태별 설문 조회
  static async getSurveysByStatus(
    schoolId: string,
    status: 'waiting' | 'active' | 'completed' | 'archived'
  ): Promise<SurveyWithStats[]> {
    try {
      console.log('🔍 SurveyService.getSurveysByStatus 호출:', { schoolId, status });
      
      let query = supabase
        .from('surveys')
        .select(`
          *,
          survey_responses(count)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      // schoolId가 유효한 경우에만 필터링 적용
      if (schoolId && schoolId !== '' && schoolId !== 'undefined' && schoolId !== 'null' && schoolId !== 'all') {
        console.log('🔍 학교 ID 필터링 적용:', { schoolId });
        query = query.eq('school_id', schoolId);
      } else {
        console.log('🔍 학교 ID 필터링 제외 (전체 설문 조회):', { schoolId });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching surveys by status:', error);
        throw error;
      }

      const surveysWithStats = data?.map(survey => ({
        ...survey,
        response_count: (survey as any).survey_responses?.[0]?.count || 0,
        responseRate: 0
      }));

      return surveysWithStats as SurveyWithStats[];
    } catch (error) {
      console.error('SurveyService.getSurveysByStatus error:', error);
      throw error;
    }
  }

  // 학교, 학년, 반별 설문 조회
  static async getSurveysBySchoolGradeClass(
    schoolId: string,
    gradeLevel?: string,
    classNumber?: string
  ): Promise<SurveyWithStats[]> {
    try {
      console.log('🔍 SurveyService.getSurveysBySchoolGradeClass 호출:', { 
        schoolId, 
        gradeLevel, 
        classNumber,
        schoolIdType: typeof schoolId,
        gradeLevelType: typeof gradeLevel,
        classNumberType: typeof classNumber
      });
      
      let query = supabase
        .from('surveys')
        .select(`
          *,
          survey_responses(count)
        `)
        .order('created_at', { ascending: false });

      // 학교 ID 유효성 검사 및 필터링
      if (schoolId && schoolId !== '' && schoolId !== 'undefined' && schoolId !== 'null') {
        console.log('🔍 학교 ID 필터링 적용:', { schoolId });
        query = query.eq('school_id', schoolId);
      } else {
        console.log('🔍 학교 ID 필터링 제외 (전체 설문 조회):', { schoolId });
      }

      console.log('🔍 기본 쿼리 구성:', { schoolId, query: 'surveys 테이블에서 school_id로 필터링' });

      // 학년 필터링
      if (gradeLevel && gradeLevel !== 'undefined' && gradeLevel !== 'null') {
        console.log('🔍 학년 필터링 추가:', { gradeLevel });
        query = query.contains('target_grades', [gradeLevel]);
      }

      // 반 필터링
      if (classNumber && classNumber !== 'undefined' && classNumber !== 'null') {
        console.log('🔍 반 필터링 추가:', { classNumber });
        query = query.contains('target_classes', [classNumber]);
      }

      console.log('🔍 최종 쿼리 실행 전:', { 
        schoolId, 
        gradeLevel: gradeLevel || '없음', 
        classNumber: classNumber || '없음' 
      });

      const { data, error } = await query;

      console.log('🔍 Supabase 조회 결과:', { 
        data: data ? `${data.length}개 설문` : 'null', 
        error,
        rawData: data?.map(s => ({ 
          id: s.id, 
          title: s.title, 
          status: s.status, 
          target_grades: s.target_grades, 
          target_classes: s.target_classes,
          school_id: s.school_id,
          created_by: s.created_by
        }))
      });

      if (error) {
        console.error('🔍 설문 조회 오류:', error);
        throw error;
      }

      const surveysWithStats = data?.map(survey => ({
        ...survey,
        response_count: (survey as any).survey_responses?.[0]?.count || 0,
        responseRate: 0
      }));

      console.log('🔍 응답 수 계산 후 설문 데이터:', {
        count: surveysWithStats?.length || 0,
        surveys: surveysWithStats?.map(s => ({ 
          id: s.id, 
          title: s.title, 
          status: s.status,
          target_grades: s.target_grades,
          target_classes: s.target_classes,
          response_count: s.response_count
        }))
      });

      return surveysWithStats as SurveyWithStats[];
    } catch (error) {
      console.error('🔍 SurveyService.getSurveysBySchoolGradeClass 오류:', error);
      throw error;
    }
  }

  // 설문 생성
  static async createSurvey(
    schoolId: string,
    title: string,
    description: string,
    templateId?: string,
    targetGrades?: string[],
    targetClasses?: string[],
    startDate?: string,
    endDate?: string,
    createdBy?: string,
    questions?: any[]
  ): Promise<Tables<'surveys'> | null> {
    try {
      console.log('🔍 SurveyService.createSurvey 호출:', {
        schoolId,
        title,
        description,
        templateId,
        targetGrades,
        targetClasses,
        startDate,
        endDate,
        createdBy,
        questions
      });

      const { data, error } = await supabase
        .from('surveys')
        .insert({
          school_id: schoolId,
          template_id: templateId,
          title: title,
          description: description,
          target_grades: targetGrades,
          target_classes: targetClasses,
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          created_by: createdBy,
          questions: questions || []
        })
        .select()
        .single();

      console.log('🔍 Supabase insert 결과:', { data, error });

      if (error) {
        console.error('Error creating survey:', error);
        throw error;
      }

      console.log('🔍 설문 생성 성공:', data);
      return data;
    } catch (error) {
      console.error('SurveyService.createSurvey error:', error);
      throw error;
    }
  }

  // 설문 상태 업데이트
  static async updateSurveyStatus(surveyId: string, newStatus: string): Promise<boolean> {
    try {
      console.log('🔍 SurveyService.updateSurveyStatus 호출:', { surveyId, newStatus });
      
      const { error } = await supabase
        .from('surveys')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId);
      
      if (error) {
        console.error('Error updating survey status:', error);
        throw error;
      }
      
      console.log('🔍 설문 상태 업데이트 성공:', { surveyId, newStatus });
      return true;
    } catch (error) {
      console.error('SurveyService.updateSurveyStatus error:', error);
      throw error;
    }
  }

  // 설문 수정
  static async updateSurvey(
    surveyId: string,
    updates: Partial<Tables<'surveys'>>
  ): Promise<Tables<'surveys'> | null> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .update(updates)
        .eq('id', surveyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating survey:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('SurveyService.updateSurvey error:', error);
      throw error;
    }
  }

  // 설문 삭제
  static async deleteSurvey(surveyId: string): Promise<boolean> {
    try {
      console.log('🔍 SurveyService.deleteSurvey 호출:', { surveyId });
      
      // 먼저 설문 응답 데이터 삭제
      const { error: responseError } = await supabase
        .from('survey_responses')
        .delete()
        .eq('survey_id', surveyId);

      if (responseError) {
        console.error('Error deleting survey responses:', responseError);
        throw responseError;
      }

      // 설문 데이터 삭제
      const { error: surveyError } = await supabase
        .from('surveys')
        .delete()
        .eq('id', surveyId);

      if (surveyError) {
        console.error('Error deleting survey:', surveyError);
        throw surveyError;
      }

      console.log('🔍 설문 삭제 성공:', { surveyId });
      return true;
    } catch (error) {
      console.error('SurveyService.deleteSurvey error:', error);
      throw error;
    }
  }



  // 설문 상세 조회
  static async getSurveyById(surveyId: string): Promise<SurveyWithStats | null> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_responses(count),
          survey_templates(*)
        `)
        .eq('id', surveyId)
        .single();

      if (error) {
        console.error('Error fetching survey by id:', error);
        throw error;
      }

      const surveyWithStats = {
        ...data,
        response_count: (data as any).survey_responses?.[0]?.count || 0,
        responseRate: 0
      };

      return surveyWithStats as SurveyWithStats;
    } catch (error) {
      console.error('SurveyService.getSurveyById error:', error);
      throw error;
    }
  }

  // 설문 응답 제출
  static async submitSurveyResponse(
    surveyId: string,
    studentId: string,
    responses: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Tables<'survey_responses'> | null> {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          student_id: studentId,
          responses: responses,
          ip_address: ipAddress,
          user_agent: userAgent
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting survey response:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('SurveyService.submitSurveyResponse error:', error);
      throw error;
    }
  }

  // 설문 응답 조회
  static async getSurveyResponses(surveyId: string): Promise<Tables<'survey_responses'>[]> {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select(`
          *,
          students(*)
        `)
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching survey responses:', error);
        throw error;
      }

      return data as Tables<'survey_responses'>[];
    } catch (error) {
      console.error('SurveyService.getSurveyResponses error:', error);
      throw error;
    }
  }

  // 설문 상태 자동 업데이트 (날짜 기한 체크)
  static async updateSurveyStatusByDate(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 종료일이 지난 설문들을 완료 상태로 변경
      const { error } = await supabase
        .from('surveys')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .lt('end_date', today)
        .neq('status', 'completed');

      if (error) {
        console.error('Error updating survey status by date:', error);
        throw error;
      }

      console.log('🔍 설문 상태 자동 업데이트 완료 (날짜 기한)');
    } catch (error) {
      console.error('SurveyService.updateSurveyStatusByDate error:', error);
      throw error;
    }
  }

  // 설문 상태 자동 업데이트 (응답 완료 체크)
  static async updateSurveyStatusByCompletion(surveyId: string): Promise<void> {
    try {
      // 설문 정보 조회
      const survey = await this.getSurveyById(surveyId);
      if (!survey) return;

      // 대상 학생 수 계산 (target_grades, target_classes 기반)
      const targetStudentCount = await this.getTargetStudentCount(survey);
      
      // 응답 수 조회
      const responseCount = survey.response_count || 0;

      // 응답률이 90% 이상이면 완료 상태로 변경
      const responseRate = targetStudentCount > 0 ? (responseCount / targetStudentCount) * 100 : 0;
      
      if (responseRate >= 90 && survey.status !== 'completed') {
        await this.updateSurveyStatus(surveyId, 'completed');
        console.log(`🔍 설문 ${surveyId} 응답 완료로 상태 변경: ${responseRate.toFixed(1)}%`);
      }
    } catch (error) {
      console.error('SurveyService.updateSurveyStatusByCompletion error:', error);
      throw error;
    }
  }

  // 대상 학생 수 계산
  private static async getTargetStudentCount(survey: SurveyWithStats): Promise<number> {
    try {
      // school_id가 null이면 0 반환
      if (!survey.school_id) {
        console.log('🔍 school_id가 null이므로 대상 학생 수를 0으로 반환');
        return 0;
      }

      let query = supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('current_school_id', survey.school_id);

      // 학년 필터
      if (survey.target_grades && survey.target_grades.length > 0) {
        query = query.in('grade', survey.target_grades);
      }

      // 반 필터
      if (survey.target_classes && survey.target_classes.length > 0) {
        query = query.in('class', survey.target_classes);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error getting target student count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('SurveyService.getTargetStudentCount error:', error);
      return 0;
    }
  }

  // 모든 설문 상태 자동 업데이트
  static async updateAllSurveyStatuses(): Promise<SurveyWithStats[]> {
    try {
      console.log('🔍 설문 상태 자동 업데이트 시작');
      
      // 모든 설문 조회 (waiting, active 상태만)
      const { data: surveys, error: fetchError } = await supabase
        .from('surveys')
        .select('id, start_date, end_date, status')
        .in('status', ['waiting', 'active']);

      if (fetchError) {
        console.error('설문 조회 오류:', fetchError);
        return [];
      }

      const now = new Date();
      const updates: { id: string; status: string }[] = [];

      surveys?.forEach(survey => {
        const startDate = new Date(survey.start_date);
        const endDate = new Date(survey.end_date);
        
        let newStatus = survey.status;
        
        // 현재 날짜가 시작일보다 이전이면 "대기중"
        if (now < startDate && survey.status !== 'waiting') {
          newStatus = 'waiting';
        }
        // 현재 날짜가 시작일과 종료일 사이에 있으면 "진행중"
        else if (now >= startDate && now <= endDate && survey.status !== 'active') {
          newStatus = 'active';
        }
        // 현재 날짜가 종료일보다 이후면 "완료"
        else if (now > endDate && survey.status !== 'completed') {
          newStatus = 'completed';
        }
        
        if (newStatus !== survey.status) {
          updates.push({ id: survey.id, status: newStatus });
        }
      });

      // 상태 변경이 필요한 설문들 업데이트
      if (updates.length > 0) {
        console.log('🔍 상태 변경이 필요한 설문들:', updates);
        
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('surveys')
            .update({ status: update.status })
            .eq('id', update.id);
            
          if (updateError) {
            console.error(`설문 ${update.id} 상태 업데이트 오류:`, updateError);
          } else {
            console.log(`설문 ${update.id} 상태 업데이트 완료: ${update.status}`);
          }
        }
      } else {
        console.log('🔍 상태 변경이 필요한 설문이 없습니다.');
      }
      
      // 활성화된 설문들의 응답 완료 체크
      const activeSurveys = await this.getSurveysByStatus('', 'active');
      for (const survey of activeSurveys) {
        await this.updateSurveyStatusByCompletion(survey.id);
      }
      
      console.log('🔍 모든 설문 상태 자동 업데이트 완료');
      
      // 업데이트된 모든 설문 데이터 반환
      return await this.getAllSurveys('');
    } catch (error) {
      console.error('SurveyService.updateAllSurveyStatuses error:', error);
      throw error;
    }
  }
}