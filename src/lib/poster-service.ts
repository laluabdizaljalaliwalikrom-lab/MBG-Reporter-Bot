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
          backgroundColor: '#f8fafc',
          padding: '60px',
          fontFamily: 'Roboto',
          color: '#1e293b',
        },
      },
      [
        // Header
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            borderBottom: '3px solid #e2e8f0',
            paddingBottom: '20px',
            marginBottom: '30px'
          }
        }, [
          // Left Logo + Title
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } }, [
            // Styled Logo Emblem
            React.createElement('div', {
              style: {
                width: '56px',
                height: '56px',
                borderRadius: '28px',
                backgroundColor: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #ffffff',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }
            }, [
              React.createElement('span', { style: { color: '#ffffff', fontWeight: '900', fontSize: '18px' } }, 'BGN')
            ]),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, [
              React.createElement('div', { style: { fontSize: '11px', fontWeight: '900', color: '#b45309', letterSpacing: '1.5px' } }, 'BADAN GIZI NASIONAL'),
              React.createElement('div', { style: { fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a' } }, `SPPG ${report.extracted_data?.sppg_name || 'Sikur Kotaraja 2'}`)
            ])
          ]),
          // Right Date Badge
          React.createElement('div', {
            style: {
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#475569',
              backgroundColor: '#e2e8f0',
              padding: '6px 16px',
              borderRadius: '30px'
            }
          }, `Tanggal: ${report.tanggal || '-'}`)
        ]),

        // Grid Section (Middle Portion)
        React.createElement('div', {
          style: {
            display: 'flex',
            width: '100%',
            gap: '30px',
            height: '700px',
            marginBottom: '30px'
          }
        }, [
          // LEFT COLUMN (Nutrition Cards - Width: 48%)
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

            const energiKecil = kecil.Energi || kecil.energi || 0;
            const proteinKecil = kecil.Protein || kecil.protein || 0;
            const lemakKecil = kecil.Lemak || kecil.lemak || 0;
            const karbohidratKecil = kecil.Karbohidrat || kecil.karbohidrat || 0;

            return React.createElement('div', {
              style: {
                width: '48%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                height: '100%'
              }
            }, [
              // Porsi Besar (Soft Red Card)
              React.createElement('div', {
                style: {
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#fef2f2',
                  borderRadius: '24px',
                  padding: '25px',
                  border: '1.5px solid #fecaca',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
                }
              }, [
                React.createElement('div', { style: { fontSize: '16px', fontWeight: '900', color: '#b91c1c', marginBottom: '15px', borderBottom: '1px solid #fee2e2', paddingBottom: '6px' } }, 'GIZI PORSI BESAR (SD-SMP)'),
                React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '15px', flex: 1, alignItems: 'center' } }, [
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#7f1d1d', fontWeight: 'bold' } }, 'Energi'),
                    React.createElement('span', { style: { fontSize: '26px', fontWeight: '900', color: '#991b1b' } }, `${energiBesar} kcal`)
                  ]),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#7f1d1d', fontWeight: 'bold' } }, 'Protein'),
                    React.createElement('span', { style: { fontSize: '26px', fontWeight: '900', color: '#991b1b' } }, `${proteinBesar} g`)
                  ]),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#7f1d1d', fontWeight: 'bold' } }, 'Lemak'),
                    React.createElement('span', { style: { fontSize: '24px', fontWeight: '900', color: '#991b1b' } }, `${lemakBesar} g`)
                  ]),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#7f1d1d', fontWeight: 'bold' } }, 'Karbohidrat'),
                    React.createElement('span', { style: { fontSize: '24px', fontWeight: '900', color: '#991b1b' } }, `${karbohidratBesar} g`)
                  ])
                ])
              ]),

              // Porsi Kecil (Soft Amber Card)
              React.createElement('div', {
                style: {
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#fffbeb',
                  borderRadius: '24px',
                  padding: '25px',
                  border: '1.5px solid #fef3c7',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
                }
              }, [
                React.createElement('div', { style: { fontSize: '16px', fontWeight: '900', color: '#b45309', marginBottom: '15px', borderBottom: '1px solid #fef9c3', paddingBottom: '6px' } }, 'GIZI PORSI KECIL (PAUD-TK)'),
                React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '15px', flex: 1, alignItems: 'center' } }, [
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#78350f', fontWeight: 'bold' } }, 'Energi'),
                    React.createElement('span', { style: { fontSize: '26px', fontWeight: '900', color: '#92400e' } }, `${energiKecil} kcal`)
                  ]),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#78350f', fontWeight: 'bold' } }, 'Protein'),
                    React.createElement('span', { style: { fontSize: '26px', fontWeight: '900', color: '#92400e' } }, `${proteinKecil} g`)
                  ]),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#78350f', fontWeight: 'bold' } }, 'Lemak'),
                    React.createElement('span', { style: { fontSize: '24px', fontWeight: '900', color: '#92400e' } }, `${lemakKecil} g`)
                  ]),
                  React.createElement('div', { style: { display: 'flex', flexDirection: 'column', width: '45%' } }, [
                    React.createElement('span', { style: { fontSize: '11px', color: '#78350f', fontWeight: 'bold' } }, 'Karbohidrat'),
                    React.createElement('span', { style: { fontSize: '24px', fontWeight: '900', color: '#92400e' } }, `${karbohidratKecil} g`)
                  ])
                ])
              ])
            ]);
          })(),

          // RIGHT COLUMN (Food Photo with Location Overlay - Width: 48%)
          React.createElement('div', {
            style: {
              width: '48%',
              height: '100%',
              borderRadius: '24px',
              border: '1.5px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              position: 'relative',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)'
            }
          }, [
            embeddedPhotoUrl 
              ? React.createElement('img', { 
                  src: embeddedPhotoUrl, 
                  style: { width: '100%', height: '100%', objectFit: 'cover' } 
                })
              : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: '#64748b', fontSize: '20px', fontWeight: 'bold' } }, 'FOTO MENU MAKANAN'),
            
            // Transparent location & menu overlay
            React.createElement('div', {
              style: {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundImage: 'linear-gradient(to top, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.65), transparent)',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }
            }, [
              React.createElement('span', { style: { fontSize: '12px', fontWeight: '900', color: '#f59e0b', letterSpacing: '1px' } }, 'LOKASI LAYANAN'),
              React.createElement('span', { style: { fontSize: '24px', fontWeight: 'bold', color: '#ffffff' } }, report.extracted_data?.sppg_name || 'Sikur Kotaraja 2'),
              React.createElement('span', { style: { fontSize: '16px', fontWeight: 'bold', color: '#cbd5e1', marginTop: '5px' } }, `Menu: ${report.menu || '-'}`)
            ])
          ])
        ]),

        // Beneficiary row (Icons / Text Box list)
        React.createElement('div', {
          style: {
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            gap: '15px',
            marginBottom: '30px'
          }
        }, (() => {
          interface ExtractedMBGReport {
            B3?: { Balita?: number; Bumil?: number; Busui?: number };
            b3?: { Balita?: number; Bumil?: number; Busui?: number };
          }
          const ext = (report.extracted_data || {}) as unknown as ExtractedMBGReport;
          const b3Raw = ext.B3 || ext.b3 || {};
          const balita = b3Raw.Balita || 0;
          const bumil = b3Raw.Bumil || 0;
          const busui = b3Raw.Busui || 0;

          const groups = [
            { label: 'SD/SMP', count: report.porsi_besar || 0, bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
            { label: 'PAUD/TK', count: report.porsi_kecil || 0, bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
            { label: 'Balita', count: balita, bg: '#fffbeb', border: '#fef3c7', text: '#b45309' },
            { label: 'Ibu Hamil', count: bumil, bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d' },
            { label: 'Ibu Menyusui', count: busui, bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce' }
          ];

          return groups.map((g) => (
            React.createElement('div', {
              key: g.label,
              style: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: g.bg,
                border: `1.5px solid ${g.border}`,
                borderRadius: '20px',
                padding: '12px 10px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }
            }, [
              React.createElement('span', { style: { fontSize: '11px', fontWeight: 'bold', color: g.text, marginBottom: '4px' } }, g.label),
              React.createElement('span', { style: { fontSize: '20px', fontWeight: '900', color: g.text } }, g.count.toString())
            ])
          ));
        })()),

        // Social Media Footer
        React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginTop: 'auto',
            borderTop: '2px solid #e2e8f0',
            paddingTop: '20px',
            fontSize: '14px',
            color: '#64748b'
          }
        }, [
          React.createElement('div', { style: { display: 'flex', gap: '30px' } }, [
            React.createElement('span', {}, 'IG: @badangizinasional.ri'),
            React.createElement('span', {}, 'Web: bgn.go.id')
          ])
        ]),
      ]
    ),
    {
      width: 1080,
      height: 1350,
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
