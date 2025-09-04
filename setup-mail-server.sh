#!/bin/bash

# ===== 설정 변수 =====
EC2_IP="43.202.15.151"                              # EC2 퍼블릭 IP
DOMAIN="edu.wiseon.io"                     # 운영 도메인 (실제 도메인으로 변경 필요)
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

# ===== SSH 키 파일 확인 =====
check_ssh_key() {
    log_info "SSH 키 파일 확인 중..."
    
    # 가능한 키 파일 경로들
    possible_paths=(
        "$KEY_FILE"
        "~/.ssh/school-friendships.pem"
        "~/.ssh/aws-key.pem"
        "~/awsKey/school-friendships.pem"
        "~/awsKey/aws-key.pem"
        "./school-friendships.pem"
        "./aws-key.pem"
    )
    
    # 설정된 키 파일 경로 확인
    if [ -f "$KEY_FILE" ]; then
        log_success "SSH 키 파일 발견: $KEY_FILE"
        return 0
    fi
    
    # 다른 가능한 경로들 확인
    for path in "${possible_paths[@]}"; do
        expanded_path=$(eval echo $path)
        if [ -f "$expanded_path" ]; then
            KEY_FILE="$expanded_path"
            log_success "SSH 키 파일 발견: $expanded_path"
            return 0
        fi
    done
    
    log_error "SSH 키 파일을 찾을 수 없습니다!"
    log_info "다음 경로들을 확인해주세요:"
    for path in "${possible_paths[@]}"; do
        echo "  - $path"
    done
    log_info "또는 스크립트 상단의 KEY_FILE 변수를 수정해주세요."
    return 1
}

# ===== SSH 연결 테스트 =====
test_ssh_connection() {
    log_info "SSH 연결 테스트 중..."
    
    if ssh -i $KEY_FILE -o ConnectTimeout=10 -o BatchMode=yes $REMOTE_USER@$EC2_IP "echo 'SSH 연결 성공'" 2>/dev/null; then
        log_success "SSH 연결 성공"
        return 0
    else
        log_error "SSH 연결 실패"
        log_info "다음을 확인해주세요:"
        log_info "1. EC2 인스턴스가 실행 중인지 확인"
        log_info "2. 보안 그룹에서 SSH(22) 포트가 열려있는지 확인"
        log_info "3. 키 파일 경로와 권한이 올바른지 확인"
        log_info "4. EC2 IP 주소가 올바른지 확인"
        return 1
    fi
}

