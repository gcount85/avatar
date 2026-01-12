// 데모용 테스트 스크립트
const fs = require("fs");

// 테스트용 스케줄 데이터 생성
const testScreening = {
  movieTitle: "Avatar: Fire and Ash",
  theater: "CGV 용산 아이파크몰 IMAX",
  date: "2025-01-20",
  time: "19:30",
  datetime: "2025-01-20T19:30:00+09:00",
  status: "available",
  screenType: "IMAX",
  bookingUrl: "https://www.cgv.co.kr",
};

// 데이터베이스에 이전 스냅샷이 없는 상태로 만들기
if (fs.existsSync("screenings.db")) {
  fs.unlinkSync("screenings.db");
  console.log("Deleted existing database");
}

// 임시로 스크래퍼 결과를 조작하여 새 스케줄이 발견된 것처럼 시뮬레이션
console.log("Test screening data:", testScreening);
console.log("Run: node dist/index.js check-once");
console.log("This should trigger a Slack notification for the new schedule!");
