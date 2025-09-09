import { supabase } from '../lib/supabase';
import { generateStudentGuidanceReport, StudentAnalysisData, GeneratedReport } from './chatgptService';

export interface AIReportData {
  id?: string;
  student_id: string;
  survey_id?: string;
  teacher_id: string;
  summary: string;
  current_status: string;
  risk_assessment: string;
  guidance_plan: string;
  specific_actions: any[];
  monitoring_points: any[];
  expected_outcomes: any[];
  html_content: string;
  created_at?: string;
  updated_at?: string;
}

// HTML 형태의 AI 리포트 생성
export const generateHTMLReport = (report: GeneratedReport, studentName: string): string => {
  // 실제 리포트 데이터를 사용하여 HTML 생성
  const summary = report.summary || `${studentName} 학생의 교우관계 분석 결과입니다.`;
  const currentStatus = typeof report.currentStatus === 'string' ? report.currentStatus : JSON.stringify(report.currentStatus);
  const riskAssessment = typeof report.riskAssessment === 'string' ? report.riskAssessment : JSON.stringify(report.riskAssessment);
  const guidancePlan = report.guidancePlan || '학생의 교우관계 개선을 위한 지도 계획이 필요합니다.';
  
  const specificActions = report.specificActions || ['구체적인 행동 계획을 수립합니다.'];
  const monitoringPoints = report.monitoringPoints || ['모니터링 포인트를 설정합니다.'];
  const expectedOutcomes = report.expectedOutcomes || ['예상되는 결과를 기대합니다.'];

  const htmlContent = `
    <div class="ai-report-html">
      <div class="section">
        <div class="title">1) 종합진단</div>
        <div class="tab highlight title">${studentName} 학생의 교우관계 분석 결과</div>
        <div class="tab-2 content">${summary}</div>
      </div>
      
      <div class="section">
        <div class="title">2) 현재 상태</div>
        <div class="tab-2 content">${currentStatus}</div>
      </div>
      
      <div class="section">
        <div class="title">3) 위험 평가</div>
        <div class="tab-2 content">${riskAssessment}</div>
      </div>
      
      <div class="section">
        <div class="title">4) 맞춤 솔루션 및 제안</div>
        <div class="tab-2 content">${guidancePlan}</div>
        
        <div class="section-content">
          <ul>
            <li class="title">단기 솔루션 (즉시 실행)</li>
            ${specificActions.map((action, index) => `
              <div class="tab-2">
                <div class="good">${index + 1}. ${action}</div>
              </div>
            `).join('')}
          </ul>
          <ul>
            <li class="title">중기 솔루션 (계획적 도입)</li>
            ${monitoringPoints.map((point, index) => `
              <div class="tab-2">
                <div class="good">${index + 1}. ${point}</div>
              </div>
            `).join('')}
          </ul>
          <ul>
            <li class="title">장기 솔루션 (지속적 관리)</li>
            ${expectedOutcomes.map((outcome, index) => `
              <div class="tab-2">
                <div class="good">${index + 1}. ${outcome}</div>
              </div>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
  
  return htmlContent;
};

// AI 리포트 생성 및 저장
export const generateAndSaveAIReport = async (
  studentId: string,
  surveyId: string,
  teacherId: string,
  analysisData: StudentAnalysisData
): Promise<AIReportData> => {
  try {
    // 기존 리포트 확인
    const { data: existingReport, error: checkError } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('survey_id', surveyId)
      .eq('teacher_id', teacherId)
      .single();

    if (existingReport && !checkError) {
      // 기존 리포트가 있으면 반환
      return existingReport as AIReportData;
    }

    // AI 리포트 생성
    const report = await generateStudentGuidanceReport(analysisData);
    
    // HTML 형태로 변환
    const htmlContent = generateHTMLReport(report, analysisData.studentName);

    // DB에 저장
    const reportData: Omit<AIReportData, 'id' | 'created_at' | 'updated_at'> = {
      student_id: studentId,
      survey_id: surveyId,
      teacher_id: teacherId,
      summary: report.summary,
      current_status: typeof report.currentStatus === 'string' ? report.currentStatus : JSON.stringify(report.currentStatus),
      risk_assessment: typeof report.riskAssessment === 'string' ? report.riskAssessment : JSON.stringify(report.riskAssessment),
      guidance_plan: report.guidancePlan,
      specific_actions: report.specificActions,
      monitoring_points: report.monitoringPoints,
      expected_outcomes: report.expectedOutcomes,
      html_content: htmlContent
    };

    const { data: savedReport, error: saveError } = await supabase
      .from('ai_reports')
      .insert([reportData])
      .select()
      .single();

    if (saveError) {
      throw new Error(`AI 리포트 저장 오류: ${saveError.message}`);
    }

    return savedReport as AIReportData;
  } catch (error) {
    console.error('AI 리포트 생성 및 저장 오류:', error);
    throw error;
  }
};

// 저장된 AI 리포트 조회
export const getSavedAIReport = async (
  studentId: string,
  surveyId: string,
  teacherId: string
): Promise<AIReportData | null> => {
  try {
    const { data: report, error } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('survey_id', surveyId)
      .eq('teacher_id', teacherId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 "not found" 오류
      throw new Error(`AI 리포트 조회 오류: ${error.message}`);
    }

    return report as AIReportData | null;
  } catch (error) {
    console.error('AI 리포트 조회 오류:', error);
    throw error;
  }
};
