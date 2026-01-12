import { chromium } from "playwright";

async function testRealScraping() {
  console.log("🚀 Starting comprehensive site analysis...");

  const browser = await chromium.launch({
    headless: false, // 브라우저 창을 보여줌
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // 한국어 설정
  await page.setExtraHTTPHeaders({
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const sitesToTest = [
    {
      name: "CGV 용산아이파크몰 극장별 예매",
      url: "https://cgv.co.kr/cnm/movieBook/cinema",
      waitTime: 5000,
    },
    {
      name: "IMAX 공식 사이트",
      url: "https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax",
      waitTime: 10000,
    },
  ];

  for (const site of sitesToTest) {
    try {
      console.log(`\n🔍 Testing ${site.name}: ${site.url}`);

      await page.goto(site.url, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });

      await page.waitForTimeout(site.waitTime);

      const title = await page.title();
      console.log(`📄 Title: ${title}`);

      const currentUrl = page.url();
      console.log(`🔗 Final URL: ${currentUrl}`);

      // 페이지 텍스트 분석
      const pageText = await page.textContent("body");
      if (pageText) {
        console.log(`📊 Page length: ${pageText.length} characters`);
        console.log(
          `🎬 Contains "Avatar": ${
            pageText.includes("Avatar") || pageText.includes("아바타")
          }`
        );
        console.log(
          `🎬 Contains "Fire and Ash": ${
            pageText.includes("Fire and Ash") || pageText.includes("불과 재")
          }`
        );
        console.log(
          `🎭 Contains "IMAX": ${
            pageText.includes("IMAX") || pageText.includes("아이맥스")
          }`
        );

        // Avatar 관련 텍스트 찾기
        const avatarMatches =
          pageText.match(
            /[^\n]*(?:Avatar|아바타|Fire and Ash|불과 재)[^\n]*/gi
          ) || [];
        if (avatarMatches.length > 0) {
          console.log(`🎬 Found ${avatarMatches.length} Avatar-related lines:`);
          avatarMatches.slice(0, 3).forEach((match, i) => {
            console.log(`   ${i + 1}. ${match.trim()}`);
          });
        }

        // 영화 관련 요소들 찾기
        const movieSelectors = [
          ".movie-list",
          ".movie-item",
          '[class*="movie"]',
          ".title",
          "h1, h2, h3",
          ".list-item",
        ];

        for (const selector of movieSelectors) {
          try {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
              console.log(
                `📋 Found ${elements.length} elements with selector: ${selector}`
              );

              // 처음 몇 개 요소의 텍스트 확인
              for (let i = 0; i < Math.min(elements.length, 3); i++) {
                const text = await elements[i].textContent();
                if (
                  text &&
                  text.trim().length > 0 &&
                  text.trim().length < 200
                ) {
                  console.log(`   ${i + 1}. ${text.trim()}`);
                }
              }
            }
          } catch (error) {
            // 선택자가 유효하지 않을 수 있음
          }
        }
      }

      // 스크린샷 저장
      await page.screenshot({
        path: `debug-${site.name.replace(/\s+/g, "-")}.png`,
        fullPage: true,
      });
      console.log(
        `📸 Screenshot saved as debug-${site.name.replace(/\s+/g, "-")}.png`
      );
    } catch (error) {
      console.log(`❌ Failed to load ${site.name}:`, (error as Error).message);
    }
  }

  // 네이버 영화에서 Avatar 검색 시도
  try {
    console.log("\n🔍 Trying to search for Avatar on Naver Movies...");
    await page.goto("https://movie.naver.com", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    // 검색창 찾기
    const searchInput = await page.$(
      'input[placeholder*="영화"], input[name*="search"], #query'
    );
    if (searchInput) {
      console.log("✅ Found search input");
      await searchInput.type("아바타");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(5000);

      const searchResults = await page.textContent("body");
      if (searchResults) {
        const avatarMatches =
          searchResults.match(/[^\n]*(?:아바타|Avatar)[^\n]*/gi) || [];
        console.log(
          `🔍 Search results: Found ${avatarMatches.length} Avatar-related results`
        );
        avatarMatches.slice(0, 5).forEach((match, i) => {
          console.log(`   ${i + 1}. ${match.trim()}`);
        });
      }

      await page.screenshot({ path: "debug-naver-search.png", fullPage: true });
    }
  } catch (error) {
    console.log("❌ Naver search failed:", (error as Error).message);
  }

  await browser.close();
  console.log("\n✅ Site analysis completed!");
}

testRealScraping().catch(console.error);
