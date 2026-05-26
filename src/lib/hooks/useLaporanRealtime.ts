"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface MBGReport {
  id: string;
  created_at: string;
  whatsapp_from: string | null;
  raw_message: string | null;
  extracted_data: Record<string, any> | null;
  status: "DRAFT" | "SENT" | "APPROVED" | string;
  tanggal: string | null;
  porsi_besar: number | null;
  porsi_kecil: number | null;
  menu: string | null;
  energi: number | null;
  protein: number | null;
  lemak: number | null;
  karbohidrat: number | null;
  serat: number | null;
  photo_url: string | null;
  poster_url: string | null;
}

export function useLaporanRealtime() {
  const [reports, setReports] = useState<MBGReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 1. Fetch initial reports from Supabase mbg_reports table
    async function fetchInitialReports() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("mbg_reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setReports((data as MBGReport[]) || []);
      } catch (err: any) {
        console.error("useLaporanRealtime: Error fetching initial reports:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }

    fetchInitialReports();

    // 2. Setup Supabase Realtime Subscription for mbg_reports table
    const reportsChannel = supabase
      .channel("public:mbg_reports")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for INSERT, UPDATE, and DELETE events
          schema: "public",
          table: "mbg_reports"
        },
        (payload) => {
          console.log("useLaporanRealtime: Realtime database payload received:", payload);
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === "INSERT") {
            setReports((prev) => [newRow as MBGReport, ...prev]);
          } else if (eventType === "UPDATE") {
            setReports((prev) =>
              prev.map((item) => (item.id === newRow.id ? (newRow as MBGReport) : item))
            );
          } else if (eventType === "DELETE") {
            setReports((prev) => prev.filter((item) => item.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription channel on unmount
    return () => {
      supabase.removeChannel(reportsChannel);
    };
  }, []);

  return {
    reports,
    loading,
    error,
    setReports
  };
}
