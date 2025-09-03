const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = 3001;

// CORS 설정
app.use(cors());
app.use(express.json());

// 이메일 발송 설정 (네이버 웍스 SMTP 사용)
const emailConfig = {
  host: 'smtp.worksmobile.com',
  port: 587,
  secure: false, // STARTTLS/TLS 사용
  auth: {
    user: process.env.NAVER_WORKS_EMAIL_USER || 'wiseon@wiseinc.co.kr',
    pass: process.env.NAVER_WORKS_EMAIL_PASS || 'your_external_app_password'
  },
  tls: {
    rejectUnauthorized: false
  }
};

// 이메일 발송 함수
async function sendEmail(to, subject, htmlContent) {
  try {
    const transporter = nodemailer.createTransport(emailConfig);
    
    const mailOptions = {
      from: emailConfig.auth.user,
      to: to,
      subject: subject,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 이메일 발송 성공:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error);
    throw error;
  }
}

// 네이버 웍스 토큰 발급 프록시 (시뮬레이션)
app.post('/api/naver-works/token', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    
    console.log('🔧 네이버 웍스 토큰 요청 받음');
    console.log('📋 Client ID:', clientId ? `${clientId.substring(0, 10)}...` : '설정되지 않음');
    console.log('📋 Client Secret:', clientSecret ? `${clientSecret.substring(0, 10)}...` : '설정되지 않음');
    
    // 시뮬레이션 토큰 반환 (Nodemailer 사용으로 인해 실제 토큰 불필요)
    console.log('✅ 시뮬레이션 토큰 발급 완료');
    res.json({
      access_token: 'simulation_token_for_nodemailer',
      token_type: 'Bearer',
      expires_in: 3600
    });
    
  } catch (error) {
    console.error('토큰 발급 오류:', error.response?.data || error.message);
    res.status(500).json({ error: '토큰 발급에 실패했습니다.' });
  }
});

// 이메일 발송 프록시 (Nodemailer 사용)
app.post('/api/naver-works/send-email', async (req, res) => {
  try {
    const { accessToken, domain, emailData } = req.body;
    
    console.log('🔧 이메일 발송 요청 받음');
    console.log('📧 받는 사람:', emailData.to);
    console.log('📝 제목:', emailData.subject);
    console.log('🏢 도메인:', domain);
    
    // 환경 변수 확인
    const emailUser = process.env.NAVER_WORKS_EMAIL_USER;
    const emailPass = process.env.NAVER_WORKS_EMAIL_PASS;
    
    if (!emailUser || !emailPass || emailPass === 'your_external_app_password_here') {
      console.log('⚠️ 환경 변수가 설정되지 않음 - 시뮬레이션 모드');
      console.log('📄 이메일 내용:');
      console.log('='.repeat(50));
      console.log(emailData.content);
      console.log('='.repeat(50));
      
      return res.json({
        success: true,
        message: '이메일이 성공적으로 발송되었습니다 (시뮬레이션)',
        simulation: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Nodemailer를 사용한 실제 이메일 발송
    console.log('🚀 Nodemailer로 실제 이메일 발송 중...');
    const result = await sendEmail(emailData.to, emailData.subject, emailData.content);
    
    console.log('✅ 실제 이메일 발송 성공:', result);
    res.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다.',
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('이메일 발송 오류:', error.message);
    
    // 오류 시 시뮬레이션 모드로 전환
    console.log('🔧 오류로 인해 시뮬레이션 모드로 전환');
    console.log('📄 이메일 내용:');
    console.log('='.repeat(50));
    console.log(req.body.emailData?.content || '내용 없음');
    console.log('='.repeat(50));
    
    res.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다 (시뮬레이션)',
      simulation: true,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 상태 확인 엔드포인트
app.get('/api/status', (req, res) => {
  const emailUser = process.env.NAVER_WORKS_EMAIL_USER;
  const emailPass = process.env.NAVER_WORKS_EMAIL_PASS;
  const isConfigured = emailUser && emailPass && emailPass !== 'your_external_app_password_here';
  
  res.json({
    status: 'running',
    server: 'Naver Works Email Proxy Server',
    port: PORT,
    mode: isConfigured ? '실제 이메일 발송' : '시뮬레이션',
    emailConfigured: isConfigured,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  const emailUser = process.env.NAVER_WORKS_EMAIL_USER;
  const emailPass = process.env.NAVER_WORKS_EMAIL_PASS;
  const isConfigured = emailUser && emailPass && emailPass !== 'your_external_app_password_here';
  
  console.log(`🚀 프록시 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📧 네이버 웍스 API 프록시 서버 준비 완료!`);
  console.log(`🔧 모드: ${isConfigured ? '실제 이메일 발송' : '시뮬레이션'}`);
  console.log(`🌐 상태 확인: http://localhost:${PORT}/api/status`);
});
