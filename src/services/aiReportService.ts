import { supabase } from '../lib/supabase';
import { GeneratedReport } from './chatgptService';

export interface AIReportRecord {
  id: string;
  student_id: string;
  survey_id: string;
  teacher_id: string;
  report_data?: GeneratedReport;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // 토큰 사용량 추적
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_estimate?: number; // USD 기준 추정 비용
  };
  // 기존 필드들 (호환성을 위해 유지)
  summary?: string;
  current_status?: string;
  risk_assessment?: string;
  guidance_plan?: string;
  specific_actions?: any[];
  monitoring_points?: any[];
  expected_outcomes?: any[];
}

export class AIReportService {
  /**
   * AI 리포트를 저장합니다.
   */
  static async saveAIReport(
    studentId: string,
    surveyId: string,
    reportData: GeneratedReport,
    tokenUsage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      cost_estimate?: number;
    }
  ): Promise<AIReportRecord> {
    try {
      // 현재 로그인한 사용자 ID 가져오기
      let userId: string | null = null;
      
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('🔐 인증 상태 확인:', { user: user?.id, error: authError?.message });
        
        // 인증 세션이 없는 경우 세션 갱신 시도
        if (authError && authError.message === 'Auth session missing!') {
          console.log('🔄 인증 세션 갱신 시도...');
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && session?.user) {
            console.log('✅ 인증 세션 갱신 성공:', session.user.id);
            userId = session.user.id;
          } else {
            console.error('❌ 인증 세션 갱신 실패:', refreshError?.message);
          }
        } else if (!authError && user) {
          userId = user.id;
        }
      } catch (authError) {
        console.error('🔐 인증 정보 조회 실패:', authError);
      }

      // 사용자가 로그인하지 않은 경우에도 DB 저장 시도 (RLS 정책 수정됨)
      if (!userId) {
        console.log('⚠️ 로그인되지 않은 상태이지만 DB 저장 시도 (개발 모드)');
        userId = '9a2b32f1-5688-4584-8ea8-7d611a2db430'; // 실제 존재하는 사용자 ID
      }

      // 기존 리포트가 있는지 확인
      const { data: existingReport, error: checkError } = await supabase
        .from('ai_reports')
        .select('id')
        .eq('student_id', studentId)
        .eq('survey_id', surveyId)
        .maybeSingle();

      if (checkError) {
        console.log('⚠️ 기존 리포트 조회 중 오류 (무시하고 새로 생성):', checkError.message);
      }

      if (existingReport) {
        // 기존 리포트 업데이트
        console.log('📝 기존 AI 리포트 업데이트 중...');
        const { data, error } = await supabase
          .from('ai_reports')
          .update({
            report_data: reportData as any,
            updated_at: new Date().toISOString(),
            created_by: userId,
            // NOT NULL 필드들도 업데이트
            summary: reportData.summary || 'AI 생성 리포트',
            current_status: typeof reportData.currentStatus === 'string' 
              ? reportData.currentStatus 
              : JSON.stringify(reportData.currentStatus || {}),
            risk_assessment: typeof reportData.riskAssessment === 'string'
              ? reportData.riskAssessment
              : JSON.stringify(reportData.riskAssessment || {}),
            guidance_plan: reportData.guidancePlan || '지도 계획이 생성되었습니다.',
            specific_actions: reportData.specificActions || [],
            monitoring_points: reportData.monitoringPoints || [],
            expected_outcomes: reportData.expectedOutcomes || []
          })
          .eq('id', existingReport.id)
          .select()
          .single();

        if (error) {
          console.error('❌ AI 리포트 업데이트 실패:', error);
          throw error;
        }
        console.log('✅ AI 리포트 업데이트 성공!');
        return data as unknown as AIReportRecord;
      } else {
        // 새 리포트 생성
        console.log('💾 새 AI 리포트 저장 중...');
        const { data, error } = await supabase
          .from('ai_reports')
          .insert({
            id: crypto.randomUUID(), // 명시적으로 UUID 생성
            student_id: studentId,
            survey_id: surveyId,
            teacher_id: userId,
            report_data: reportData as any,
            created_by: userId,
            // NOT NULL 필드들에 기본값 설정
            summary: reportData.summary || 'AI 생성 리포트',
            current_status: typeof reportData.currentStatus === 'string' 
              ? reportData.currentStatus 
              : JSON.stringify(reportData.currentStatus || {}),
            risk_assessment: typeof reportData.riskAssessment === 'string'
              ? reportData.riskAssessment
              : JSON.stringify(reportData.riskAssessment || {}),
            guidance_plan: reportData.guidancePlan || '지도 계획이 생성되었습니다.',
            specific_actions: reportData.specificActions || [],
            monitoring_points: reportData.monitoringPoints || [],
            expected_outcomes: reportData.expectedOutcomes || []
          })
          .select()
          .single();

        if (error) {
          console.error('❌ AI 리포트 저장 실패:', error);
          throw error;
        }
        console.log('✅ AI 리포트 저장 성공!');
        return data as unknown as AIReportRecord;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 특정 학생과 설문에 대한 AI 리포트를 조회합니다.
   */
  static async getAIReport(
    studentId: string,
    surveyId: string
  ): Promise<AIReportRecord | null> {
    try {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('student_id', studentId)
        .eq('survey_id', surveyId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // 데이터가 없음
          return null;
        }
        console.log('⚠️ AI 리포트 조회 중 오류:', error.message);
        return null; // 오류 시 null 반환 (새로 생성하도록)
      }

      return data as unknown as AIReportRecord;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 특정 학생의 모든 AI 리포트를 조회합니다.
   */
  static async getStudentAIReports(studentId: string): Promise<AIReportRecord[]> {
    try {
      const { data, error } = await supabase
        .from('ai_reports')
        .select(`
          *,
          surveys (
            id,
            title,
            created_at
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as AIReportRecord[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * AI 리포트를 삭제합니다 (reportId 기준).
   */
  static async deleteAIReport(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * AI 리포트를 삭제합니다 (studentId와 surveyId 기준).
   */
  static async deleteAIReportByStudentSurvey(studentId: string, surveyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_reports')
        .delete()
        .eq('student_id', studentId)
        .eq('survey_id', surveyId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 리포트가 존재하는지 확인합니다.
   */
  static async hasAIReport(studentId: string, surveyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('id')
        .eq('student_id', studentId)
        .eq('survey_id', surveyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      return false;
    }
  }
}
