import axios from 'axios';

// 네이버 웍스 이메일 API 설정
const NAVER_WORKS_CONFIG = {
  clientId: process.env.REACT_APP_NAVER_WORKS_CLIENT_ID || '',
  clientSecret: process.env.REACT_APP_NAVER_WORKS_CLIENT_SECRET || '',
  domain: process.env.REACT_APP_NAVER_WORKS_DOMAIN || '',
  apiUrl: 'https://www.worksapis.com/v1.0'
};

interface EmailData {
  to: string;
  subject: string;
  content: string;
  from?: string;
}

// 이메일 서비스 함수들
export const emailService = {
  // 네이버 웍스 액세스 토큰 획득 (프록시 서버 사용)
  async getAccessToken(): Promise<string> {
    try {
      
      // 운영 환경에서는 HTTPS를 통해 Nginx 프록시 사용, 개발 환경에서는 환경 변수 사용
      const isProduction = window.location.hostname === 'edu.wiseon.io';
      const baseUrl = isProduction 
        ? 'https://edu.wiseon.io/api' 
        : (process.env.REACT_APP_PROXY_SERVER_URL || 'http://localhost:3001');
      
      // 운영환경에서는 /api가 이미 포함되어 있으므로 추가하지 않음, 로컬환경에서는 /api 추가
      const tokenUrl = isProduction 
        ? `${baseUrl}/naver-works/token`
        : `${baseUrl}/api/naver-works/token`;
        
      const response = await axios.post(tokenUrl, {
        clientId: NAVER_WORKS_CONFIG.clientId,
        clientSecret: NAVER_WORKS_CONFIG.clientSecret
      });


      const accessToken = response.data.access_token;
      if (!accessToken) {
        throw new Error('액세스 토큰을 받지 못했습니다.');
      }
      
      return accessToken;
    } catch (error) {
      console.error('❌ 네이버 웍스 액세스 토큰 획득 실패:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('📊 토큰 응답 상태:', axiosError.response?.status);
        console.error('📄 토큰 응답 데이터:', axiosError.response?.data);
      }
      throw new Error('이메일 서비스 인증에 실패했습니다.');
    }
  },

  // 이메일 발송 (실제 네이버 웍스 API 사용)
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {

      // 네이버 웍스 설정이 없으면 시뮬레이션 모드
      if (!NAVER_WORKS_CONFIG.clientId || !NAVER_WORKS_CONFIG.clientSecret || !NAVER_WORKS_CONFIG.domain) {
        return true;
      }


      // 실제 네이버 웍스 API 호출 (프록시 서버 사용)
      const accessToken = await this.getAccessToken();

      // 운영 환경에서는 HTTPS를 통해 Nginx 프록시 사용, 개발 환경에서는 환경 변수 사용
      const isProduction = window.location.hostname === 'edu.wiseon.io';
      const baseUrl = isProduction 
        ? 'https://edu.wiseon.io/api' 
        : (process.env.REACT_APP_PROXY_SERVER_URL || 'http://localhost:3001');
      
      // 운영환경에서는 /api가 이미 포함되어 있으므로 추가하지 않음, 로컬환경에서는 /api 추가
      const sendEmailUrl = isProduction 
        ? `${baseUrl}/naver-works/send-email`
        : `${baseUrl}/api/naver-works/send-email`;


      const requestData = {
        accessToken,
        domain: NAVER_WORKS_CONFIG.domain,
        emailData
      };


      const response = await axios.post(sendEmailUrl, requestData);

      return true;
    } catch (error) {
      console.error('❌ 이메일 발송 실패:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('📊 응답 상태:', axiosError.response?.status);
        console.error('📄 응답 데이터:', axiosError.response?.data);
      }
      throw new Error('이메일 발송에 실패했습니다.');
    }
  },

  // 비밀번호 재설정 이메일 템플릿
  generatePasswordResetEmail(to: string, tempPassword: string, userName: string): EmailData {
    const subject = '[WiseOn School] 비밀번호 재설정 안내';
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>비밀번호 재설정</title>
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .password-box { background: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .password { font-size: 24px; font-weight: bold; color: #1976d2; letter-spacing: 2px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 비밀번호 재설정</h1>
            <p>WiseOn School 교우관계 분석 시스템</p>
          </div>
          
          <div class="content">
            <h2>안녕하세요, ${userName}님!</h2>
            
            <p>비밀번호 재설정 요청이 접수되었습니다.</p>
            
            <div class="password-box">
              <h3>임시 비밀번호</h3>
              <div class="password">${tempPassword}</div>
              <p>위 임시 비밀번호로 로그인해주세요.</p>
            </div>
            
            <div class="warning">
              <h4>⚠️ 보안 안내</h4>
              <ul>
                <li>임시 비밀번호는 한 번만 사용 가능합니다.</li>
                <li>로그인 후 반드시 새로운 비밀번호로 변경해주세요.</li>
                <li>비밀번호는 8자 이상, 영문/숫자/특수문자 조합을 권장합니다.</li>
              </ul>
            </div>
            
            <p>
              <a href="${window.location.origin}/login" class="button">로그인하기</a>
            </p>
            
            <p>본인이 요청하지 않은 경우 이 이메일을 무시하시면 됩니다.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 WiseOn School. All rights reserved.</p>
            <p>문의사항: 고객지원센터 02-558-5144 | 이메일: wiseon@wiseinc.co.kr</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to,
      subject,
      content
    };
  }
};

export default emailService;
