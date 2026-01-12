const { chromium } = require('playwright');

async function scrapeImaxSchedule() {
  console.log('🚀 IMAX 스케줄 스크래핑 시작\n');

  const browser = await chromium.launch({
    headless: false,  // 브라우저 창 보이기
    slowMo: 500       // 동작을 천천히
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    const url = 'https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax';
    console.log(`📍 접속: ${url}\n`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ 페이지 로드 완료\n');

    // 캘린더 로딩 대기
    await page.waitForTimeout(5000);

    // 현재 날짜 확인
    const currentDate = await page.locator('input[readonly][value*="월"]').first().inputValue().catch(() => '');
    console.log(`📅 현재 선택: ${currentDate}\n`);

    // 사용 가능한 날짜 버튼 찾기
    const dateButtons = await page.locator('button.MuiPickersDay-root:not(.Mui-disabled)').all();
    console.log(`📅 예매 가능 날짜: ${dateButtons.length}개\n`);

    const allScreenings = [];

    // 각 날짜 클릭하며 상영 시간 수집
    for (let i = 0; i < Math.min(dateButtons.length, 7); i++) {  // 최대 7일
      try {
        const button = dateButtons[i];
        const dayNum = await button.textContent();
        const timestamp = await button.getAttribute('data-timestamp');
        
        if (!dayNum || !timestamp) continue;

        const date = new Date(parseInt(timestamp));
        const dateStr = date.toISOString().split('T')[0];

        console.log(`\n📅 ${dateStr} (${dayNum}일) 처리 중...`);

        // 날짜 클릭
        await button.click();
        await page.waitForTimeout(2000);

        // 상영 시간 추출
        const showtimes = await page.locator('.showtime-tabs_time__McuGP').allTextContents();
        
        console.log(`   발견된 상영 시간: ${showtimes.length}개`);
        showtimes.forEach((time, idx) => {
          console.log(`   ${idx + 1}. ${time}`);
        });

        // 영화 포맷 (IMAX 3D 등)
        const format = await page.locator('.movie-variant-label_movieVariantLabel__zacJr').first().textContent().catch(() => 'IMAX');
        
        // 데이터 저장
        for (const timeText of showtimes) {
          const time24 = convertTo24Hour(timeText.trim());
          allScreenings.push({
            date: dateStr,
            time: time24,
            timeDisplay: timeText.trim(),
            format: format.trim(),
            theater: 'CGV 용산 아이파크몰 IMAX'
          });
        }

      } catch (error) {
        console.error(`   ❌ 오류:`, error.message);
      }
    }

    // 최종 결과 출력
    console.log('\n\n📊 ===== 최종 결과 =====\n');
    console.log(`총 ${allScreenings.length}개의 상영 스케줄 발견\n`);

    // 날짜별로 그룹화하여 출력
    const byDate = {};
    allScreenings.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    });

    Object.keys(byDate).sort().forEach(date => {
      console.log(`\n📅 ${date}`);
      byDate[date].forEach(s => {
        console.log(`   🎬 ${s.timeDisplay} (${s.time}) - ${s.format}`);
      });
    });

    // JSON 파일로 저장
    const fs = require('fs');
    fs.writeFileSync('imax-schedule-result.json', JSON.stringify(allScreenings, null, 2), 'utf-8');
    console.log('\n💾 결과 저장: imax-schedule-result.json');

    // 스크린샷
    await page.screenshot({ path: 'imax-final.png', fullPage: true });
    console.log('📸 스크린샷 저장: imax-final.png');

    // 확인을 위해 10초 대기
    console.log('\n⏳ 10초 대기 중...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);
    await page.screenshot({ path: 'error-imax.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ 완료!');
  }
}

// 한국어 시간을 24시간 형식으로 변환
function convertTo24Hour(koreanTime) {
  const match = koreanTime.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
  if (!match) return '00:00';

  const [, period, hourStr, minute] = match;
  let hour = parseInt(hourStr);

  if (period === '오후' && hour !== 12) {
    hour += 12;
  } else if (period === '오전' && hour === 12) {
    hour = 0;
  }

  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

scrapeImaxSchedule();
