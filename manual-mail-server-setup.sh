#!/bin/bash

# ===== 설정 변수 =====
EC2_IP="43.202.15.151"                              # EC2 퍼블릭 IP
KEY_FILE="/Users/jinseongkim/awsKey/school-friendships-key.pem"  # SSH 키 파일 경로
REMOTE_USER="ec2-user"                                # EC2 사용자명

# ===== 색상 설정 =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# ===== 로그 함수 =====
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

echo "📧 메일서버 수동 설정 가이드"
echo "================================"
echo ""

log_info "이 스크립트는 메일서버를 수동으로 설정하는 단계별 가이드를 제공합니다."
echo ""

# 1. SSH 연결 확인
log_step "1단계: SSH 연결 확인"
echo "다음 명령어로 SSH 연결을 확인하세요:"
echo "ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP"
echo ""

# 2. 디렉토리 생성
log_step "2단계: 메일서버 디렉토리 생성"
echo "SSH로 서버에 접속한 후 다음 명령어를 실행하세요:"
echo "mkdir -p ~/mail-server"
echo "cd ~/mail-server"
echo ""

# 3. 파일 업로드
log_step "3단계: 파일 업로드"
echo "새 터미널에서 다음 명령어로 파일을 업로드하세요:"
echo "scp -i $KEY_FILE proxy-server.js $REMOTE_USER@$EC2_IP:~/mail-server/"
echo "scp -i $KEY_FILE .env $REMOTE_USER@$EC2_IP:~/mail-server/  # .env 파일이 있는 경우"
echo ""

# 4. package.json 생성
log_step "4단계: package.json 생성"
echo "서버에서 다음 명령어를 실행하세요:"
echo "cd ~/mail-server"
echo "cat > package.json << 'EOF'"
echo "{"
echo "  \"name\": \"mail-server\","
echo "  \"version\": \"1.0.0\","
echo "  \"description\": \"Mail server for school friendships system\","
echo "  \"main\": \"proxy-server.js\","
echo "  \"scripts\": {"
echo "    \"start\": \"node proxy-server.js\""
echo "  },"
echo "  \"dependencies\": {"
echo "    \"express\": \"^4.18.2\","
echo "    \"cors\": \"^2.8.5\","
echo "    \"axios\": \"^1.4.0\","
echo "    \"nodemailer\": \"^6.9.2\","
echo "    \"dotenv\": \"^16.0.3\""
echo "  }"
echo "}"
echo "EOF"
echo ""

# 5. 의존성 설치
log_step "5단계: 의존성 패키지 설치"
echo "다음 명령어로 의존성을 설치하세요:"
echo "npm install --production"
echo ""

# 6. 환경변수 설정
log_step "6단계: 환경변수 설정"
echo ".env 파일이 없다면 다음 내용으로 생성하세요:"
echo "cat > .env << 'EOF'"
echo "NAVER_WORKS_EMAIL_USER=wiseon@wiseinc.co.kr"
echo "NAVER_WORKS_EMAIL_PASS=your_external_app_password"
echo "EOF"
echo ""
echo "⚠️  실제 네이버 웍스 외부 앱 비밀번호로 변경하세요!"
echo ""

# 7. 메일서버 실행
log_step "7단계: 메일서버 실행"
echo "다음 명령어로 메일서버를 실행하세요:"
echo "nohup node proxy-server.js > proxy-server.log 2>&1 &"
echo "echo \$! > proxy-server.pid"
echo ""

# 8. 상태 확인
log_step "8단계: 상태 확인"
echo "메일서버가 정상적으로 실행되었는지 확인하세요:"
echo "ps aux | grep proxy-server"
echo "netstat -tlnp | grep :3001"
echo "tail -f proxy-server.log"
echo ""

# 9. 유용한 명령어
log_step "유용한 명령어"
echo "메일서버 관리에 사용할 수 있는 명령어들:"
echo ""
echo "📊 상태 확인:"
echo "  ps aux | grep proxy-server"
echo "  netstat -tlnp | grep :3001"
echo "  curl http://localhost:3001/api/status"
echo ""
echo "📝 로그 확인:"
echo "  tail -f proxy-server.log"
echo "  tail -20 proxy-server.log"
echo ""
echo "🔄 재시작:"
echo "  pkill -f proxy-server"
echo "  nohup node proxy-server.js > proxy-server.log 2>&1 &"
echo "  echo \$! > proxy-server.pid"
echo ""
echo "📁 파일 확인:"
echo "  ls -la ~/mail-server/"
echo "  cat package.json"
echo "  cat .env"
echo ""

# 10. 문제 해결
log_step "문제 해결"
echo "일반적인 문제와 해결 방법:"
echo ""
echo "❌ 포트 3001이 이미 사용 중인 경우:"
echo "  netstat -tlnp | grep :3001"
echo "  pkill -f proxy-server"
echo ""
echo "❌ 권한 문제가 있는 경우:"
echo "  chmod 600 .env"
echo "  chmod 755 proxy-server.js"
echo ""
echo "❌ Node.js가 설치되지 않은 경우:"
echo "  curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -"
echo "  sudo yum install -y nodejs"
echo ""
echo "❌ npm 패키지 설치 실패:"
echo "  npm cache clean --force"
echo "  npm install --production"
echo ""

log_success "수동 설정 가이드가 완료되었습니다!"
echo ""
log_info "각 단계를 순서대로 실행하시면 메일서버가 정상적으로 설정됩니다."
echo ""
log_warning "⚠️  환경변수(.env) 설정 시 실제 네이버 웍스 외부 앱 비밀번호를 사용하세요!"
