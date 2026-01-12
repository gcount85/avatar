const { chromium } = require("playwright");

async function scrapeAvatarSchedule() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log("📱 새로운 CGV 사이트로 접속 중...");
    await page.goto("https://cgv.co.kr/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    console.log("🎬 아바타: 불과 재 영화 찾기...");

    // 영화 제목 클릭
    const avatarLink = await page.locator("text=아바타").first();
    if (await avatarLink.isVisible()) {
      console.log("✅ 아바타 발견! 클릭 중...");
      await avatarLink.click();
      await page.waitForTimeout(3000);
    }

    // 예매하기 버튼 찾기
    const bookingButton = await page.locator("text=예매하기").first();
    if (await bookingButton.isVisible()) {
      console.log("✅ 예매하기 버튼 클릭...");
      await bookingButton.click();
      await page.waitForTimeout(5000);
    }

    // 현재 페이지의 URL과 타이틀 확인
    console.log("📄 현재 페이지:", page.url());
    console.log("📋 페이지 제목:", await page.title());

    // 스크린샷 저장
    await page.screenshot({ path: "test-screenshot.png", fullPage: true });
    console.log("📸 스크린샷 저장됨: test-screenshot.png");

    // 극장 선택 - 용산 아이파크몰 찾기
    console.log("\n🏢 극장 찾기...");
    const theaterButtons = await page.locator("button, a, div").all();

    for (const button of theaterButtons) {
      const text = await button.textContent().catch(() => "");
      if (text && (text.includes("용산") || text.includes("아이파크"))) {
        console.log("🎯 용산 아이파크몰 발견:", text.trim());
      }
    }

    // IMAX 관 찾기
    console.log("\n🎥 IMAX 관 찾기...");
    const imaxElements = await page.locator("text=/IMAX/i").all();
    console.log(`발견된 IMAX 요소 수: ${imaxElements.length}`);

    for (let i = 0; i < Math.min(imaxElements.length, 5); i++) {
      const elem = imaxElements[i];
      const text = await elem.textContent();
      console.log(`  ${i + 1}. ${text}`);
    }

    // 시간표 찾기
    console.log("\n⏰ 상영 시간표 찾기...");
    const timePattern = /\d{1,2}:\d{2}/g;
    const bodyText = await page.textContent("body");
    const times = bodyText.match(timePattern);

    if (times) {
      const uniqueTimes = [...new Set(times)];
      console.log(`발견된 시간: ${uniqueTimes.slice(0, 20).join(", ")}`);
    }

    // 페이지 내용 분석
    console.log("\n📊 페이지 분석...");
    const pageContent = await page.content();

    // 날짜 찾기
    const datePattern = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}|\d+월\s*\d+일/g;
    const dates = pageContent.match(datePattern);
    if (dates) {
      console.log("발견된 날짜:", [...new Set(dates)].slice(0, 10).join(", "));
    }

    // 20초 대기 (수동으로 확인할 수 있도록)
    console.log("\n⏳ 20초 대기 중... (브라우저에서 확인하세요)");
    await page.waitForTimeout(20000);
  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
    await page.screenshot({ path: "error-screenshot.png", fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeAvatarSchedule();
