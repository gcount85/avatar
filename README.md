# IMAX Schedule Monitor

CGV 용산 아이파크몰 IMAX에서 "Avatar: Fire and Ash" 영화의 스케줄을 모니터링하고 Slack으로 알림을 보내는 시스템입니다.

## 기능

- 🎬 **IMAX 공식 사이트**에서 실시간 상영 스케줄 자동 스크래핑
- 📅 **1월 12일~19일** 전체 상영 시간표 모니터링 (약 29개 상영)
- 🔔 Slack 웹훅을 통한 실시간 알림
- 🔄 상영 상태 변경 감지 (예매 가능 → 매진 등)
- 🚫 중복 알림 방지 (이미 알린 상영은 재알림 안 함)
- 📊 SQLite 기반 스냅샷 저장 및 Diff 감지
- 💾 GitHub Actions 캐시로 실행 간 데이터 유지

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
TEST_MODE=false
# TARGET_DATE는 주요 관심 날짜이며, 실제로는 예매 가능한 모든 날짜를 모니터링합니다
# TEST_MODE=true: 실제 스크래핑 대신 더미 데이터 사용 (개발/테스트용)
# TEST_MODE=false: IMAX 공식 사이트에서 실시간 스크래핑 (운영용)
```

**작동 방식**:
- IMAX 공식 사이트 (https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax)에서 실시간 스크래핑
- 현재 예매 가능한 모든 날짜의 상영 시간표를 가져옴 (2026년 1월 12일~19일)
- 이전 스냅샷과 비교하여 **새로 추가된 상영**이나 **상태 변경**만 알림

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

2. 워크플로우가 **매 15분마다** 자동 실행됩니다.

3. **데이터 유지**: GitHub Actions 캐시를 사용하여 `screenings.db`를 실행 간 유지
   - 이전 스냅샷과 비교하여 변경사항만 알림
   - 커밋 히스토리를 오염시키지 않음
   - 캐시는 7일간 유지되며 자동 갱신됨

## 프로젝트 구조

```
src/
├── types.ts        # 타입 정의 (Screening, ScreeningSnapshot 등)
├── database.ts     # SQLite 데이터베이스 관리 (snapshots, notifications)
├── scraper.ts      # IMAX 공식 사이트 스크래핑 (Playwright 사용)
├── slack.ts        # Slack 알림 전송 (웹훅)
├── diff.ts         # 스케줄 변경 감지 (added, statusChanged)
├── monitor.ts      # 메인 모니터링 로직
├── test-mode.ts    # 테스트용 더미 데이터
└── index.ts        # 진입점

screenings.db       # SQLite 데이터베이스 (스냅샷 및 알림 기록)
.github/workflows/
└── monitor.yml     # GitHub Actions 워크플로우 (15분마다 실행)
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

**알림 조건**:
- 처음 발견된 상영 시간 (new_screening)
- 예매 상태 변경 (status_change: 예매 가능 ↔ 매진)
- 동일한 상영에 대해서는 한 번만 알림 (중복 방지)

**모니터링 범위**: 2026년 1월 12일~19일의 모든 상영 시간 (약 29개)

## 기술 스택

- **스크래핑**: Playwright (Chromium 브라우저 자동화)
- **데이터베이스**: better-sqlite3 (로컬 SQLite)
- **알림**: Slack Webhook API
- **스케줄링**: GitHub Actions (cron)
- **언어**: TypeScript, Node.js

## 주의사항

- IMAX 공식 사이트 DOM 구조 변경 시 스크래핑 로직 수정 필요
- GitHub Actions 무료 플랜: 월 2,000분 제한 (15분 간격 = 월 약 100분 사용)
- 과도한 스크래핑 방지를 위해 최소 15분 간격 권장
- screenings.db는 로컬에서만 생성되며, GitHub에는 커밋되지 않음 (.gitignore)

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