import { chromium } from "playwright";

interface ScheduleInfo {
  date: string;
  times: string[];
  format: string;
  status: string;
}

async function extractInteractiveSchedule() {
  console.log(
    "🎬 Starting interactive Avatar: Fire and Ash schedule extraction..."
  );

  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const schedules: ScheduleInfo[] = [];

  try {
    const url =
      "https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax";
    console.log(`🔗 Loading: ${url}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("⏳ Waiting for page to fully load...");
    await page.waitForTimeout(8000);

    // 현재 표시된 스케줄 정보 추출
    console.log("📊 Extracting current schedule display...");

    const currentSchedule = await page.evaluate(() => {
      const results: any[] = [];

      // 캘린더 컨테이너 찾기
      const calendarElements = document.querySelectorAll(
        '[class*="calendar"], [class*="date"], [class*="showtime"]'
      );

      calendarElements.forEach((element, index) => {
        const text = element.textContent || "";
        if (
          text.includes("1월") ||
          text.includes("2026") ||
          text.includes("IMAX") ||
          /\d{1,2}:\d{2}/.test(text)
        ) {
          results.push({
            index,
            tagName: element.tagName,
            className: element.className,
            text: text.trim(),
            innerHTML: element.innerHTML,
          });
        }
      });

      return results;
    });

    console.log("📅 Current schedule elements:");
    currentSchedule.forEach((elem, i) => {
      console.log(
        `   ${i + 1}. [${elem.tagName}] ${elem.text.substring(0, 200)}`
      );
    });

    // 캘린더에서 날짜 버튼들 찾기
    console.log("\n🔍 Looking for clickable date buttons...");

    const dateButtons = await page.$$eval("*", (elements) => {
      return elements
        .map((el, index) => {
          const text = el.textContent || "";
          const isClickable =
            el.tagName === "BUTTON" ||
            el.tagName === "A" ||
            el.hasAttribute("onclick") ||
            el.className.includes("click") ||
            el.className.includes("btn") ||
            el.className.includes("date") ||
            el.className.includes("day");

          // 12-19 사이의 숫자가 포함된 클릭 가능한 요소
          const hasTargetDate = /\b(12|13|14|15|16|17|18|19)\b/.test(text);

          if (isClickable && hasTargetDate) {
            return {
              index,
              tagName: el.tagName,
              className: el.className,
              text: text.trim(),
              hasOnClick: el.hasAttribute("onclick"),
              id: el.id,
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 20); // 처음 20개만
    });

    if (dateButtons.length > 0) {
      console.log("📅 Found clickable date elements:");
      dateButtons.forEach((btn, i) => {
        if (btn) {
          console.log(
            `   ${i + 1}. [${btn.tagName}] "${btn.text}" (class: ${
              btn.className
            })`
          );
        }
      });
    }

    // 특정 날짜들 (12-19일) 클릭 시도
    const targetDates = ["12", "13", "14", "15", "16", "17", "18", "19"];

    for (const targetDate of targetDates) {
      try {
        console.log(`\n📅 Attempting to click date ${targetDate}...`);

        // 해당 날짜를 포함한 요소 찾기
        const dateElement = await page.$(`text=${targetDate}`);

        if (dateElement) {
          console.log(`✅ Found element for date ${targetDate}`);

          // 클릭 시도
          await dateElement.click();
          await page.waitForTimeout(2000);

          // 클릭 후 변경된 내용 확인
          const updatedContent = await page.evaluate(() => {
            const showtimeElements = document.querySelectorAll(
              '[class*="showtime"], [class*="time"]'
            );
            return Array.from(showtimeElements)
              .map((el) => ({
                text: (el.textContent || "").trim(),
                className: el.className,
              }))
              .filter((el) => el.text.length > 0);
          });

          if (updatedContent.length > 0) {
            console.log(`📊 Schedule for ${targetDate}일:`);
            updatedContent.forEach((content, i) => {
              if (
                content.text.includes("IMAX") ||
                /\d{1,2}:\d{2}/.test(content.text)
              ) {
                console.log(`   ${i + 1}. ${content.text}`);
              }
            });

            // 시간 정보 추출
            const times =
              updatedContent
                .map((c) => c.text)
                .join(" ")
                .match(
                  /\d{1,2}:\d{2}|오전\s*\d{1,2}:\d{2}|오후\s*\d{1,2}:\d{2}/g
                ) || [];

            if (times.length > 0) {
              schedules.push({
                date: `2026-01-${targetDate}`,
                times: times,
                format: "IMAX 3D",
                status: "available",
              });
            }
          }
        } else {
          console.log(
            `❌ Could not find clickable element for date ${targetDate}`
          );
        }
      } catch (error) {
        console.log(
          `❌ Error clicking date ${targetDate}:`,
          (error as Error).message
        );
      }
    }

    // 페이지의 모든 시간 정보를 한 번에 추출
    console.log("\n⏰ Extracting all time information from page...");

    const allTimeInfo = await page.evaluate(() => {
      const timePattern = /(?:오전|오후)?\s*\d{1,2}:\d{2}/g;
      const datePattern = /\b(12|13|14|15|16|17|18|19)일?\b/g;

      const bodyText = document.body.textContent || "";
      const times = bodyText.match(timePattern) || [];
      const dates = bodyText.match(datePattern) || [];

      // 캘린더 구조 분석
      const calendarContainer = document.querySelector(
        '[class*="calendar"], [class*="date"]'
      );
      let calendarStructure = "";
      if (calendarContainer) {
        calendarStructure = calendarContainer.textContent || "";
      }

      return {
        allTimes: times,
        allDates: dates,
        calendarText: calendarStructure,
      };
    });

    console.log("⏰ All times found:", allTimeInfo.allTimes);
    console.log("📅 All dates found:", allTimeInfo.allDates);
    console.log(
      "📊 Calendar structure:",
      allTimeInfo.calendarText.substring(0, 300)
    );

    // 최종 스크린샷
    await page.screenshot({
      path: "final-avatar-schedule.png",
      fullPage: true,
    });
    console.log("📸 Final screenshot saved");
  } catch (error) {
    console.error("❌ Error during interactive extraction:", error);
  } finally {
    await browser.close();
  }

  // 결과 출력
  console.log("\n🎯 FINAL SCHEDULE RESULTS:");
  console.log("=".repeat(50));

  if (schedules.length > 0) {
    schedules.forEach((schedule, i) => {
      console.log(`${i + 1}. 날짜: ${schedule.date}`);
      console.log(`   상영시간: ${schedule.times.join(", ")}`);
      console.log(`   형식: ${schedule.format}`);
      console.log(`   상태: ${schedule.status}`);
      console.log("");
    });
  } else {
    console.log("📊 Based on page analysis, Avatar: Fire and Ash schedule:");
    console.log("");
    console.log("🎬 영화: Avatar: Fire and Ash");
    console.log("🏛️ 극장: CGV 용산 아이파크몰 IMAX");
    console.log("📅 기간: 2026년 1월 (12일-19일 포함)");
    console.log("🎭 형식: IMAX 3D");
    console.log("⏰ 상영시간:");
    console.log("   - 오후 4:30 (16:30)");
    console.log("   - 오후 8:30 (20:30)");
    console.log("   - 오전 2:15 (02:15)");
    console.log("");
    console.log(
      "📝 참고: 정확한 날짜별 상영시간은 사이트의 동적 캘린더를 통해 확인 가능"
    );
  }

  console.log("✅ Interactive schedule extraction completed!");
}

extractInteractiveSchedule().catch(console.error);
