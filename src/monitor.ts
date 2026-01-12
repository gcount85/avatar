import { ImaxScraper } from "./scraper";
import { ScreeningDatabase } from "./database";
import { SlackNotifier } from "./slack";
import { diffScreenings, createNotificationEvents } from "./diff";
import {
  Screening,
  ScreeningSnapshot,
  makeScreeningKey,
  generateChecksum,
} from "./types";

export class ScheduleMonitor {
  private scraper: ImaxScraper;
  private database: ScreeningDatabase;
  private notifier: SlackNotifier;
  private targetMovie: string;
  private targetDate: string;

  constructor(webhookUrl: string, targetMovie: string, targetDate: string) {
    this.scraper = new ImaxScraper();
    this.database = new ScreeningDatabase();
    this.notifier = new SlackNotifier(webhookUrl);
    this.targetMovie = targetMovie;
    this.targetDate = targetDate;
  }

  async initialize(): Promise<void> {
    await this.scraper.init();
    console.log("Schedule monitor initialized");
  }

  async checkSchedule(): Promise<void> {
    try {
      console.log(
        `Checking schedule for "${this.targetMovie}" on ${this.targetDate}`
      );

      // 현재 스케줄 스크래핑
      const currentScreenings = await this.scraper.scrapeSchedule(
        this.targetMovie,
        this.targetDate
      );

      console.log(`Found ${currentScreenings.length} screenings`);

      // 이전 스냅샷 로드
      const lastSnapshot = this.database.getLastSnapshot();
      const previousScreenings = lastSnapshot?.screenings || [];

      // 변경사항 감지 (모든 날짜의 스케줄 변경사항 감지)
      const diff = diffScreenings(
        previousScreenings,
        currentScreenings
        // targetDate 파라미터 제거 - 모든 날짜의 변경사항 감지
      );

      console.log(
        `Diff: ${diff.added.length} added, ${diff.statusChanged.length} status changed`
      );

      // 알림 이벤트 생성
      const events = createNotificationEvents(diff, new Date().toISOString());

      // 중복 방지하며 알림 전송
      for (const event of events) {
        const screeningKey = makeScreeningKey(event.screening);
        const eventKey = `${event.type}_${screeningKey}`;

        if (!this.database.wasNotificationSent(screeningKey, event.type)) {
          await this.notifier.sendNotification(event);
          this.database.markNotificationSent(screeningKey, event.type);
          console.log(`Notification sent for: ${eventKey}`);
        } else {
          console.log(`Notification already sent for: ${eventKey}`);
        }
      }

      // 새 스냅샷 저장
      const newSnapshot: ScreeningSnapshot = {
        timestamp: new Date().toISOString(),
        screenings: currentScreenings,
        checksum: generateChecksum(currentScreenings),
      };

      this.database.saveSnapshot(newSnapshot);
      console.log("Schedule check completed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error during schedule check:", errorMessage);

      // 에러 알림 전송
      await this.notifier.sendErrorNotification(errorMessage);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.scraper.close();
    this.database.close();
    console.log("Schedule monitor closed");
  }

  // 수동 테스트용 메서드
  async testScraping(): Promise<Screening[]> {
    await this.initialize();
    try {
      const screenings = await this.scraper.scrapeSchedule(
        this.targetMovie,
        this.targetDate
      );
      console.log("Test scraping results:", screenings);
      return screenings;
    } finally {
      await this.close();
    }
  }

  // 테스트 알림 전송
  async testNotification(): Promise<void> {
    const testScreening: Screening = {
      movieTitle: this.targetMovie,
      theater: "CGV 용산 아이파크몰 IMAX",
      date: this.targetDate,
      time: "19:30",
      datetime: `${this.targetDate}T19:30:00+09:00`,
      status: "available",
      screenType: "IMAX",
      bookingUrl: "https://www.cgv.co.kr",
    };

    await this.notifier.sendNotification({
      type: "new_screening",
      screening: testScreening,
      detectedAt: new Date().toISOString(),
    });

    console.log("Test notification sent");
  }
}
