import { request } from "./client";
import type { FireEventStatus, FireIntensity, Overview, PagedFireEvents, RobotStatus, OperationLog } from "../types";

export function getOverview() {
  return request<Overview>("/dashboard/overview");
}

export function getFireEvents(params: {
  page: number;
  pageSize: number;
  status?: FireEventStatus;
  intensity?: FireIntensity;
}) {
  const url = new URLSearchParams();
  url.set("page", String(params.page));
  url.set("pageSize", String(params.pageSize));
  if (params.status) {
    url.set("status", params.status);
  }
  if (params.intensity) {
    url.set("intensity", params.intensity);
  }

  return request<PagedFireEvents>(`/fire-events?${url.toString()}`);
}

export function createFireEvent(payload: {
  eventTime: string;
  locationX: number;
  locationY: number;
  locationZ: number;
  fireIntensity: FireIntensity;
  sensorData: Record<string, string | number | boolean | null>;
  actionTaken?: string;
}) {
  return request("/fire-events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateFireEventStatus(id: number, payload: { status: FireEventStatus; actionTaken?: string }) {
  return request(`/fire-events/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteFireEvent(id: number) {
  return request(`/fire-events/${id}`, {
    method: "DELETE"
  });
}

export function getRobotStatus() {
  return request<RobotStatus[]>("/robot-status");
}

export function getOperationLogs(limit = 20) {
  return request<OperationLog[]>(`/operation-logs?limit=${limit}`);
}
