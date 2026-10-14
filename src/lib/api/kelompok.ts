import { apiGet, parseJson } from "./client";
import type { KelompokData } from "@/types/penerima";

export async function fetchKelompokListApi(sppgId?: string): Promise<KelompokData[]> {
  const params = new URLSearchParams();
  if (sppgId) params.set("sppg_id", sppgId);
  const url = `/api/kelompok-penerima-manfaat${params.toString() ? `?${params}` : ""}`;
  const result = await apiGet<KelompokData[]>(url);
  if (result.status === "success" && Array.isArray(result.data)) {
    return result.data;
  }
  throw new Error(result.message);
}

export type CreateKelompokPayload = Omit<KelompokData, "id">;
export type UpdateKelompokPayload = KelompokData & { id: string };

export async function createKelompokApi(payload: CreateKelompokPayload): Promise<KelompokData> {
  const res = await fetch("/api/kelompok-penerima-manfaat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<KelompokData>(res);
  if (result.status === "success" && result.data) return result.data;
  throw new Error(result.message);
}

export async function updateKelompokApi(payload: UpdateKelompokPayload): Promise<KelompokData> {
  const res = await fetch("/api/kelompok-penerima-manfaat", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<KelompokData>(res);
  if (result.status === "success" && result.data) return result.data;
  throw new Error(result.message);
}

export async function deleteKelompokApi(id: string): Promise<void> {
  const res = await fetch(`/api/kelompok-penerima-manfaat?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const result = await parseJson<unknown>(res);
  if (result.status !== "success") throw new Error(result.message);
}