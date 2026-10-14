import { apiGet, parseJson } from "./client";
import type { BeneficiaryData } from "@/types/penerima";

export interface BeneficiaryQuery {
  sppgId?: string;
  kategori?: string;
  status?: string;
  q?: string;
}

export async function fetchBeneficiaryListApi(query: BeneficiaryQuery = {}): Promise<BeneficiaryData[]> {
  const params = new URLSearchParams();
  if (query.sppgId) params.set("sppg_id", query.sppgId);
  if (query.kategori) params.set("kategori", query.kategori);
  if (query.status && query.status !== "All") params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  const url = `/api/penerima-manfaat${params.toString() ? `?${params}` : ""}`;
  const result = await apiGet<BeneficiaryData[]>(url);
  if (result.status === "success" && Array.isArray(result.data)) {
    return result.data;
  }
  throw new Error(result.message);
}

export type CreateBeneficiaryPayload = BeneficiaryData;
export type UpdateBeneficiaryPayload = BeneficiaryData & { id: string };

export async function createBeneficiaryApi(payload: CreateBeneficiaryPayload): Promise<BeneficiaryData> {
  const res = await fetch("/api/penerima-manfaat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<BeneficiaryData>(res);
  if (result.status === "success" && result.data) return result.data;
  throw new Error(result.message);
}

export async function updateBeneficiaryApi(payload: UpdateBeneficiaryPayload): Promise<BeneficiaryData> {
  const res = await fetch("/api/penerima-manfaat", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<BeneficiaryData>(res);
  if (result.status === "success" && result.data) return result.data;
  throw new Error(result.message);
}

export async function deleteBeneficiaryApi(id: string): Promise<void> {
  const res = await fetch(`/api/penerima-manfaat?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const result = await parseJson<unknown>(res);
  if (result.status !== "success") throw new Error(result.message);
}