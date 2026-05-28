import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';
import { supabase } from './supabase';

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${day} ${monthName} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

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

  // 1.7. Load local BGN Logo and convert to base64
  let logoBase64 = '';
  try {
    const fs = await import('fs');
    const path = await import('path');
    const logoPath = path.join(process.cwd(), 'public/images/logo-bgn.png');
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (e) {
    console.error('Failed to load BGN logo locally:', e);
  }

  // 2. Load Font (Local first, fallback to CDN)
  let fontData: ArrayBuffer;
  try {
    const fs = await import('fs');
    const path = await import('path');
    const localFontPath = path.join(process.cwd(), 'public/fonts/Poppins-Bold.ttf');
    if (fs.existsSync(localFontPath)) {
      const buffer = fs.readFileSync(localFontPath);
      fontData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } else {
      throw new Error('Local font file not found');
    }
  } catch (err) {
    console.warn('Failed to load font locally, falling back to CDN fetch:', err);
    const fontResponse = await fetch(
      'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf'
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
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          padding: '60px',
          fontFamily: 'Poppins',
          color: '#334155',
        },
      },
      [
        // 1. Institution Logo & Address Header (Horizontal, left-aligned)
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '30px'
          }
        }, [
          // Left: BGN Logo (Emblem + "BADAN GIZI NASIONAL" text)
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }
          }, [
            // Circular emblem
            React.createElement('div', {
              style: {
                width: '64px',
                height: '64px',
                borderRadius: '32px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }
            }, [
              logoBase64
                ? React.createElement('img', {
                    src: logoBase64,
                    style: {
                      width: '64px',
                      height: '64px'
                    }
                  })
                : React.createElement('svg', {
                    width: '32',
                    height: '32',
                    viewBox: '0 0 24 24',
                    fill: 'none',
                    stroke: '#2b4cbf',
                    strokeWidth: '2.5',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  }, [
                    React.createElement('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
                    React.createElement('path', { d: 'M2 17l10 5 10-5' }),
                    React.createElement('path', { d: 'M2 12l10 5 10-5' })
                  ])
            ]),
            // Logo Text: "BADAN GIZI NASIONAL"
            React.createElement('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                fontSize: '18px',
                fontWeight: '900',
                color: '#2b4cbf',
                lineHeight: '1.0',
                letterSpacing: '0.5px'
              }
            }, [
              React.createElement('span', {}, 'BADAN'),
              React.createElement('span', {}, 'GIZI'),
              React.createElement('span', {}, 'NASIONAL')
            ])
          ]),

          // Right: SPPG / School details
          React.createElement('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              textAlign: 'right'
            }
          }, [
            React.createElement('span', {
              style: {
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#1e293b'
              }
            }, report.extracted_data?.sppg_name || 'Sekolah Salford & Co.'),
            React.createElement('span', {
              style: {
                fontSize: '16px',
                color: '#64748b',
                marginTop: '4px'
              }
            }, report.extracted_data?.sppg_address || 'Jl. H. Sinarah Ibrahim, Sikur, Kec. Sikur')
          ])
        ]),

        // 2. Large Titles (Centered)
        React.createElement('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginBottom: '30px'
          }
        }, [
          React.createElement('div', {
            style: {
              display: 'flex',
              gap: '12px',
              fontSize: '84px',
              fontWeight: '900',
              lineHeight: '1.1'
            }
          }, [
            React.createElement('span', { style: { color: '#2b4cbf' } }, 'Menu'),
            React.createElement('span', { style: { color: '#0d9488' } }, 'MBG')
          ]),
          React.createElement('div', {
            style: {
              fontSize: '84px',
              fontWeight: '900',
              color: '#2b4cbf',
              lineHeight: '1.1'
            }
          }, 'Hari ini'),
          React.createElement('div', {
            style: {
              fontSize: '26px',
              fontWeight: 'bold',
              color: '#475569',
              marginTop: '15px'
            }
          }, formatIndonesianDate(report.tanggal))
        ]),

        // 3. Centered Food Image with shadow
        React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginBottom: '35px'
          }
        }, [
          React.createElement('div', {
            style: {
              width: '680px',
              height: '460px',
              borderRadius: '24px',
              backgroundColor: '#edf2f7',
              border: '8px solid #ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              display: 'flex',
              position: 'relative'
            }
          }, [
            embeddedPhotoUrl 
              ? React.createElement('img', { 
                  src: embeddedPhotoUrl, 
                  style: { width: '100%', height: '100%', objectFit: 'cover' } 
                })
              : React.createElement('div', { 
                  style: { 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#94a3b8', 
                    fontSize: '24px', 
                    fontWeight: 'bold' 
                  } 
                }, 'Foto Makanan Belum Tersedia')
          ])
        ]),

        // 4. Split Cards (Menu Makanan & Gizi Info)
        React.createElement('div', {
          style: {
            display: 'flex',
            width: '100%',
            gap: '30px',
            marginBottom: '35px',
            alignItems: 'stretch'
          }
        }, [
          // Left Card: Menu Makanan (Teal Gradient/Solid)
          React.createElement('div', {
            style: {
              width: '38%',
              backgroundColor: '#14b8a6',
              borderRadius: '24px',
              padding: '25px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }
          }, [
            React.createElement('span', {
              style: {
                fontSize: '26px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '10px'
              }
            }, 'Menu Makanan'),
            // Divider line
            React.createElement('div', {
              style: {
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                width: '100%',
                marginBottom: '15px'
              }
            }),
            // Menu list items
            React.createElement('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }
            }, (() => {
              const menuString = report.menu || '';
              // Split by commas or newlines
              const items = menuString.split(/[,;\n]+/).map((item: string) => item.trim()).filter(Boolean);
              if (items.length === 0) {
                return [React.createElement('span', { key: 'empty', style: { color: '#ffffff', fontSize: '20px' } }, '• -')];
              }
              return items.map((item: string, idx: number) => 
                React.createElement('span', {
                  key: idx,
                  style: {
                    color: '#ffffff',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }
                }, `• ${item}`)
              );
            })())
          ]),

          // Right Card: Gizi Comparison Table (Light Slate Card `#f1f5f9`)
          React.createElement('div', {
            style: {
              width: '62%',
              backgroundColor: '#f1f5f9',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              padding: '25px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }
          }, (() => {
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

            const rows = [
              { label: 'Energi', besarVal: `${energiBesar} kkal`, kecilVal: `${energiKecil} kkal` },
              { label: 'Lemak', besarVal: `${lemakBesar} g`, kecilVal: `${lemakKecil} g` },
              { label: 'Protein', besarVal: `${proteinBesar} g`, kecilVal: `${proteinKecil} g` },
              { label: 'Karbohidrat', besarVal: `${karbohidratBesar} g`, kecilVal: `${karbohidratKecil} g` },
              { label: 'Serat', besarVal: `${seratBesar} g`, kecilVal: `${seratKecil} g` }
            ];

            return [
              // Header Row
              React.createElement('div', {
                key: 'header',
                style: {
                  display: 'flex',
                  width: '100%',
                  marginBottom: '15px',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '8px'
                }
              }, [
                React.createElement('span', { style: { width: '50%', fontSize: '22px', fontWeight: 'bold', color: '#1e293b' } }, 'Porsi Besar'),
                React.createElement('span', { style: { width: '50%', fontSize: '22px', fontWeight: 'bold', color: '#1e293b' } }, 'Porsi Kecil')
              ]),
              // Data Rows
              React.createElement('div', {
                key: 'rows',
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }
              }, rows.map((row, idx) => 
                React.createElement('div', {
                  key: idx,
                  style: {
                    display: 'flex',
                    width: '100%'
                  }
                }, [
                  // Porsi Besar Column
                  React.createElement('div', {
                    key: 'besar',
                    style: {
                      width: '50%',
                      display: 'flex',
                      fontSize: '20px',
                      color: '#475569'
                    }
                  }, [
                    React.createElement('span', { style: { marginRight: '6px' } }, `${row.label} :`),
                    React.createElement('span', { style: { fontWeight: 'bold', color: '#0f172a' } }, row.besarVal)
                  ]),
                  // Porsi Kecil Column
                  React.createElement('div', {
                    key: 'kecil',
                    style: {
                      width: '50%',
                      display: 'flex',
                      fontSize: '20px',
                      color: '#475569'
                    }
                  }, [
                    React.createElement('span', { style: { marginRight: '6px' } }, `${row.label} :`),
                    React.createElement('span', { style: { fontWeight: 'bold', color: '#0f172a' } }, row.kecilVal)
                  ])
                ])
              ))
            ];
          })())
        ]),

        // 5. Footer Capsule Bar (Vibrant Indigo Blue background)
        React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            width: '100%',
            backgroundColor: '#2b4cbf',
            borderRadius: '50px',
            padding: '18px 45px',
            boxShadow: '0 4px 10px rgba(43, 76, 191, 0.2)',
            marginTop: 'auto'
          }
        }, [
          // Instagram Item
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }
          }, [
            React.createElement('svg', {
              width: '22',
              height: '22',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: '#ffffff',
              strokeWidth: '2.5',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            }, [
              React.createElement('rect', { x: '2', y: '2', width: '20', height: '20', rx: '5', ry: '5' }),
              React.createElement('path', { d: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' }),
              React.createElement('line', { x1: '17.5', y1: '6.5', x2: '17.51', y2: '6.5' })
            ]),
            React.createElement('span', { style: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold' } }, '@sppg_sikur2')
          ]),
          // Facebook Item
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }
          }, [
            React.createElement('svg', {
              width: '22',
              height: '22',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: '#ffffff',
              strokeWidth: '2.5',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            }, [
              React.createElement('path', { d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' })
            ]),
            React.createElement('span', { style: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold' } }, 'SPPG Lombok Timur Sikur Sikur 2')
          ])
        ])
      ]
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [{ name: 'Poppins', data: fontData, weight: 700, style: 'normal' }],
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
