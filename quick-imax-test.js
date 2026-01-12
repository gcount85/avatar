const { chromium } = require("playwright");

async function quickTest() {
  console.log("🎬 빠른 IMAX 스케줄 확인\n");

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(
      "https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax"
    );
    console.log("✅ 페이지 접속\n");

    // 페이지 로딩 대기
    await page.waitForTimeout(8000);

    // 상영 시간 직접 추출
    console.log("📊 현재 페이지의 상영 시간표:\n");

    const times = await page.$$eval(".showtime-tabs_time__McuGP", (elements) =>
      elements.map((el) => el.textContent)
    );

    const dateInput = await page
      .$eval("input[readonly]", (el) => el.value)
      .catch(() => "날짜 정보 없음");

    console.log(`📅 날짜: ${dateInput}`);
    console.log(`🎬 상영 시간 (${times.length}개):`);
    times.forEach((time, i) => {
      console.log(`  ${i + 1}. ${time}`);
    });

    // 예매 가능한 날짜 확인
    const availableDays = await page.$$eval(
      "button.MuiPickersDay-root:not(.Mui-disabled)",
      (buttons) => buttons.map((btn) => btn.textContent)
    );

    console.log(
      `\n📅 예매 가능한 날짜 (${availableDays.length}개): ${availableDays.join(
        ", "
      )}일`
    );

    // 스크린샷
    await page.screenshot({ path: "quick-test.png", fullPage: true });
    console.log("\n📸 스크린샷: quick-test.png");

    // 브라우저 열어둠 (수동 확인용)
    console.log("\n⏳ 브라우저를 30초간 열어둡니다. 직접 확인하세요!");
    await page.waitForTimeout(30000);
  } catch (error) {
    console.error("❌ 에러:", error.message);
  } finally {
    await browser.close();
    console.log("\n✅ 완료");
  }
}

quickTest();
