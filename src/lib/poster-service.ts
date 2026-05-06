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

  // 2. Load Font
  const fontResponse = await fetch(
    'https://cdnjs.cloudflare.com/ajax/libs/roboto-fontface/0.10.0/fonts/roboto/Roboto-Bold.ttf'
  );
  const fontData = await fontResponse.arrayBuffer();

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
        report.photo_url 
          ? React.createElement('img', { 
              src: report.photo_url, 
              style: { width: '500px', height: '350px', borderRadius: '20px', objectFit: 'cover', marginBottom: '40px' } 
            })
          : React.createElement('div', { style: { width: '500px', height: '350px', border: '4px dashed #cbd5e1', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyCenter: 'center', marginBottom: '40px', backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '32px' } }, 'FOTO MENU'),

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
          // Right Section
          React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '30px', backgroundColor: '#f0fdf4', borderRadius: '15px' } }, [
            React.createElement('div', { style: { fontSize: '24px', fontWeight: 'bold', color: '#15803d', marginBottom: '20px' } }, 'KANDUNGAN GIZI'),
            React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Energi: ${report.energi || 0} kcal`),
            React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Protein: ${report.protein || 0} g`),
            React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Lemak: ${report.lemak || 0} g`),
            React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, `Karbohidrat: ${report.karbohidrat || 0} g`),
            React.createElement('div', { style: { fontSize: '18px' } }, `Serat: ${report.serat || 0} g`),
          ]),
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
