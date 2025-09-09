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
  const htmlContent = `
    <div class="sc-jvKoal hWGurS">
      <div class="section">
        <div class="title">1) 종합진단</div>
        <div class="tab highlight title">${studentName} 학생은 교우관계 네트워크의 중심에 위치한 '주도형' 학생입니다.</div>
        <div class="tab-2 content">- 뛰어난 사회성과 리더십을 바탕으로 많은 친구들에게 긍정적인 영향을 미치고 있으며, 이는 학급 전체에 활기를 불어넣는 중요한 강점입니다.</div>
        <div class="tab-2 content">- 하지만 선생님과의 관계를 다소 불편하게 느끼고, 스스로 참여를 결정하는 활동 외에는 소극적인 모습을 보입니다.</div>
        <div class="tab-2 content">- 이는 리더 역할의 부담감이나, 수직적인 관계에 대한 심리적 저항감에서 비롯될 수 있으므로, 학생의 영향력을 긍정적으로 이끌어주기 위한 전략적인 지원이 필요합니다.</div>
      </div>
      
      <div class="section">
        <div class="title">2) 세부 분석</div>
        <ul class="tab sub-section">
          <li class="title">학교생활 만족도 분석 (설문 결과) : ${studentName} 학생의 설문 응답은 <span class="highlight">또래 관계에 대한 높은 만족감과 교사 및 일부 활동에 대한 미묘한 거리감을 동시에 보여줍니다.</span></li>
          <li class="tab-2">쉬는 시간에 친구들과 잘 논다: <span class="yes">예</span></li>
          <li class="tab-2">수업 시간에 즐겁게 참여한다: <span class="yes">예</span></li>
          <li class="tab-2">학교에 오고 싶다는 생각이 든다: <span class="yes">예</span></li>
          <li class="tab-2">선생님과 이야기하는 것이 편하다: <span class="no">아니요</span></li>
          <li class="tab-2">학교 활동에 적극적으로 참여한다: <span class="no">아니요</span></li>
          <li class="tab-2">급식을 남기지 않고 잘 먹는다: <span class="yes">예</span></li>
        </ul>
        <div class="box">
          <div>친구 관계에 대한 긍정 응답과 달리, 교사와의 관계나 학교 활동 참여에는 부정적으로 답했습니다.</div>
          <div>이는 자신이 주도하지 않는 관계나 활동에는 큰 흥미를 느끼지 못하는 성향을 시사합니다.</div>
        </div>
        <ul class="tab sub-section">
          <li class="title">교우관계 네트워크 분석 (관계도) : 위의 교우관계 네트워크에서 ${studentName} 학생은 <span class="highlight">'주도형' 또는 '인기형'</span>으로 분류됩니다.</li>
        </ul>
        <div class="sub-section image-box">
          <div class="col">
            <div class="friend-to-me">받은 선택 (나를 선택한 친구) : ${report.individualSummary?.networkStability?.friendCount || '5'}명</div>
            <img src="/image/friend_to_me.png" alt="friend_to_me">
          </div>
          <div class="col">
            <div class="me-to-friend">한 선택 (내가 선택한 친구) : ${report.individualSummary?.networkStability?.friendCount ? parseInt(report.individualSummary.networkStability.friendCount) - 1 : '4'}명</div>
            <img src="/image/me_to_friend.png" alt="me_to_friend">
          </div>
        </div>
        <div class="box">
          <div>다수의 학생으로부터 선택을 받아 관계망의 중심에 있으며, 본인 역시 여러 친구들과 상호작용하며 네트워크 허브 역할을 하고 있습니다.</div>
          <div>학급 내 여론 형성이나 분위기를 주도하는 핵심적인 인물입니다.</div>
        </div>
      </div>
      
      <div class="section">
        <div class="title">3) 강점 및 개선 영역</div>
        <div class="section-content">
          <ul>
            <li class="title">긍정적인 요인 (강점)</li>
            <div class="tab-2">
              <div class="good">1. 뛰어난 사회성 및 리더십</div>
              <div class="tab">많은 친구들에게 신뢰와 인기를 얻고 있어 관계의 중심 역할을 합니다.</div>
            </div>
            <div class="tab-2">
              <div class="good">2. 긍정적 또래 영향력</div>
              <div class="tab">학생의 즐거운 학교생활 태도는 주변 친구들에게도 긍정적인 영향을 미칠 수 있습니다.</div>
            </div>
          </ul>
          <ul>
            <li class="title">주의가 필요한 부분 (개선 영역)</li>
            <div class="tab-2">
              <div class="bad">1. 권위와의 관계 설정</div>
              <div class="tab">교사와의 관계를 불편하게 여겨, 지도나 조언을 받아들이는 데 어려움을 겪을 수 있습니다.</div>
            </div>
            <div class="tab-2">
              <div class="bad">2. 역할에 대한 부담감</div>
              <div class="tab">네트워크의 중심에 있다는 사실이 때로는 압박감이나 과도한 책임감으로 작용할 수 있습니다.</div>
            </div>
            <div class="tab-2">
              <div class="bad">3. 선택적 참여</div>
              <div class="tab">자신이 흥미를 느끼거나 주도하는 활동에만 참여하려는 경향이 있어, 다양한 경험의 기회를 놓칠 수 있습니다.</div>
            </div>
          </ul>
        </div>
      </div>
      
      <div class="section">
        <div class="title">4) 맞춤 솔루션 및 제안</div>
        <div class="section-content">
          <div class="title highlight">${studentName} 학생의 뛰어난 리더십을 긍정적으로 발휘하도록 돕고, 모든 관계에서 건강한 상호작용을 배울 수 있도록 지원해야 합니다.</div>
          <ul>
            <li class="title">단기 솔루션 (즉시 실행)</li>
            ${report.specificActions.map((action, index) => `
              <div class="tab-2">
                <div class="good">${index + 1}. ${action.split(':')[0]}</div>
                <div class="tab">${action.split(':')[1] || action}</div>
              </div>
            `).join('')}
          </ul>
          <ul>
            <li class="title">중기 솔루션 (계획적 도입)</li>
            ${report.monitoringPoints.map((point, index) => `
              <div class="tab-2">
                <div class="good">${index + 1}. ${point.split(':')[0]}</div>
                <div class="tab">${point.split(':')[1] || point}</div>
              </div>
            `).join('')}
          </ul>
          <ul>
            <li class="title">장기 솔루션 (지속적 관리)</li>
            ${report.expectedOutcomes.map((outcome, index) => `
              <div class="tab-2">
                <div class="good">${index + 1}. ${outcome.split(':')[0]}</div>
                <div class="tab">${outcome.split(':')[1] || outcome}</div>
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
