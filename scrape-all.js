const { chromium } = require("playwright");

async function scrapeAll() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log("🎬 IMAX 아바타 상영 스케줄 수집 시작\n");

    await page.goto(
      "https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax",
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    console.log("✅ 페이지 로드 완료, 대기 중...\n");
    await page.waitForTimeout(10000);

    const dateButtons = await page
      .locator("button.MuiPickersDay-root:not(.Mui-disabled)")
      .all();

    if (dateButtons.length === 0) {
      console.log("❌ 날짜 버튼을 찾을 수 없습니다.");
      return;
    }

    console.log(`📅 총 ${dateButtons.length}개 날짜 발견\n`);

    for (let i = 0; i < dateButtons.length; i++) {
      const btn = dateButtons[i];
      const day = await btn.textContent();
      const ts = await btn.getAttribute("data-timestamp");

      if (!ts) continue;

      const date = new Date(parseInt(ts));
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][
        date.getDay()
      ];

      await btn.click();
      await page.waitForTimeout(2000);

      const times = await page
        .locator(".showtime-tabs_time__McuGP")
        .allTextContents();

      console.log(`\n📅 ${dateStr} (${day.trim()}일 ${dayOfWeek}요일)`);
      console.log("─".repeat(50));

      if (times.length > 0) {
        times.forEach((t) => console.log(`  🎬 ${t}`));
      } else {
        console.log("  상영 없음");
      }
    }

    console.log("\n✅ 스크래핑 완료!");
  } catch (error) {
    console.error("❌ 오류:", error.message);
  } finally {
    await browser.close();
  }
}

scrapeAll();
