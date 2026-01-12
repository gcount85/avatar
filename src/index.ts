import * as cron from "node-cron";
import * as dotenv from "dotenv";
import { ScheduleMonitor } from "./monitor";

// 환경변수 로드
dotenv.config();
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TARGET_MOVIE = process.env.TARGET_MOVIE || "Avatar: Fire and Ash";
const TARGET_DATE = process.env.TARGET_DATE || "2025-01-20"; // 주요 관심 날짜 (실제로는 모든 날짜 모니터링)
const CHECK_INTERVAL_MINUTES = Number.parseInt(
  process.env.CHECK_INTERVAL_MINUTES || "2"
);

if (!SLACK_WEBHOOK_URL) {
  console.error("SLACK_WEBHOOK_URL environment variable is required");
  process.exit(1);
}

async function main() {
  const monitor = new ScheduleMonitor(
    SLACK_WEBHOOK_URL!,
    TARGET_MOVIE,
    TARGET_DATE
  );

  // 명령행 인자 처리
  const command = process.argv[2];

  switch (command) {
    case "test-scraping":
      console.log("Testing scraping functionality...");
      await monitor.testScraping();
      break;

    case "test-notification":
      console.log("Testing Slack notification...");
      await monitor.testNotification();
      break;

    case "check-once":
      console.log("Running single schedule check...");
      await monitor.initialize();
      try {
        await monitor.checkSchedule();
      } finally {
        await monitor.close();
      }
      break;

    case "start":
    default:
      console.log(
        `Starting schedule monitor for "${TARGET_MOVIE}" (all dates monitored, primary focus: ${TARGET_DATE})`
      );
      console.log(`Check interval: ${CHECK_INTERVAL_MINUTES} minutes`);
      console.log("Press Ctrl+C to stop");

      // 즉시 한 번 실행
      await monitor.initialize();
      await monitor.checkSchedule();

      // 크론 스케줄 설정 (매 N분마다)
      const cronExpression = `*/${CHECK_INTERVAL_MINUTES} * * * *`;

      cron.schedule(cronExpression, async () => {
        console.log(
          `\n[${new Date().toISOString()}] Running scheduled check...`
        );
        try {
          await monitor.checkSchedule();
        } catch (error) {
          console.error("Scheduled check failed:", error);
        }
      });

      // 프로세스 종료 시 정리
      process.on("SIGINT", async () => {
        console.log("\nShutting down monitor...");
        await monitor.close();
        process.exit(0);
      });

      // 프로세스 유지
      process.stdin.resume();
      break;
  }
}

// 처리되지 않은 에러 핸들링
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

main().catch(console.error);
