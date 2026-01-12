import { NotificationEvent } from "./types";

export class SlackNotifier {
  private readonly webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendNotification(event: NotificationEvent): Promise<void> {
    const message = this.formatMessage(event);

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(
          `Slack API error: ${response.status} ${response.statusText}`
        );
      }

      console.log("Slack notification sent successfully");
    } catch (error) {
      console.error("Failed to send Slack notification:", error);
      throw error;
    }
  }

  private formatMessage(event: NotificationEvent) {
    const { screening, type, detectedAt } = event;
    const emoji = type === "new_screening" ? "🎬" : "🔄";

    const title =
      type === "new_screening"
        ? `${emoji} 새로운 IMAX 상영 스케줄 발견!`
        : `${emoji} 상영 스케줄 상태 변경`;

    let text = `${title}\n`;
    text += `영화: ${screening.movieTitle}\n`;
    text += `극장: ${screening.theater}\n`;
    text += `📅 상영일: ${screening.date}\n`;
    text += `🕐 상영시간: ${screening.time}\n`;
    text += `상태: ${this.getStatusText(screening.status)}\n`;

    if (screening.bookingUrl) {
      text += `예매 링크: ${screening.bookingUrl}\n`;
    }

    text += `감지 시각: ${new Date(detectedAt).toLocaleString("ko-KR")}`;

    return { text };
  }

  private getStatusText(status: string): string {
    switch (status) {
      case "available":
        return "✅ 예매 가능";
      case "sold_out":
        return "❌ 매진";
      case "coming_soon":
        return "⏰ 예매 예정";
      default:
        return "❓ 상태 불명";
    }
  }

  async sendErrorNotification(error: string): Promise<void> {
    try {
      const text = `🚨 IMAX 스케줄 모니터링 오류\n\n${error}\n\n발생 시각: ${new Date().toLocaleString(
        "ko-KR"
      )}`;

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
    } catch (slackError) {
      console.error("Failed to send error notification to Slack:", slackError);
    }
  }
}
