import { Screening } from "./types";
import * as fs from "fs";

const CALL_COUNT_FILE = "test-call-count.txt";

function getCallCount(): number {
  try {
    if (fs.existsSync(CALL_COUNT_FILE)) {
      const count = parseInt(fs.readFileSync(CALL_COUNT_FILE, "utf8"));
      return isNaN(count) ? 0 : count;
    }
  } catch (error) {
    console.log("Error reading call count:", error);
  }
  return 0;
}

function incrementCallCount(): number {
  const newCount = getCallCount() + 1;
  try {
    fs.writeFileSync(CALL_COUNT_FILE, newCount.toString());
  } catch (error) {
    console.log("Error writing call count:", error);
  }
  return newCount;
}

export function createTestSchedule(
  targetMovie: string,
  targetDate: string
): Screening[] {
  const callCount = incrementCallCount();
  console.log(`🧪 Test mode call #${callCount}`);

  const screenings: Screening[] = [];

  // 기본 1월 20일 스케줄 (항상 생성)
  screenings.push(
    {
      movieTitle: targetMovie,
      theater: "CGV 용산 아이파크몰 IMAX",
      date: "2025-01-20",
      time: "19:30",
      datetime: "2025-01-20T19:30:00+09:00",
      status: "available",
      screenType: "IMAX",
      bookingUrl:
        "https://www.cgv.co.kr/ticket/?MOVIE_CD=20025658&MOVIE_CD_GROUP=20025658",
    },
    {
      movieTitle: targetMovie,
      theater: "CGV 용산 아이파크몰 IMAX",
      date: "2025-01-20",
      time: "22:00",
      datetime: "2025-01-20T22:00:00+09:00",
      status: "available",
      screenType: "IMAX",
      bookingUrl:
        "https://www.cgv.co.kr/ticket/?MOVIE_CD=20025658&MOVIE_CD_GROUP=20025658",
    }
  );

  // 2번째 호출부터 추가 날짜 스케줄 생성 (새로운 변경사항 시뮬레이션)
  if (callCount >= 2) {
    const additionalSchedules = [
      {
        date: "2025-01-21",
        time: "14:00",
      },
      {
        date: "2025-01-21",
        time: "17:00",
      },
      {
        date: "2025-01-22",
        time: "20:00",
      },
      {
        date: "2025-01-23",
        time: "15:30",
      },
    ];

    // 호출 횟수에 따라 점진적으로 스케줄 추가
    const schedulesToAdd = additionalSchedules.slice(
      0,
      Math.min(callCount - 1, additionalSchedules.length)
    );

    schedulesToAdd.forEach(({ date, time }) => {
      screenings.push({
        movieTitle: targetMovie,
        theater: "CGV 용산 아이파크몰 IMAX",
        date: date,
        time: time,
        datetime: `${date}T${time}:00+09:00`,
        status: "available",
        screenType: "IMAX",
        bookingUrl:
          "https://www.cgv.co.kr/ticket/?MOVIE_CD=20025658&MOVIE_CD_GROUP=20025658",
      });
      console.log(`🎬 Added new schedule: ${date} at ${time}`);
    });
  }

  console.log(`📊 Total screenings generated: ${screenings.length}`);
  return screenings;
}
