import { chromium } from "playwright";

async function extractDetailedSchedule() {
  console.log(
    "🎬 Starting detailed Avatar: Fire and Ash schedule extraction..."
  );

  const browser = await chromium.launch({
    headless: false, // 브라우저 창을 보여줌
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // 한국어 설정 및 User-Agent
  await page.setExtraHTTPHeaders({
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  try {
    const url =
      "https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax";
    console.log(`🔗 Loading: ${url}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // 페이지 로딩 대기
    console.log("⏳ Waiting for page to fully load...");
    await page.waitForTimeout(10000);

    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Avatar 영화 찾기
    console.log("🔍 Looking for Avatar: Fire and Ash...");

    // 영화 제목 요소 찾기
    const movieElements = await page.$$eval("*", (elements) => {
      return elements
        .filter((el) => {
          const text = el.textContent || "";
          return (
            text.includes("Avatar: Fire and Ash") || text.includes("아바타")
          );
        })
        .map((el) => ({
          text: (el.textContent || "").trim(),
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          innerHTML: el.innerHTML,
        }));
    });

    if (movieElements.length > 0) {
      console.log(`🎬 Found ${movieElements.length} Avatar-related elements:`);
      movieElements.forEach((elem, i) => {
        console.log(
          `   ${i + 1}. [${elem.tagName}] ${elem.text.substring(0, 200)}...`
        );
      });
    }

    // 캘린더/날짜 요소 찾기
    console.log("\n📅 Looking for calendar/date elements...");
    const dateSelectors = [
      '[class*="calendar"]',
      '[class*="date"]',
      '[class*="day"]',
      "[data-date]",
      ".date-picker",
      ".calendar-day",
      '[class*="showtime"]',
      '[class*="schedule"]',
    ];

    for (const selector of dateSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(
            `📋 Found ${elements.length} elements with selector: ${selector}`
          );

          for (let i = 0; i < Math.min(elements.length, 5); i++) {
            const text = await elements[i].textContent();
            if (text && text.trim().length > 0) {
              console.log(`   ${i + 1}. ${text.trim()}`);
            }
          }
        }
      } catch (error) {
        // 선택자가 유효하지 않을 수 있음
      }
    }

    // 숫자 패턴으로 날짜 찾기 (12, 13, 14, 15, 16, 17, 18, 19)
    console.log("\n🔢 Looking for date numbers (12-19)...");
    const pageText = await page.textContent("body");
    if (pageText) {
      const dateNumbers = ["12", "13", "14", "15", "16", "17", "18", "19"];
      const foundDates: string[] = [];

      dateNumbers.forEach((date) => {
        // 다양한 날짜 패턴 검색
        const patterns = [
          new RegExp(`1월\\s*${date}일`, "gi"),
          new RegExp(`January\\s*${date}`, "gi"),
          new RegExp(`${date}\\s*일`, "gi"),
          new RegExp(`\\b${date}\\b`, "g"),
        ];

        patterns.forEach((pattern) => {
          const matches = pageText.match(pattern);
          if (matches) {
            foundDates.push(`${date}일: ${matches.length}개 매치`);
          }
        });
      });

      if (foundDates.length > 0) {
        console.log("📅 Found date patterns:");
        foundDates.forEach((date) => console.log(`   - ${date}`));
      }
    }

    // 시간 패턴 찾기
    console.log("\n⏰ Looking for time patterns...");
    if (pageText) {
      const timePatterns = [
        /\d{1,2}:\d{2}/g, // HH:MM
        /오전\s*\d{1,2}:\d{2}/g, // 오전 HH:MM
        /오후\s*\d{1,2}:\d{2}/g, // 오후 HH:MM
        /\d{1,2}시\s*\d{2}분/g, // HH시 MM분
      ];

      timePatterns.forEach((pattern, i) => {
        const matches = pageText.match(pattern);
        if (matches) {
          console.log(
            `⏰ Time pattern ${i + 1}: ${matches.slice(0, 10).join(", ")}`
          );
        }
      });
    }

    // 상세 DOM 구조 분석
    console.log("\n🔍 Analyzing detailed DOM structure...");

    // 모든 클릭 가능한 요소들 찾기
    const clickableElements = await page.$$eval(
      'button, a, [onclick], [class*="click"], [class*="btn"]',
      (elements) => {
        return elements
          .map((el) => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            text: (el.textContent || "").trim().substring(0, 100),
            href: el.getAttribute("href"),
            onclick: el.getAttribute("onclick"),
          }))
          .filter((el) => el.text.length > 0)
          .slice(0, 20); // 처음 20개만
      }
    );

    if (clickableElements.length > 0) {
      console.log("🖱️ Found clickable elements:");
      clickableElements.forEach((elem, i) => {
        console.log(`   ${i + 1}. [${elem.tagName}] ${elem.text}`);
        if (elem.href) console.log(`      href: ${elem.href}`);
      });
    }

    // 스크린샷 저장
    await page.screenshot({
      path: "detailed-avatar-schedule.png",
      fullPage: true,
    });
    console.log("📸 Detailed screenshot saved as detailed-avatar-schedule.png");

    // 페이지에서 직접 JavaScript 실행하여 더 자세한 정보 추출
    console.log("\n🔧 Executing JavaScript to extract schedule data...");

    const scheduleData = await page.evaluate(() => {
      const results: any[] = [];

      // 모든 텍스트 노드에서 Avatar 관련 정보 찾기
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent || "";
        if (
          text.includes("Avatar") ||
          text.includes("Fire and Ash") ||
          text.includes("아바타") ||
          text.includes("불과 재")
        ) {
          results.push({
            type: "text",
            content: text.trim(),
            parent: node.parentElement?.tagName,
            parentClass: node.parentElement?.className,
          });
        }
      }

      // 날짜/시간이 포함된 요소들 찾기
      const timeElements = Array.from(document.querySelectorAll("*")).filter(
        (el) => {
          const text = el.textContent || "";
          return /\d{1,2}:\d{2}|오전|오후|\d{1,2}일/.test(text);
        }
      );

      timeElements.forEach((el) => {
        results.push({
          type: "time",
          content: (el.textContent || "").trim(),
          tagName: el.tagName,
          className: el.className,
        });
      });

      return results.slice(0, 50); // 처음 50개만
    });

    if (scheduleData.length > 0) {
      console.log("📊 Extracted schedule data:");
      scheduleData.forEach((data, i) => {
        console.log(
          `   ${i + 1}. [${data.type}] ${data.content.substring(0, 150)}`
        );
      });
    }

    // 특정 날짜 클릭 시도 (만약 캘린더가 있다면)
    console.log("\n📅 Attempting to interact with calendar...");

    try {
      // 날짜 버튼들 찾기
      const dateButtons = await page.$$(
        '[class*="date"], [class*="day"], button'
      );
      console.log(`Found ${dateButtons.length} potential date buttons`);

      for (let i = 0; i < Math.min(dateButtons.length, 10); i++) {
        const text = await dateButtons[i].textContent();
        if (text && /\d{1,2}/.test(text.trim())) {
          console.log(`   Date button ${i + 1}: "${text.trim()}"`);
        }
      }
    } catch (error) {
      console.log("No interactive calendar found");
    }
  } catch (error) {
    console.error("❌ Error during detailed extraction:", error);
  } finally {
    await browser.close();
    console.log("\n✅ Detailed schedule extraction completed!");
  }
}

extractDetailedSchedule().catch(console.error);
