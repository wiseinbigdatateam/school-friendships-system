import React from "react";
import { GeneratedReport } from "../services/chatgptService";

interface AIReportDisplayProps {
  aiReport: GeneratedReport;
  tokenUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_estimate?: number;
  };
}

const AIReportDisplay: React.FC<AIReportDisplayProps> = ({
  aiReport,
  tokenUsage,
}) => {
  // 학생 유형에 따른 배경색 및 텍스트 색상 반환 함수
  const getStudentTypeStyle = (studentType: string) => {
    const type = studentType || "";
    
    if (type.includes("외톨이") || type.includes("isolated")) {
      return {
        backgroundColor: "#FF6B6B",
        color: "#FFFFFF",
      };
    } else if (type.includes("소수 친구") || type.includes("few_friends")) {
      return {
        backgroundColor: "#4ECDC4",
        color: "#FFFFFF",
      };
    } else if (type.includes("평균") || type.includes("average")) {
      return {
        backgroundColor: "#45B7D1",
        color: "#FFFFFF",
      };
    } else if (type.includes("친구 많은") || type.includes("many_friends")) {
      return {
        backgroundColor: "#96CEB4",
        color: "#FFFFFF",
      };
    } else if (type.includes("사교") || type.includes("social_star")) {
      return {
        backgroundColor: "#FFEAA7",
        color: "#1F2937",
      };
    }
    
    // 기본값
    return {
      backgroundColor: "#45B7D1",
      color: "#FFFFFF",
    };
  };

  return (
    <div className="space-y-6">
      {/* 토큰 사용량 정보 */}
      {/* {tokenUsage && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            📊 AI 토큰 사용량 정보
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">프롬프트 토큰:</span>
                <span className="font-medium text-blue-600">{tokenUsage.prompt_tokens.toLocaleString()}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">응답 토큰:</span>
                <span className="font-medium text-green-600">{tokenUsage.completion_tokens.toLocaleString()}개</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">총 토큰:</span>
                <span className="font-medium text-blue-600">{tokenUsage.total_tokens.toLocaleString()}개</span>
              </div>
              {tokenUsage.cost_estimate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">추정 비용:</span>
                  <span className="font-medium text-orange-600">${tokenUsage.cost_estimate.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )} */}
      {/* 종합진단 */}
      <div className="rounded-lg bg-blue-50 p-6">
        <h4 className="mb-4 text-lg font-semibold text-blue-800">
          1) 종합진단
        </h4>
        <div className="rounded-lg bg-white p-4">
          <div className="mb-3">
            <span
              className="inline-block rounded-full px-3 py-1 text-sm font-medium"
              style={getStudentTypeStyle(
                aiReport.comprehensiveDiagnosis?.studentType || "일반형",
              )}
            >
              {aiReport.comprehensiveDiagnosis?.studentType || "일반형"}
            </span>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            {aiReport.comprehensiveDiagnosis?.summary || aiReport.summary || ""}
          </p>

          {/* 주요 특성 */}
          {aiReport.comprehensiveDiagnosis?.keyCharacteristics &&
            aiReport.comprehensiveDiagnosis.keyCharacteristics.length > 0 && (
              <div className="mb-3">
                <h5 className="mb-2 text-sm font-medium text-gray-800">
                  주요 특성
                </h5>
                <ul className="space-y-1">
                  {aiReport.comprehensiveDiagnosis.keyCharacteristics.map(
                    (characteristic, index) => (
                      <li
                        key={index}
                        className="flex items-start text-sm text-gray-600"
                      >
                        <span className="mr-2 mt-1 text-gray-600">•</span>
                        {characteristic}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

          {/* 도전 과제 */}
          {aiReport.comprehensiveDiagnosis?.challenges &&
            aiReport.comprehensiveDiagnosis.challenges.length > 0 && (
              <div>
                <h5 className="mb-2 text-sm font-medium text-gray-800">
                  도전 과제
                </h5>
                <ul className="space-y-1">
                  {aiReport.comprehensiveDiagnosis.challenges.map(
                    (challenge, index) => (
                      <li
                        key={index}
                        className="flex items-start text-sm text-gray-600"
                      >
                        <span className="mr-2 mt-1 text-gray-600">•</span>
                        {challenge}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
        </div>
      </div>

      {/* 세부 분석 */}
      <div className="rounded-lg bg-blue-50 p-6">
        <h4 className="mb-4 text-lg font-semibold text-blue-800">
          2) 세부 분석
        </h4>

        {/* 학교생활 만족도 분석 */}
        {aiReport.detailedAnalysis?.schoolLifeSatisfaction && (
          <div className="mb-4 rounded-lg bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-blue-700">
              학교생활 만족도 분석 (설문 결과)
            </h5>
            {aiReport.detailedAnalysis.schoolLifeSatisfaction.surveyResults &&
            aiReport.detailedAnalysis.schoolLifeSatisfaction.surveyResults
              .length > 0 ? (
              <div className="mb-3 space-y-2">
                {aiReport.detailedAnalysis.schoolLifeSatisfaction.surveyResults.map(
                  (result, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{result.question}:</span>
                      <span
                        className={`font-medium ${result.answer === "예" ? "text-blue-600" : result.answer === "아니요" ? "text-red-600" : "text-gray-600"}`}
                      >
                        {result.answer}
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="mb-3 text-sm text-gray-500">
                쉬는 시간에 친구들과 잘 논다: 예, 수업 시간에 즐겁게 참여한다:
                예, 학교에 오고 싶다는 생각이 든다: 예, 선생님과 이야기하는 것이
                편하다: 아니요, 학교 활동에 적극적으로 참여한다: 아니요, 급식을
                남기지 않고 잘 먹는다: 예
              </div>
            )}
            <p className="text-sm leading-relaxed text-gray-700">
              {aiReport.detailedAnalysis.schoolLifeSatisfaction.analysis}
            </p>
          </div>
        )}

        {/* 교우관계 네트워크 분석 */}
        {aiReport.detailedAnalysis?.peerNetworkAnalysis && (
          <div className="rounded-lg bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-blue-700">
              교우관계 네트워크 분석 (관계도)
            </h5>
            <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {
                    aiReport.detailedAnalysis.peerNetworkAnalysis
                      .receivedChoices
                  }
                  명
                </div>
                <div className="text-gray-600">
                  받은 선택 (나를 선택한 친구)
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {aiReport.detailedAnalysis.peerNetworkAnalysis.madeChoices}명
                </div>
                <div className="text-gray-600">한 선택 (내가 선택한 친구)</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              {aiReport.detailedAnalysis.peerNetworkAnalysis.analysis}
            </p>
          </div>
        )}
      </div>

      {/* 강점 및 개선 영역 */}
      <div className="rounded-lg bg-blue-50 p-6">
        <h4 className="mb-4 text-lg font-semibold text-blue-800">
          3) 강점 및 개선 영역
        </h4>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 긍정적인 요인 (강점) */}
          <div className="rounded-lg bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-blue-700">
              긍정적인 요인 (강점)
            </h5>
            <div className="space-y-3">
              {aiReport.strengthsAndImprovements?.strengths &&
              aiReport.strengthsAndImprovements.strengths.length > 0 ? (
                aiReport.strengthsAndImprovements.strengths.map(
                  (strength, index) => (
                    <div key={index} className="text-sm">
                      <div className="mb-1 font-medium text-blue-800">
                        {strength.title}
                      </div>
                      <div className="text-gray-600">
                        {strength.description}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="text-sm text-gray-500">
                  강점 분석이 필요합니다.
                </div>
              )}
            </div>
          </div>

          {/* 주의가 필요한 부분 (개선 영역) */}
          <div className="rounded-lg bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-blue-700">
              주의가 필요한 부분 (개선 영역)
            </h5>
            <div className="space-y-3">
              {aiReport.strengthsAndImprovements?.improvementAreas &&
              aiReport.strengthsAndImprovements.improvementAreas.length > 0 ? (
                aiReport.strengthsAndImprovements.improvementAreas.map(
                  (area, index) => (
                    <div key={index} className="text-sm">
                      <div className="mb-1 font-medium text-blue-800">
                        {area.title}
                      </div>
                      <div className="text-gray-600">{area.description}</div>
                    </div>
                  ),
                )
              ) : (
                <div className="text-sm text-gray-500">
                  개선 영역 분석이 필요합니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 맞춤 솔루션 및 제안 */}
      <div className="rounded-lg bg-blue-50 p-6">
        <h4 className="mb-4 text-lg font-semibold text-blue-800">
          4) 맞춤 솔루션 및 제안
        </h4>

        <div className="mb-4 rounded-lg bg-white p-4">
          <p className="text-sm leading-relaxed text-gray-700">
            {aiReport.customizedSolutions?.overallGoal ||
              aiReport.guidancePlan ||
              ""}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* 단기 솔루션 */}
          <div className="rounded-lg bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-blue-700">
              단기 솔루션 (즉시 실행)
            </h5>
            <div className="space-y-2">
              {aiReport.customizedSolutions?.shortTermSolutions &&
              aiReport.customizedSolutions.shortTermSolutions.length > 0 ? (
                aiReport.customizedSolutions.shortTermSolutions.map(
                  (solution, index) => (
                    <div key={index} className="text-sm">
                      <div className="mb-1 font-medium text-blue-800">
                        {solution.title}
                      </div>
                      <div className="text-gray-600">
                        {solution.description}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="text-sm text-gray-500">
                  단기 솔루션이 필요합니다.
                </div>
              )}
            </div>
          </div>

          {/* 중기 솔루션 */}
          <div className="rounded-lg bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-blue-700">
              중기 솔루션 (계획적 도입)
            </h5>
            <div className="space-y-2">
              {aiReport.customizedSolutions?.midTermSolutions &&
              aiReport.customizedSolutions.midTermSolutions.length > 0 ? (
                aiReport.customizedSolutions.midTermSolutions.map(
                  (solution, index) => (
                    <div key={index} className="text-sm">
                      <div className="mb-1 font-medium text-blue-800">
                        {solution.title}
                      </div>
                      <div className="text-gray-600">
                        {solution.description}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="text-sm text-gray-500">
                  중기 솔루션이 필요합니다.
                </div>
              )}
            </div>
          </div>

          {/* 장기 솔루션 */}
          <div className="rounded-lg border border-blue-100 bg-white p-4">
            <h5 className="mb-3 text-sm font-semibold text-blue-700">
              장기 솔루션 (지속적 관리)
            </h5>
            <div className="space-y-2">
              {aiReport.customizedSolutions?.longTermSolutions &&
              aiReport.customizedSolutions.longTermSolutions.length > 0 ? (
                aiReport.customizedSolutions.longTermSolutions.map(
                  (solution, index) => (
                    <div key={index} className="text-sm">
                      <div className="mb-1 font-medium text-blue-800">
                        {solution.title}
                      </div>
                      <div className="text-gray-600">
                        {solution.description}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="text-sm text-gray-500">
                  장기 솔루션이 필요합니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIReportDisplay;