# ===== 메일서버 설정 =====
setup_mail_server() {
    log_info "🔧 메일서버 설정 중..."
    
    # 1단계: 원격 디렉토리 확인 및 생성
    log_info "  1단계: 원격 디렉토리 확인..."
    ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "mkdir -p ~/mail-server"
    log_success "  원격 디렉토리 준비 완료"
    
    # 2단계: proxy-server.js 파일 업로드
    log_info "  2단계: proxy-server.js 파일 업로드..."
    if scp -i $KEY_FILE proxy-server.js $REMOTE_USER@$EC2_IP:~/mail-server/; then
        log_success "  proxy-server.js 파일 업로드 완료"
    else
        log_error "  proxy-server.js 파일 업로드 실패"
        return 1
    fi
    
    # 3단계: 환경변수 파일 업로드
    log_info "  3단계: 환경변수 파일 업로드..."
    if scp -i $KEY_FILE .env $REMOTE_USER@$EC2_IP:~/mail-server/ 2>/dev/null; then
        log_success "  .env 파일 업로드 완료"
    else
        log_warning "  .env 파일이 로컬에 없습니다 (수동 설정 필요)"
    fi
    
    # 4단계: package.json 생성 (의존성 관리를 위해)
    log_info "  4단계: package.json 생성..."
    ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "cd ~/mail-server && cat > package.json << 'EOF'
{
  \"name\": \"mail-server\",
  \"version\": \"1.0.0\",
  \"description\": \"Mail server for school friendships system\",
  \"main\": \"proxy-server.js\",
  \"scripts\": {
    \"start\": \"node proxy-server.js\"
  },
  \"dependencies\": {
    \"express\": \"^4.18.2\",
    \"cors\": \"^2.8.5\",
    \"axios\": \"^1.4.0\",
    \"nodemailer\": \"^6.9.2\",
    \"dotenv\": \"^16.0.3\"
  }
}
EOF"
    log_success "  package.json 생성 완료"
    
    # 5단계: 기존 메일서버 프로세스 종료
    log_info "  5단계: 기존 메일서버 프로세스 종료..."
    ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "pkill -f 'node.*proxy-server.js' || pkill -f 'mail-server' || true"
    sleep 2
    log_success "  기존 메일서버 프로세스 종료 완료"
    
    # 6단계: 의존성 패키지 설치 (캐시 활용)
    log_info "  6단계: 의존성 패키지 설치..."
    if ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "cd ~/mail-server && npm ci --only=production --no-audit --no-fund"; then
        log_success "  의존성 패키지 설치 완료"
    else
        log_warning "  npm ci 실패, npm install 시도..."
        if ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "cd ~/mail-server && npm install --production --no-audit --no-fund"; then
            log_success "  의존성 패키지 설치 완료"
        else
            log_error "  의존성 패키지 설치 실패"
            return 1
        fi
    fi
    
    # 7단계: 메일서버 실행 (빠른 시작)
    log_info "  7단계: 메일서버 실행..."
    ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "cd ~/mail-server && nohup node proxy-server.js > proxy-server.log 2>&1 & echo \$! > proxy-server.pid"
    sleep 1
    log_success "  메일서버 실행 완료"
    
    # 8단계: 메일서버 상태 확인 (빠른 확인)
    log_info "  8단계: 메일서버 상태 확인..."
    for i in {1..5}; do
        if ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "ps aux | grep 'node.*proxy-server.js' | grep -v grep" >/dev/null 2>&1; then
            log_success "  메일서버가 정상적으로 실행 중입니다"
            break
        else
            if [ $i -eq 5 ]; then
                log_error "  메일서버 실행 상태를 확인할 수 없습니다"
                # 로그 확인
                log_info "  메일서버 로그 확인 중..."
                ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "tail -10 ~/mail-server/proxy-server.log"
                return 1
            fi
            sleep 0.5
        fi
    done
    
    # 9단계: 메일서버 포트 확인 (빠른 확인)
    log_info "  9단계: 메일서버 포트 확인..."
    for i in {1..3}; do
        if ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "netstat -tlnp | grep :3001" >/dev/null 2>&1; then
            log_success "  메일서버가 포트 3001에서 정상적으로 실행 중입니다"
            break
        else
            if [ $i -eq 3 ]; then
                log_warning "  메일서버 포트 확인 실패 (서비스 시작 중일 수 있음)"
            else
                sleep 0.5
            fi
        fi
    done
    
    # 10단계: 메일서버 로그 확인 (간단히)
    log_info "  10단계: 메일서버 로그 확인..."
    ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP "tail -3 ~/mail-server/proxy-server.log"
    
    log_success "메일서버 설정 완료"
    return 0
}

# ===== 메인 프로세스 =====
main() {
    log_info "📧 메일서버 설정 시작..."
    log_info "대상 서버: $EC2_IP"
    
    # SSH 키 파일 확인
    if ! check_ssh_key; then
        exit 1
    fi
    
    # SSH 연결 테스트
    if ! test_ssh_connection; then
        exit 1
    fi
    
    # 메일서버 설정
    if setup_mail_server; then
        log_success "🎉 메일서버 설정 완료!"
        
        echo ""
        log_info "📋 메일서버 정보:"
        echo "   서버: $EC2_IP"
        echo "   포트: 3001"
        echo "   상태: 실행 중"
        echo ""
        log_info "🔧 유용한 명령어:"
        echo "   메일서버 상태: ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'ps aux | grep proxy-server'"
        echo "   메일서버 로그: ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'tail -f ~/mail-server/proxy-server.log'"
        echo "   메일서버 재시작: ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'cd ~/mail-server && pkill -f proxy-server && nohup node proxy-server.js > proxy-server.log 2>&1 &'"
        echo "   메일서버 디렉토리: ssh -i $KEY_FILE $REMOTE_USER@$EC2_IP 'ls -la ~/mail-server/'"
        echo ""
        log_info "📊 설정 정보:"
        echo "   설정 시간: $(date)"
        echo "   설정 버전: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    else
        log_error "메일서버 설정에 실패했습니다."
        log_info "수동 설정을 위해 manual-mail-server-setup.sh를 실행해주세요."
        exit 1
    fi
}

# ===== 스크립트 실행 =====
main "$@"
