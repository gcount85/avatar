// CGV API를 직접 호출하여 상영 시간표를 가져오는 스크립트
const https = require("https");

// CGV 용산 아이파크몰 극장 코드: 0013
// 지역 코드: 01 (서울)

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            Referer: "https://cgv.co.kr/",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          });
        }
      )
      .on("error", reject);
  });
}

async function findCGVSchedule() {
  console.log("🔍 CGV API 탐색 시작...\n");

  // 시도할 여러 API 엔드포인트
  const endpoints = [
    "https://cgv.co.kr/api/theaters",
    "https://cgv.co.kr/api/movies",
    "https://cgv.co.kr/api/schedule",
    "https://cgv.co.kr/api/screenings",
    "https://www.cgv.co.kr/common/showtimes/iframeTheater.aspx?areacode=01&theatercode=0013",
    "https://www.cgv.co.kr/common/showtimes/iframeSchedule.aspx",
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 시도: ${endpoint}`);
      const data = await makeRequest(endpoint);

      if (data) {
        console.log("✅ 응답 받음:");
        console.log(
          typeof data === "string"
            ? data.substring(0, 500)
            : JSON.stringify(data, null, 2).substring(0, 500)
        );
      }
    } catch (error) {
      console.log(`❌ 실패: ${error.message}`);
    }
  }

  console.log("\n\n📝 CGV 사이트 구조 분석 필요");
  console.log(
    "CGV는 최근 사이트를 리뉴얼했으며, 새로운 API 구조를 사용합니다."
  );
  console.log(
    "브라우저 개발자 도구에서 Network 탭을 열고 예매 페이지를 탐색하면"
  );
  console.log("실제 API 엔드포인트를 확인할 수 있습니다.");
}

findCGVSchedule();
