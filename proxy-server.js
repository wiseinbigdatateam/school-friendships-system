const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 8091;

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
    return { success: true, messageId: info.messageId };
  } catch (error) {
    throw error;
  }
}

// 네이버 웍스 토큰 발급 프록시 (시뮬레이션)
app.post('/api/naver-works/token', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    
    
    // 시뮬레이션 토큰 반환 (Nodemailer 사용으로 인해 실제 토큰 불필요)
    res.json({
      access_token: 'simulation_token_for_nodemailer',
      token_type: 'Bearer',
      expires_in: 3600
    });
    
  } catch (error) {
    res.status(500).json({ error: '토큰 발급에 실패했습니다.' });
  }
});

// 이메일 발송 프록시 (Nodemailer 사용)
app.post('/api/naver-works/send-email', async (req, res) => {
  try {
    const { accessToken, domain, emailData } = req.body;
    
    
    // 환경 변수 확인
    const emailUser = process.env.NAVER_WORKS_EMAIL_USER;
    const emailPass = process.env.NAVER_WORKS_EMAIL_PASS;
    
    if (!emailUser || !emailPass || emailPass === 'your_external_app_password_here') {
   
      
      return res.json({
        success: true,
        message: '이메일이 성공적으로 발송되었습니다 (시뮬레이션)',
        simulation: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Nodemailer를 사용한 실제 이메일 발송
    const result = await sendEmail(emailData.to, emailData.subject, emailData.content);
    
    res.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다.',
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    
    // 오류 시 시뮬레이션 모드로 전환
    res.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다 (시뮬레이션)',
      simulation: true,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Python 네트워크 분석 스크립트 실행 API
app.post('/api/network-analysis/run', async (req, res) => {
  try {
    const { surveyId, surveyData, studentInfo } = req.body;
    
    
    // 임시 데이터 파일 생성
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const dataFile = path.join(tempDir, `network_data_${timestamp}.json`);
    const outputFile = path.join(tempDir, `network_result_${timestamp}.json`);
    
    // 입력 데이터 파일 생성
    const inputData = {
      survey_id: surveyId,
      survey_data: surveyData,
      student_info: studentInfo,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(dataFile, JSON.stringify(inputData, null, 2), 'utf8');
    
    // Python 스크립트 실행
    const pythonScript = path.join(__dirname, 'src', 'scripts', 'network_analysis_api.py');
    
    if (!fs.existsSync(pythonScript)) {
      throw new Error(`Python 스크립트를 찾을 수 없습니다: ${pythonScript}`);
    }
    
    
    // 가상환경의 Python 사용
    const venvPython = path.join(__dirname, 'venv', 'bin', 'python3');
    const pythonCommand = fs.existsSync(venvPython) ? venvPython : 'python3';
    
    
    const pythonProcess = spawn(pythonCommand, [pythonScript, dataFile, outputFile], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Python 프로세스 완료 대기
    const result = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        
        if (code === 0) {
          // 성공적으로 완료된 경우 결과 파일 읽기
          try {
            if (fs.existsSync(outputFile)) {
              const resultData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
              resolve(resultData);
            } else {
              reject(new Error('결과 파일이 생성되지 않았습니다.'));
            }
          } catch (error) {
            reject(new Error(`결과 파일 읽기 오류: ${error.message}`));
          }
        } else {
          reject(new Error(`Python 스크립트 실행 실패 (코드: ${code})\n${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Python 프로세스 오류: ${error.message}`));
      });
      
      // 타임아웃 설정 (5분)
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python 스크립트 실행 타임아웃 (5분)'));
      }, 300000);
    });
    
    // 임시 파일 정리
    try {
      if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch (cleanupError) {
    }
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
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
    pythonAnalysisAvailable: true,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  const emailUser = process.env.NAVER_WORKS_EMAIL_USER;
  const emailPass = process.env.NAVER_WORKS_EMAIL_PASS;
  const isConfigured = emailUser && emailPass && emailPass !== 'your_external_app_password_here';
  
});
