import { Screening, NotificationEvent, makeScreeningKey } from "./types";

export interface ScreeningDiff {
  added: Screening[];
  statusChanged: Array<{
    current: Screening;
    previous: Screening;
  }>;
}

export function diffScreenings(
  previous: Screening[],
  current: Screening[],
  targetDate?: string
): ScreeningDiff {
  // 타겟 날짜가 지정된 경우에만 필터링 (선택적)
  const filteredCurrent = targetDate
    ? current.filter((screening) => screening.date === targetDate)
    : current;

  const filteredPrevious = targetDate
    ? previous.filter((screening) => screening.date === targetDate)
    : previous;

  // 키 기반 맵 생성
  const previousMap = new Map<string, Screening>();
  filteredPrevious.forEach((screening) => {
    previousMap.set(makeScreeningKey(screening), screening);
  });

  const currentMap = new Map<string, Screening>();
  filteredCurrent.forEach((screening) => {
    currentMap.set(makeScreeningKey(screening), screening);
  });

  // 새로 추가된 상영
  const added: Screening[] = [];
  for (const [key, screening] of currentMap) {
    if (!previousMap.has(key)) {
      added.push(screening);
    }
  }

  // 상태가 변경된 상영
  const statusChanged: Array<{ current: Screening; previous: Screening }> = [];
  for (const [key, current] of currentMap) {
    const previous = previousMap.get(key);
    if (previous && previous.status !== current.status) {
      statusChanged.push({ current, previous });
    }
  }

  return { added, statusChanged };
}

export function createNotificationEvents(
  diff: ScreeningDiff,
  detectedAt: string
): NotificationEvent[] {
  const events: NotificationEvent[] = [];

  // 새로운 상영 이벤트
  diff.added.forEach((screening) => {
    events.push({
      type: "new_screening",
      screening,
      detectedAt,
    });
  });

  // 상태 변경 이벤트
  diff.statusChanged.forEach(({ current, previous }) => {
    events.push({
      type: "status_change",
      screening: current,
      previousStatus: previous.status,
      detectedAt,
    });
  });

  return events;
}
