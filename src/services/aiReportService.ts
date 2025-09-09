import { supabase } from '../lib/supabase';
import { GeneratedReport } from './chatgptService';

export interface AIReportRecord {
  id?: string;
  student_id: string;
  survey_id: string;
  report_data: GeneratedReport;
  created_at?: string;
  updated_at?: string;
}

export const saveAIReport = async (
  studentId: string,
  surveyId: string,
  reportData: GeneratedReport
): Promise<AIReportRecord> => {
  try {
    const { data, error } = await supabase
      .from('ai_reports')
      .upsert({
        student_id: studentId,
        survey_id: surveyId,
        report_data: reportData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,survey_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('AI 리포트 저장 오류:', error);
    throw error;
  }
};

export const getAIReport = async (
  studentId: string,
  surveyId: string
): Promise<AIReportRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('survey_id', surveyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터가 없는 경우
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('AI 리포트 조회 오류:', error);
    throw error;
  }
};

export const deleteAIReport = async (
  studentId: string,
  surveyId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('ai_reports')
      .delete()
      .eq('student_id', studentId)
      .eq('survey_id', surveyId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('AI 리포트 삭제 오류:', error);
    throw error;
  }
};
