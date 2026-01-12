import { chromium, Browser, Page } from "playwright";
import { Screening } from "./types";

/**
 * IMAX 공식 사이트에서 CGV 용산 아이파크몰의 상영 시간표를 스크래핑
 */
export class ImaxOfficialScraper {
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

  /**
   * 특정 영화의 모든 상영 시간표를 가져옴
   */
  async scrapeSchedule(movieTitle: string): Promise<Screening[]> {
    if (!this.page) throw new Error("Scraper not initialized");

    const screenings: Screening[] = [];
    const url =
      "https://www.imax.com/ko/kr/theatre/cgv-yongsan-i-park-mall-imax";

    try {
      console.log(`🔍 IMAX 사이트 접속: ${url}`);
      await this.page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // 페이지 로딩 대기
      await this.page.waitForTimeout(5000);

      // 캘린더가 로드될 때까지 대기
      try {
        await this.page.waitForSelector(".showdate-calendar", { timeout: 10000 });
        console.log("✅ 캘린더 발견");
      } catch (e) {
        console.log("⚠️ 캘린더를 찾을 수 없음");
      }

      // 현재 선택된 날짜 확인
      const selectedDateText = await this.page
        .locator('input[readonly][value*="월"]')
        .first()
        .inputValue()
        .catch(() => "");
      console.log(`📅 현재 선택된 날짜: ${selectedDateText}`);

      // 사용 가능한 모든 날짜 수집
      const availableDates = await this.page.locator(
        'button.MuiPickersDay-root:not(.Mui-disabled)'
      ).all();

      console.log(`📅 예매 가능한 날짜: ${availableDates.length}개`);

      // 각 날짜별로 상영 시간표 수집
      for (let i = 0; i < availableDates.length; i++) {
        try {
          // 날짜 버튼의 정보 가져오기
          const dateButton = availableDates[i];
          const dayNumber = await dateButton.textContent();
          const timestamp = await dateButton.getAttribute("data-timestamp");
          const isSelected = await dateButton.getAttribute("aria-selected");

          if (!dayNumber || !timestamp) continue;

          console.log(
            `\n📅 날짜 처리 중: ${dayNumber}일 (timestamp: ${timestamp})`
          );

          // 이미 선택된 날짜가 아니면 클릭
          if (isSelected !== "true") {
            await dateButton.click();
            await this.page.waitForTimeout(2000); // 상영 시간표 로딩 대기
          }

          // 현재 날짜의 상영 시간표 수집
          const dailyScreenings = await this.scrapeShowtimesForDate(
            timestamp,
            dayNumber
          );
          screenings.push(...dailyScreenings);

          console.log(`  ✅ ${dailyScreenings.length}개 상영 시간 발견`);
        } catch (error) {
          console.error(`  ❌ 날짜 처리 실패:`, error);
        }
      }

      // 스크린샷 저장
      await this.page.screenshot({
        path: "imax-schedule.png",
        fullPage: true,
      });
      console.log("\n📸 스크린샷 저장: imax-schedule.png");

      return screenings;
    } catch (error) {
      console.error("❌ 스크래핑 실패:", error);
      await this.page.screenshot({
        path: "imax-error.png",
        fullPage: true,
      });
      throw error;
    }
  }

  /**
   * 특정 날짜의 상영 시간표 수집
   */
  private async scrapeShowtimesForDate(
    timestamp: string,
    dayNumber: string
  ): Promise<Screening[]> {
    if (!this.page) return [];

    const screenings: Screening[] = [];

    try {
      // 상영 시간 요소들 찾기
      const showtimeElements = await this.page
        .locator(".showtime-tabs_showtime__LW8QL")
        .all();

      // 영화 변형 (IMAX 3D 등) 찾기
      const screenType =
        (await this.page
          .locator(".movie-variant-label_movieVariantLabel__zacJr")
          .first()
          .textContent()
          .catch(() => null)) || "IMAX";

      // 날짜 계산 (timestamp를 Date로 변환)
      const date = new Date(parseInt(timestamp));
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

      for (const element of showtimeElements) {
        try {
          // 시간 텍스트 추출
          const timeText = await element
            .locator(".showtime-tabs_time__McuGP")
            .textContent();

          if (!timeText) continue;

          // "오후 4:30" 형식을 "16:30" 형식으로 변환
          const time24 = this.convertTo24Hour(timeText.trim());

          // 예매 링크 추출
          const bookingUrl = await element.getAttribute("href");

          // Screening 객체 생성
          const screening: Screening = {
            movieTitle: "Avatar: Fire and Ash", // IMAX 사이트에서는 영화 제목이 명시적으로 보이지 않을 수 있음
            theater: "CGV 용산 아이파크몰 IMAX",
            date: dateStr,
            time: time24,
            datetime: `${dateStr}T${time24}:00+09:00`,
            bookingUrl: bookingUrl
              ? `https://www.imax.com${bookingUrl}`
              : undefined,
            status: "available", // IMAX 사이트에 표시되면 예매 가능
            screenType: screenType.trim(),
          };

          screenings.push(screening);
        } catch (error) {
          console.error("    ⚠️ 상영 시간 파싱 실패:", error);
        }
      }
    } catch (error) {
      console.error("  ⚠️ 날짜별 상영 시간표 수집 실패:", error);
    }

    return screenings;
  }

  /**
   * "오후 4:30" 형식을 "16:30" 형식으로 변환
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

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// 테스트 함수
async function testImaxScraper() {
  const scraper = new ImaxOfficialScraper();

  try {
    await scraper.init();
    console.log("✅ 스크래퍼 초기화 완료\n");

    const screenings = await scraper.scrapeSchedule("Avatar: Fire and Ash");

    console.log("\n📊 === 결과 요약 ===");
    console.log(`총 ${screenings.length}개의 상영 스케줄 발견\n`);

    // 날짜별로 그룹화
    const byDate = new Map<string, Screening[]>();
    for (const screening of screenings) {
      const dateScreenings = byDate.get(screening.date) || [];
      dateScreenings.push(screening);
      byDate.set(screening.date, dateScreenings);
    }

    // 날짜별로 출력
    const sortedDates = Array.from(byDate.keys()).sort();
    for (const date of sortedDates) {
      const dateScreenings = byDate.get(date)!;
      console.log(`\n📅 ${date}`);
      for (const screening of dateScreenings) {
        console.log(
          `  🎬 ${screening.time} - ${screening.screenType} (${screening.status})`
        );
        if (screening.bookingUrl) {
          console.log(`     예매: ${screening.bookingUrl}`);
        }
      }
    }
  } catch (error) {
    console.error("\n❌ 테스트 실패:", error);
  } finally {
    await scraper.close();
  }
}

// 직접 실행 시 테스트
if (require.main === module) {
  testImaxScraper();
}
