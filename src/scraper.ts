import { chromium, Browser, Page } from "playwright";
import { Screening } from "./types";
import { createTestSchedule } from "./test-mode";

/**
 * IMAX 공식 사이트 (https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax)
 * 에서 CGV 용산 아이파크몰 IMAX의 상영 시간표를 스크래핑합니다.
 */
export class ImaxScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();

    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });
  }

  async scrapeSchedule(
    targetMovie: string,
    targetDate: string
  ): Promise<Screening[]> {
    if (!this.page) throw new Error("Scraper not initialized");

    if (process.env.TEST_MODE === "true") {
      console.log("🧪 Running in test mode - generating mock data");
      return createTestSchedule(targetMovie, targetDate);
    }

    const screenings: Screening[] = [];

    try {
      const url =
        "https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax";
      console.log(`🔍 IMAX 공식 사이트에서 스크래핑: ${url}`);

      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      console.log("✅ 페이지 로드 완료");
      await this.page.waitForTimeout(8000);

      // 현재 선택된 날짜 확인
      const currentDateText = await this.page
        .locator("input[readonly][value*='월']")
        .first()
        .inputValue()
        .catch(() => "");

      console.log(`📅 현재 선택된 날짜: ${currentDateText}`);

      // 예매 가능한 날짜 버튼 찾기
      const dateButtons = await this.page
        .locator("button.MuiPickersDay-root:not(.Mui-disabled)")
        .all();

      console.log(`📅 예매 가능한 날짜: ${dateButtons.length}개`);

      // 각 날짜별로 상영 시간표 수집
      for (let i = 0; i < dateButtons.length; i++) {
        try {
          const dateButton = dateButtons[i];
          const dayNumber = await dateButton.textContent();
          const timestamp = await dateButton.getAttribute("data-timestamp");

          if (!dayNumber || !timestamp) continue;

          // 날짜 클릭
          await dateButton.click();
          await this.page.waitForTimeout(2000);

          // 날짜 변환
          const date = new Date(parseInt(timestamp));
          const dateStr = date.toISOString().split("T")[0];

          console.log(`\n📅 ${dateStr} (${dayNumber.trim()}일) 처리 중...`);

          // 상영 시간 추출
          const showtimeTexts = await this.page
            .locator(".showtime-tabs_time__McuGP")
            .allTextContents();

          console.log(`  발견된 상영 시간: ${showtimeTexts.length}개`);

          // 영화 포맷 추출
          const screenType =
            (await this.page
              .locator(".movie-variant-label_movieVariantLabel__zacJr")
              .first()
              .textContent()
              .catch(() => null)) || "IMAX";

          // 각 시간대별 Screening 객체 생성
          for (const timeText of showtimeTexts) {
            const time24 = this.convertTo24Hour(timeText.trim());

            const screening: Screening = {
              movieTitle: targetMovie,
              theater: "CGV 용산 아이파크몰 IMAX",
              date: dateStr,
              time: time24,
              datetime: `${dateStr}T${time24}:00+09:00`,
              status: "available",
              screenType: screenType.trim(),
            };

            screenings.push(screening);
            console.log(`  ✅ ${time24} - ${screenType}`);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.error(`  ❌ 날짜 처리 실패: ${errorMsg.substring(0, 50)}`);
        }
      }

      // 스크린샷 저장
      await this.page.screenshot({ path: "debug-page.png", fullPage: true });
      console.log("\n📸 스크린샷 저장: debug-page.png");

      console.log(
        `\n✅ 스크래핑 완료. 총 ${screenings.length}개 상영 시간표 발견`
      );

      return screenings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ 스크래핑 실패: ${errorMessage}`);

      try {
        await this.page.screenshot({ path: "debug-page.png", fullPage: true });
      } catch (e) {
        // 스크린샷 저장 실패는 무시
      }

      throw error;
    }
  }

  /**
   * 한국어 시간 형식을 24시간 형식으로 변환
   * "오후 4:30" -> "16:30"
   */
  private convertTo24Hour(koreanTime: string): string {
    const match = koreanTime.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
    if (!match) return "00:00";

    const [, period, hourStr, minute] = match;
    let hour = parseInt(hourStr);

    if (period === "오후" && hour !== 12) {
      hour += 12;
    } else if (period === "오전" && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, "0")}:${minute}`;
  }

  async testScraping(): Promise<void> {
    try {
      await this.init();
      console.log("Testing scraping functionality...");
      const screenings = await this.scrapeSchedule(
        "Avatar: Fire and Ash",
        new Date().toISOString().split("T")[0]
      );

      console.log(`\n📊 테스트 결과:`);
      console.log(`총 ${screenings.length}개의 상영 스케줄을 찾았습니다.\n`);

      const byDate = new Map<string, Screening[]>();
      for (const screening of screenings) {
        const dateScreenings = byDate.get(screening.date) || [];
        dateScreenings.push(screening);
        byDate.set(screening.date, dateScreenings);
      }

      const sortedDates = Array.from(byDate.keys()).sort();
      for (const date of sortedDates) {
        const dateScreenings = byDate.get(date)!;
        console.log(`\n📅 ${date}`);
        for (const screening of dateScreenings) {
          console.log(
            `  🎬 ${screening.time} - ${screening.screenType} (${screening.status})`
          );
        }
      }
    } finally {
      await this.close();
    }
  }

  async testNotification(): Promise<void> {
    console.log("Testing Slack notification...");
    // 이 메서드는 SlackNotifier에서 구현됨
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
