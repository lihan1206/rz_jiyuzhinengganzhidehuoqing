export type FireIntensity = "low" | "medium" | "high";
export type FireEventStatus = "detected" | "extinguished" | "failed";
export type RobotWorkStatus = "moving" | "idle" | "working" | "charging";

export interface FireEvent {
  id: number;
  eventTime: string;
  locationX: number;
  locationY: number;
  locationZ: number;
  fireIntensity: FireIntensity;
  sensorData: Record<string, string | number | boolean | null>;
  actionTaken?: string;
  status: FireEventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RobotStatus {
  id: number;
  robotId: string;
  positionX: number;
  positionY: number;
  orientation: number;
  batteryLevel: number;
  status: RobotWorkStatus;
  lastUpdated: string;
}

export interface OperationLog {
  id: number;
  eventType: string;
  description: string;
  timestamp: string;
  userName?: string | null;
  robotId?: string | null;
  fireEventId?: number | null;
}

export interface Overview {
  totalFires: number;
  activeFires: number;
  extinguishedFires: number;
  totalRobots: number;
  latestLogs: OperationLog[];
}

export interface PagedFireEvents {
  total: number;
  items: FireEvent[];
}
