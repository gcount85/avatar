const { chromium } = require("playwright");

async function findAvatarShowtimes() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // 느리게 실행하여 관찰
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  try {
    console.log("\n🎯 1단계: CGV 메인 페이지 접속");
    await page.goto("https://cgv.co.kr/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    console.log("\n🎯 2단계: 빠른 예매 버튼 찾기");
    // 티켓 또는 빠른 예매 버튼 클릭
    try {
      await page.click("text=티켓", { timeout: 5000 });
      console.log("✅ 티켓 버튼 클릭 성공");
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log("ℹ️  티켓 버튼을 찾을 수 없음, 영화 선택으로 이동");
    }

    console.log("\n🎯 3단계: 아바타 영화 선택");
    console.log("현재 URL:", page.url());

    // Network 요청 감지
    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("api") ||
        url.includes("schedule") ||
        url.includes("showtime")
      ) {
        console.log("📡 API 호출 감지:", url);
        try {
          const json = await response.json();
          console.log(
            "📄 응답 데이터:",
            JSON.stringify(json, null, 2).substring(0, 500)
          );
        } catch (e) {
          // JSON이 아닌 경우 무시
        }
      }
    });

    // 페이지에서 영화 리스트 찾기
    await page.waitForTimeout(2000);

    // 아바타 영화 카드 찾기
    const avatarMovie = await page
      .locator("text=/아바타.*불과.*재|Avatar.*Fire.*Ash/i")
      .first();

    if (await avatarMovie.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("✅ 아바타 영화 발견!");
      await avatarMovie.click();
      await page.waitForTimeout(3000);
    }

    console.log("\n🎯 4단계: 극장 선택 (용산 아이파크몰 IMAX)");
    console.log("현재 URL:", page.url());

    // 모든 텍스트에서 극장명 찾기
    const bodyText = await page.textContent("body");
    const hasYongsan = bodyText.includes("용산");
    const hasIPark = bodyText.includes("아이파크");
    const hasIMAX = bodyText.includes("IMAX");

    console.log(
      `극장 정보 확인: 용산=${hasYongsan}, 아이파크=${hasIPark}, IMAX=${hasIMAX}`
    );

    // 용산 아이파크몰 찾기
    try {
      const yongsanTheater = await page
        .locator("text=/용산.*아이파크|아이파크.*용산/i")
        .first();
      if (
        await yongsanTheater.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        console.log("✅ 용산 아이파크몰 극장 발견!");
        await yongsanTheater.click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log("ℹ️  극장 선택 단계를 찾을 수 없음");
    }

    // IMAX 관 선택
    try {
      const imaxButton = await page.locator("text=IMAX").first();
      if (await imaxButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("✅ IMAX 버튼 발견!");
        await imaxButton.click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log("ℹ️  IMAX 버튼을 찾을 수 없음");
    }

    console.log("\n🎯 5단계: 상영 시간표 추출");
    console.log("현재 URL:", page.url());

    // 모든 시간 정보 추출
    const timeElements = await page.locator("text=/\\d{1,2}:\\d{2}/").all();
    console.log(`\n⏰ 발견된 시간 요소: ${timeElements.length}개`);

    const showtimes = [];
    for (let i = 0; i < Math.min(timeElements.length, 30); i++) {
      const text = await timeElements[i].textContent();
      console.log(`  ${i + 1}. ${text}`);
      showtimes.push(text.trim());
    }

    // 날짜 정보 추출
    console.log("\n📅 날짜 정보 찾기:");
    const dateElements = await page
      .locator("text=/\\d+일|\\d{2}\\/\\d{2}|\\d{4}-\\d{2}-\\d{2}/")
      .all();
    const dates = [];
    for (let i = 0; i < Math.min(dateElements.length, 20); i++) {
      const text = await dateElements[i].textContent();
      if (text.trim().length < 20) {
        // 너무 긴 텍스트 제외
        console.log(`  ${i + 1}. ${text.trim()}`);
        dates.push(text.trim());
      }
    }

    // 최종 스크린샷
    await page.screenshot({ path: "final-schedule.png", fullPage: true });
    console.log("\n📸 최종 스크린샷 저장: final-schedule.png");

    // 결과 요약
    console.log("\n📊 === 결과 요약 ===");
    console.log(`발견된 날짜: ${[...new Set(dates)].slice(0, 10).join(", ")}`);
    console.log(
      `발견된 시간: ${[...new Set(showtimes)].slice(0, 15).join(", ")}`
    );

    // 30초 대기 (수동 확인)
    console.log("\n⏳ 30초 대기 중... (수동으로 페이지를 확인하세요)");
    await page.waitForTimeout(30000);
  } catch (error) {
    console.error("\n❌ 에러 발생:", error.message);
    console.error("스택:", error.stack);
    await page.screenshot({ path: "error-final.png", fullPage: true });
    console.log("📸 에러 스크린샷 저장: error-final.png");
  } finally {
    await browser.close();
    console.log("\n✅ 브라우저 종료");
  }
}

findAvatarShowtimes().catch(console.error);
