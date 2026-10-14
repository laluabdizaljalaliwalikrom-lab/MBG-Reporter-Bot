import { apiGet } from "./client";
import type { SppgData } from "@/types/sppg";

export async function fetchSppgListApi(): Promise<SppgData[]> {
  const result = await apiGet<SppgData[]>("/api/sppg");
  if (result.status === "success" && Array.isArray(result.data)) {
    return result.data;
  }
  throw new Error(result.message);
}