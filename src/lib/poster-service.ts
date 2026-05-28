import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';
import { supabase } from './supabase';

export async function generatePoster(reportId: string) {
  // 1. Fetch data
  const { data: report, error: fetchError } = await supabase
    .from('mbg_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (fetchError || !report) {
    throw new Error('Report not found');
  }

  // 1.5. Fetch photo and convert to base64 if it exists, because Satori requires data URIs to embed images
  let embeddedPhotoUrl = report.photo_url;
  if (embeddedPhotoUrl) {
    try {
      const imgResponse = await fetch(embeddedPhotoUrl);
      if (imgResponse.ok) {
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
        embeddedPhotoUrl = `data:${contentType};base64,${base64}`;
      }
    } catch (e) {
      console.error('Failed to embed photo in poster generation:', e);
    }
  }

  // 2. Load Font (Local first, fallback to CDN)
  let fontData: ArrayBuffer;
  try {
    const fs = await import('fs');
    const path = await import('path');
    const localFontPath = path.join(process.cwd(), 'public/fonts/Roboto-Bold.ttf');
    if (fs.existsSync(localFontPath)) {
      const buffer = fs.readFileSync(localFontPath);
      fontData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } else {
      throw new Error('Local font file not found');
    }
  } catch (err) {
    console.warn('Failed to load font locally, falling back to CDN fetch:', err);
    const fontResponse = await fetch(
      'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf'
    );
    if (!fontResponse.ok) {
      throw new Error(`Failed to fetch font from CDN: ${fontResponse.statusText}`);
    }
    fontData = await fontResponse.arrayBuffer();
  }

  // 3. Render HTML to SVG
  const svg = await satori(
    React.createElement(
      'div',
      {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          backgroundColor: '#ffffff',
          padding: '50px',
          fontFamily: 'Roboto',
          color: '#1e293b',
        },
      },
      [
        // Header
        React.createElement('div', { style: { fontSize: '48px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '40px', borderBottom: '4px solid #1e3a8a', paddingBottom: '10px', width: '100%', textAlign: 'center' } }, 'LAPORAN HARIAN MBG'),

        // Photo (Use actual photo if available, otherwise placeholder)
        embeddedPhotoUrl 
          ? React.createElement('img', { 
              src: embeddedPhotoUrl, 
              style: { width: '500px', height: '350px', borderRadius: '20px', objectFit: 'cover', marginBottom: '40px' } 
            })
          : React.createElement('div', { style: { width: '500px', height: '350px', border: '4px dashed #cbd5e1', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '32px' } }, 'FOTO MENU'),

        // Menu Title
        React.createElement('div', { style: { fontSize: '36px', fontWeight: 'bold', marginBottom: '40px', color: '#334155' } }, report.menu || 'Menu Belum Ditentukan'),

        // Stats Container
        React.createElement('div', { style: { display: 'flex', width: '100%', justifyContent: 'space-between', gap: '30px' } }, [
          // Left Section
          React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '30px', backgroundColor: '#eff6ff', borderRadius: '15px' } }, [
            React.createElement('div', { style: { fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '20px' } }, 'PENERIMA MANFAAT'),
            React.createElement('div', { style: { fontSize: '20px', marginBottom: '10px' } }, `Porsi Besar: ${report.porsi_besar || 0}`),
            React.createElement('div', { style: { fontSize: '20px' } }, `Porsi Kecil: ${report.porsi_kecil || 0}`),
          ]),
          // Right Section (Kandungan Gizi)
          (() => {
            interface ExtractedNutritionalInfo {
              Energi?: number | null;
              energi?: number | null;
              Protein?: number | null;
              protein?: number | null;
              Lemak?: number | null;
              lemak?: number | null;
              Karbohidrat?: number | null;
              karbohidrat?: number | null;
              Serat?: number | null;
              serat?: number | null;
            }

            interface ExtractedMBGReport {
              "Porsi Besar"?: ExtractedNutritionalInfo | number | null;
              porsi_besar?: ExtractedNutritionalInfo | number | null;
              "Porsi Kecil"?: ExtractedNutritionalInfo | number | null;
              porsi_kecil?: ExtractedNutritionalInfo | number | null;
            }

            const ext = (report.extracted_data || {}) as unknown as ExtractedMBGReport;
            const besarRaw = ext["Porsi Besar"] || ext.porsi_besar;
            const besar = (besarRaw && typeof besarRaw === "object") ? (besarRaw as ExtractedNutritionalInfo) : {};
            const kecilRaw = ext["Porsi Kecil"] || ext.porsi_kecil;
            const kecil = (kecilRaw && typeof kecilRaw === "object") ? (kecilRaw as ExtractedNutritionalInfo) : {};

            const energiBesar = besar.Energi || besar.energi || report.energi || 0;
            const proteinBesar = besar.Protein || besar.protein || report.protein || 0;
            const lemakBesar = besar.Lemak || besar.lemak || report.lemak || 0;
            const karbohidratBesar = besar.Karbohidrat || besar.karbohidrat || report.karbohidrat || 0;
            const seratBesar = besar.Serat || besar.serat || report.serat || 0;

            const energiKecil = kecil.Energi || kecil.energi || 0;
            const proteinKecil = kecil.Protein || kecil.protein || 0;
            const lemakKecil = kecil.Lemak || kecil.lemak || 0;
            const karbohidratKecil = kecil.Karbohidrat || kecil.karbohidrat || 0;
            const seratKecil = kecil.Serat || kecil.serat || 0;

            return React.createElement('div', { style: { flex: 1.2, display: 'flex', flexDirection: 'column', padding: '30px', backgroundColor: '#f0fdf4', borderRadius: '15px' } }, [
              React.createElement('div', { style: { fontSize: '22px', fontWeight: 'bold', color: '#15803d', marginBottom: '20px' } }, 'GIZI (BESAR / KECIL)'),
              React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Energi: ${energiBesar} / ${energiKecil} kcal`),
              React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Protein: ${proteinBesar} / ${proteinKecil} g`),
              React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Lemak: ${lemakBesar} / ${lemakKecil} g`),
              React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Karbohidrat: ${karbohidratBesar} / ${karbohidratKecil} g`),
              React.createElement('div', { style: { fontSize: '18px' } }, `Serat: ${seratBesar} / ${seratKecil} g`),
            ]);
          })(),
        ]),

        // Footer
        React.createElement('div', { style: { marginTop: 'auto', fontSize: '16px', color: '#94a3b8' } }, `ID Laporan: ${reportId} | Tanggal: ${report.tanggal || '-'}`),
      ]
    ),
    {
      width: 800,
      height: 1100,
      fonts: [{ name: 'Roboto', data: fontData, weight: 700, style: 'normal' }],
    }
  );

  // 4. Convert SVG to PNG
  const resvg = new Resvg(svg, { background: 'rgba(255, 255, 255, 1)' });
  const pngData = resvg.render().asPng();

  // 5. Upload to Storage
  const fileName = `poster-${reportId}-${Date.now()}.png`;
  const { error: uploadError } = await supabase.storage
    .from('posters')
    .upload(fileName, pngData, { contentType: 'image/png', upsert: true });

  if (uploadError) throw uploadError;

  // 6. Update report with poster_url
  const { data: { publicUrl } } = supabase.storage.from('posters').getPublicUrl(fileName);
  
  await supabase
    .from('mbg_reports')
    .update({ poster_url: publicUrl })
    .eq('id', reportId);

  return publicUrl;
}
