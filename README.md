# IMAX Schedule Monitor

CGV 용산 아이파크몰 IMAX에서 "Avatar: Fire and Ash" 영화의 스케줄을 모니터링하고 Slack으로 알림을 보내는 시스템입니다.

## 기능

- 🎬 IMAX 사이트에서 특정 영화의 상영 스케줄 자동 모니터링
- 📅 **모든 날짜**의 새로운 스케줄 및 시간대 변경사항 감지
- 🔔 Slack 웹훅을 통한 실시간 알림
- 🔄 상영 상태 변경 감지 (예매 가능 → 매진 등)
- 🚫 중복 알림 방지
- 📊 SQLite 기반 데이터 저장

## 설치 및 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
TARGET_MOVIE="Avatar: Fire and Ash"
TARGET_DATE=2026-01-20
CHECK_INTERVAL_MINUTES=2
TEST_MODE=true
# TARGET_DATE는 주요 관심 날짜이며, 실제로는 모든 날짜의 스케줄을 모니터링합니다
# TEST_MODE=true로 설정하면 실제 사이트 대신 테스트 데이터를 사용합니다
```

**중요**: `TARGET_DATE`는 이제 주요 관심 날짜를 나타내며, 실제로는 **모든 날짜**의 스케줄 변경사항을 모니터링합니다.

### 3. Playwright 브라우저 설치

```bash
npx playwright install chromium
```

## 사용법

### 로컬 실행

```bash
# 빌드
npm run build

# 테스트 실행
npm run test:scraping      # 스크래핑 테스트
npm run test:notification  # Slack 알림 테스트
npm run check              # 한 번만 체크

# 지속적 모니터링 시작
npm run start
```

### GitHub Actions 자동 실행

1. GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿 추가:
   - `SLACK_WEBHOOK_URL`: Slack 웹훅 URL

2. 워크플로우가 매 15분마다 자동 실행됩니다.

## 프로젝트 구조

```
src/
├── types.ts        # 타입 정의
├── database.ts     # SQLite 데이터베이스 관리
├── scraper.ts      # IMAX 사이트 스크래핑
├── slack.ts        # Slack 알림 전송
├── diff.ts         # 스케줄 변경 감지
├── monitor.ts      # 메인 모니터링 로직
└── index.ts        # 진입점
```

## 알림 예시

새로운 스케줄이 발견되면 다음과 같은 Slack 메시지가 전송됩니다:

```
🎬 새로운 IMAX 상영 스케줄 발견!

영화: Avatar: Fire and Ash
극장: CGV 용산 아이파크몰 IMAX  
📅 상영일: 2026-01-20
🕐 상영시간: 19:30
상태: ✅ 예매 가능
예매 링크: https://www.cgv.co.kr/ticket/...

감지 시각: 2026-01-12 14:30:00
```

**주요 변경사항**: 이제 1월 20일뿐만 아니라 **모든 날짜**의 새로운 스케줄이나 시간대 변경사항을 감지하여 알림을 보냅니다.

## 주의사항

- 사이트 구조 변경 시 스크래핑 로직 수정이 필요할 수 있습니다
- 과도한 요청으로 인한 차단을 방지하기 위해 적절한 간격을 유지하세요
- GitHub Actions의 무료 사용량 제한을 고려하세요

## 문제 해결

### 스크래핑이 작동하지 않는 경우

1. `debug-page.png` 스크린샷을 확인하여 페이지 로딩 상태 점검
2. 사이트 구조 변경 여부 확인
3. 네트워크 연결 및 사이트 접근성 확인

### Slack 알림이 오지 않는 경우

1. 웹훅 URL이 올바른지 확인
2. `npm run test:notification` 명령으로 테스트
3. Slack 채널 권한 확인

## 라이선스

MIT License