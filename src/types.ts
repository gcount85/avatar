export interface Screening {
  movieTitle: string;
  theater: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  datetime: string; // ISO string
  bookingUrl?: string;
  status: "available" | "sold_out" | "coming_soon" | "unknown";
  screenType?: string; // IMAX, 4DX 등
}

export interface ScreeningSnapshot {
  timestamp: string;
  screenings: Screening[];
  checksum: string;
}

export interface NotificationEvent {
  type: "new_screening" | "status_change";
  screening: Screening;
  previousStatus?: string;
  detectedAt: string;
}

export function makeScreeningKey(screening: Screening): string {
  return `${screening.movieTitle}|${screening.theater}|${screening.datetime}`;
}

export function generateChecksum(screenings: Screening[]): string {
  const keys = screenings.map(makeScreeningKey).sort();
  return Buffer.from(keys.join("||")).toString("base64");
}
