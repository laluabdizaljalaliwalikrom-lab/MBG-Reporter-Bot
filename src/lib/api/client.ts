export type ApiResult<T> =
  | { status: "success"; data: T; message?: string }
  | { status: "error"; data?: T; message: string };

export async function apiGet<T>(url: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (json?.status === "success") {
      return { status: "success", data: json.data as T, message: json.message };
    }
    return { status: "error", message: json?.message || "Permintaan gagal." };
  } catch (err) {
    console.error(`apiGet ${url} error:`, err);
    return { status: "error", message: "Gagal terhubung ke server." };
  }
}

export async function parseJson<T>(res: Response): Promise<ApiResult<T>> {
  try {
    const json = await res.json();
    if (json?.status === "success") {
      return { status: "success", data: json.data as T, message: json.message };
    }
    return { status: "error", message: json?.message || "Permintaan gagal." };
  } catch (err) {
    console.error("parseJson error:", err);
    return { status: "error", message: "Gagal memproses respons server." };
  }
}