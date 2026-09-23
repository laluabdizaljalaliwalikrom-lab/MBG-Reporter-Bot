"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import StickerPrintSheet from "@/components/StickerPrintSheet";
import StickerPrintSheetSE from "@/components/StickerPrintSheetSE";
import StickerRollGrozziie from "@/components/StickerRollGrozziie";
import { PaperSize } from "@/components/StickerPrintSheet";

interface StickerGizi {
  energi: string;
  protein: string;
  lemak: string;
  karbohidrat: string;
  serat: string;
}

interface StickerPreviewProps {
  templateType?: "classic" | "se2026" | "grozziie";
  paperSize?: PaperSize;
  grozziieWidthMm?: number;
  grozziieHeightMm?: number;
  grozziiePairMode?: "both" | "left_only" | "right_only";
  capacity: number;
  mode: "all_besar" | "all_kecil" | "split";
  countBesar: number;
  sppgName: string;
  subWilayah?: string;
  menu: string;
  tanggal: string;
  jamSelesai: string;
  jamBatas: string;
  giziBesar: StickerGizi;
  giziKecil: StickerGizi;
  pairMode?: "pair" | "left_only" | "right_only";
  waPengaduan?: string;
  tiktokPengaduan?: string;
  igPengaduan?: string;
}

// Preview of the sticker sheet scaled down to fit the container width while
// keeping the true paper aspect ratio. Because the sheet is measured in real
// mm (fixed px/mm), the on-screen preview is a proportional miniature of the
// actual printed page. transform:scale does not affect layout, so we reserve
// the scaled-down space on an outer box using the measured native dimensions.
export default function StickerPreview(props: StickerPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [native, setNative] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const sheet = sheetRef.current;
      const holder = holderRef.current;
      if (!container || !sheet || !holder) return;

      const availW = container.clientWidth;
      const sheetW = sheet.offsetWidth;
      const sheetH = sheet.offsetHeight;
      if (!availW || !sheetW || !sheetH) return;

      setNative({ w: sheetW, h: sheetH });
      const next = Math.min(1, availW / sheetW);
      setScale(next);
      holder.style.height = `${sheetH * next}px`;
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex justify-center w-full">
      <div
        ref={holderRef}
        style={{ width: "100%", overflow: "hidden", position: "relative" }}
      >
        <div
          ref={sheetRef}
          style={{
            width: native.w ? native.w : undefined,
            position: "absolute",
            top: 0,
            left: "50%",
            marginLeft: native.w ? -native.w / 2 : 0,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            willChange: "transform",
          }}
        >
          {props.templateType === "grozziie" ? (
            <StickerRollGrozziie
              widthMm={props.grozziieWidthMm}
              heightMm={props.grozziieHeightMm}
              pairMode={props.grozziiePairMode || "both"}
              sppgName={props.sppgName}
              subWilayah={props.subWilayah}
              menu={props.menu}
              tanggal={props.tanggal}
              jamSelesai={props.jamSelesai}
              jamBatas={props.jamBatas}
              waPengaduan={props.waPengaduan}
              tiktokPengaduan={props.tiktokPengaduan}
              igPengaduan={props.igPengaduan}
            />
          ) : props.templateType === "se2026" ? (
            <StickerPrintSheetSE
              paperSize={props.paperSize}
              capacity={props.capacity}
              pairMode={props.pairMode}
              sppgName={props.sppgName}
              subWilayah={props.subWilayah}
              menu={props.menu}
              tanggal={props.tanggal}
              jamBatas={props.jamBatas}
              waPengaduan={props.waPengaduan}
              tiktokPengaduan={props.tiktokPengaduan}
              igPengaduan={props.igPengaduan}
            />
          ) : (
            <StickerPrintSheet {...props} />
          )}
        </div>
      </div>
    </div>
  );
}
