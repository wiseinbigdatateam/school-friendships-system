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
    reportData: GeneratedReport
  ): Promise<AIReportRecord> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // 기존 리포트가 있는지 확인
      const { data: existingReport } = await supabase
        .from('ai_reports')
        .select('id')
        .eq('student_id', studentId)
        .eq('survey_id', surveyId)
        .single();

      if (existingReport) {
        // 기존 리포트 업데이트
        const { data, error } = await supabase
          .from('ai_reports')
          .update({
            report_data: reportData,
            updated_at: new Date().toISOString(),
            created_by: user.id
          })
          .eq('id', existingReport.id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as AIReportRecord;
      } else {
        // 새 리포트 생성
        const { data, error } = await supabase
          .from('ai_reports')
          .insert({
            student_id: studentId,
            survey_id: surveyId,
            teacher_id: user.id, // 기존 필드 호환성
            report_data: reportData,
            created_by: user.id,
            // 기존 필드들 (호환성을 위해 유지)
            summary: reportData.summary || '',
            current_status: typeof reportData.currentStatus === 'string' 
              ? reportData.currentStatus 
              : JSON.stringify(reportData.currentStatus),
            risk_assessment: typeof reportData.riskAssessment === 'string'
              ? reportData.riskAssessment
              : JSON.stringify(reportData.riskAssessment),
            guidance_plan: reportData.guidancePlan || '',
            specific_actions: reportData.specificActions || [],
            monitoring_points: reportData.monitoringPoints || [],
            expected_outcomes: reportData.expectedOutcomes || []
          })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as AIReportRecord;
      }
    } catch (error) {
      console.error('AI 리포트 저장 오류:', error);
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
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 데이터가 없음
          return null;
        }
        throw error;
      }

      return data as AIReportRecord;
    } catch (error) {
      console.error('AI 리포트 조회 오류:', error);
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
      console.error('학생 AI 리포트 목록 조회 오류:', error);
      throw error;
    }
  }

  /**
   * AI 리포트를 삭제합니다.
   */
  static async deleteAIReport(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      console.error('AI 리포트 삭제 오류:', error);
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
      console.error('AI 리포트 존재 확인 오류:', error);
      return false;
    }
  }
}
