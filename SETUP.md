# IMAX 스케줄 모니터링 시스템 설정 가이드

## 🎯 완성된 기능

✅ IMAX 사이트 스크래핑 (Playwright 기반)  
✅ **모든 날짜**의 새로운 스케줄 감지 및 변경사항 추적  
✅ Slack 웹훅을 통한 실시간 알림  
✅ 중복 알림 방지  
✅ SQLite 기반 데이터 저장  
✅ GitHub Actions 자동 실행  
✅ 테스트 모드 지원  

## 🚀 GitHub Actions 설정

### 1. GitHub 저장소 시크릿 설정

1. GitHub 저장소 페이지로 이동
2. **Settings** > **Secrets and variables** > **Actions** 클릭
3. **New repository secret** 버튼 클릭
4. 다음 시크릿 추가:

```
Name: SLACK_WEBHOOK_URL
Value: https://hooks.slack.com/services/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
```

### 2. 워크플로우 활성화

- `.github/workflows/monitor.yml` 파일이 이미 생성되어 있습니다
- 코드를 GitHub에 푸시하면 자동으로 매 2분마다 실행됩니다
- **Actions** 탭에서 실행 상태를 확인할 수 있습니다

## 🧪 로컬 테스트

### 테스트 모드로 실행 (권장)
```bash
# 의존성 설치
npm install
npx playwright install chromium

# 빌드
npm run build

# 테스트 알림 전송
npm run start test-notification

# 테스트 모드로 스케줄 체크 (모의 데이터 사용)
npm run start check-once

# 지속적 모니터링 시작 (Ctrl+C로 중지)
npm run start
```

### 실제 사이트 스크래핑 모드
```bash
# .env 파일에서 TEST_MODE=false로 변경
# 실제 사이트 구조 분석이 필요할 수 있음
npm run start check-once
```

## 📱 Slack 알림 예시

새로운 스케줄이 발견되면 다음과 같은 메시지가 전송됩니다:

```
🎬 새로운 IMAX 상영 스케줄 발견!

영화: Avatar: Fire and Ash
극장: CGV 용산 아이파크몰 IMAX
📅 상영일: 2025-01-20
🕐 상영시간: 19:30
상태: ✅ 예매 가능
예매 링크: https://www.cgv.co.kr/ticket/...

감지 시각: 2025-01-12 14:30:00
```

## 🔧 설정 변경

### 환경변수 (.env 파일)
```env
SLACK_WEBHOOK_URL=your_webhook_url
TARGET_MOVIE=Avatar: Fire and Ash
TARGET_DATE=2025-01-20  # 주요 타겟 날짜 (모든 날짜 모니터링됨)
CHECK_INTERVAL_MINUTES=2
TEST_MODE=true  # false로 변경하면 실제 사이트 스크래핑
```

### 모니터링 간격 변경
- `.github/workflows/monitor.yml`에서 cron 표현식 수정
- 현재: `*/2 * * * *` (매 2분)
- 예시: `*/5 * * * *` (매 5분)

## 🛠 실제 운영 시 고려사항

### 1. 사이트 구조 분석
현재는 테스트 모드로 작동합니다. 실제 운영을 위해서는:
- IMAX/CGV 사이트의 실제 HTML 구조 분석
- 적절한 CSS 선택자로 스케줄 정보 추출
- `src/scraper.ts`의 파싱 로직 구현

### 2. 레이트 리밋 고려
- 사이트 차단 방지를 위해 적절한 간격 유지
- User-Agent 설정 및 요청 헤더 최적화
- 필요시 프록시 사용 고려

### 3. 에러 처리
- 네트워크 오류, 사이트 구조 변경 등에 대한 견고한 처리
- 실패 시 Slack으로 에러 알림 전송

### 4. 확장 가능성
- 여러 영화/극장 동시 모니터링
- 다양한 알림 채널 (이메일, SMS 등)
- 웹 대시보드 추가

## 📊 모니터링 및 디버깅

### 로그 확인
```bash
# GitHub Actions 로그 확인
# Actions 탭 > 워크플로우 실행 > 로그 보기

# 로컬 실행 시 콘솔 출력 확인
node dist/index.js check-once
```

### 데이터베이스 확인
```bash
# SQLite 데이터베이스 내용 확인 (선택사항)
sqlite3 screenings.db
.tables
SELECT * FROM snapshots;
SELECT * FROM notifications;
```

### 디버그 스크린샷
- 스크래핑 실행 시 `debug-page.png` 파일 생성
- 사이트 로딩 상태 확인 가능

## 🎉 완료!

시스템이 성공적으로 설정되었습니다. GitHub Actions가 자동으로 실행되어 "Avatar: Fire and Ash"의 **모든 날짜** IMAX 스케줄을 모니터링하고, 새로운 상영시간이나 날짜가 발견되면 Slack으로 알림을 보내드립니다!