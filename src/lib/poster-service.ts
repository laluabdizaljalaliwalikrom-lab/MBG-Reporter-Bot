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
  sppg_name?: string;
  sppg_address?: string;
}

// ----------------------------------------------------
// TEMPLATE 1: Modern Classic (Original Teal & Royal Blue)
// ----------------------------------------------------
function buildTemplate1(params: {
  logoBase64: string;
  embeddedPhotoUrl: string;
  sppgName: string;
  sppgAddress: string;
  formattedDate: string;
  menuItems: string[];
  totalBeneficiaries: number;
  energiBesar: number;
  proteinBesar: number;
  lemakBesar: number;
  karbohidratBesar: number;
  seratBesar: number;
  energiKecil: number;
  proteinKecil: number;
  lemakKecil: number;
  karbohidratKecil: number;
  seratKecil: number;
}) {
  const {
    logoBase64, embeddedPhotoUrl, sppgName, sppgAddress, formattedDate, menuItems,
    energiBesar, proteinBesar, lemakBesar, karbohidratBesar, seratBesar,
    energiKecil, proteinKecil, lemakKecil, karbohidratKecil, seratKecil
  } = params;

  return React.createElement('div', {
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
    }
  }, [
    // Header
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '30px' }
    }, [
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } }, [
        React.createElement('div', {
          style: { width: '64px', height: '64px', borderRadius: '32px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
        }, [
          logoBase64 ? React.createElement('img', { src: logoBase64, style: { width: '64px', height: '64px' } }) : null
        ]),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', fontSize: '18px', fontWeight: '900', color: '#2b4cbf', lineHeight: '1.0' } }, [
          React.createElement('span', {}, 'BADAN'),
          React.createElement('span', {}, 'GIZI'),
          React.createElement('span', {}, 'NASIONAL')
        ])
      ]),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' } }, [
        React.createElement('span', { style: { fontSize: '22px', fontWeight: 'bold', color: '#1e293b' } }, sppgName),
        React.createElement('span', { style: { fontSize: '16px', color: '#64748b', marginTop: '4px' } }, sppgAddress)
      ])
    ]),
    // Titles
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '30px' } }, [
      React.createElement('div', { style: { display: 'flex', gap: '12px', fontSize: '84px', fontWeight: '900', lineHeight: '1.1' } }, [
        React.createElement('span', { style: { color: '#2b4cbf' } }, 'Menu'),
        React.createElement('span', { style: { color: '#0d9488' } }, 'MBG')
      ]),
      React.createElement('div', { style: { fontSize: '84px', fontWeight: '900', color: '#2b4cbf', lineHeight: '1.1' } }, 'Hari ini'),
      React.createElement('div', { style: { fontSize: '26px', fontWeight: 'bold', color: '#475569', marginTop: '15px' } }, formattedDate)
    ]),
    // Image
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '35px' } }, [
      React.createElement('div', {
        style: { width: '680px', height: '460px', borderRadius: '24px', backgroundColor: '#edf2f7', border: '8px solid #ffffff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex' }
      }, [
        embeddedPhotoUrl ? React.createElement('img', { src: embeddedPhotoUrl, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '24px', fontWeight: 'bold' } }, 'Foto Makanan Belum Tersedia')
      ])
    ]),
    // Cards
    React.createElement('div', { style: { display: 'flex', width: '100%', gap: '30px', marginBottom: '35px' } }, [
      React.createElement('div', { style: { width: '38%', backgroundColor: '#14b8a6', borderRadius: '24px', padding: '25px', display: 'flex', flexDirection: 'column' } }, [
        React.createElement('span', { style: { fontSize: '26px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' } }, 'Menu Makanan'),
        React.createElement('div', { style: { height: '1px', backgroundColor: 'rgba(255,255,255,0.3)', width: '100%', marginBottom: '15px' } }),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          menuItems.map((item, idx) => React.createElement('span', { key: idx, style: { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' } }, `• ${item}`))
        )
      ]),
      React.createElement('div', { style: { width: '62%', backgroundColor: '#f1f5f9', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '25px', display: 'flex', flexDirection: 'column' } }, [
        React.createElement('div', { style: { display: 'flex', width: '100%', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' } }, [
          React.createElement('span', { style: { width: '50%', fontSize: '22px', fontWeight: 'bold', color: '#1e293b' } }, 'Porsi Besar'),
          React.createElement('span', { style: { width: '50%', fontSize: '22px', fontWeight: 'bold', color: '#1e293b' } }, 'Porsi Kecil')
        ]),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
          { label: 'Energi', besar: `${energiBesar} kkal`, kecil: `${energiKecil} kkal` },
          { label: 'Lemak', besar: `${lemakBesar} g`, kecil: `${lemakKecil} g` },
          { label: 'Protein', besar: `${proteinBesar} g`, kecil: `${proteinKecil} g` },
          { label: 'Karbohidrat', besar: `${karbohidratBesar} g`, kecil: `${karbohidratKecil} g` },
          { label: 'Serat', besar: `${seratBesar} g`, kecil: `${seratKecil} g` }
        ].map((row, idx) => React.createElement('div', { key: idx, style: { display: 'flex', width: '100%' } }, [
          React.createElement('div', { style: { width: '50%', display: 'flex', fontSize: '20px', color: '#475569' } }, [
            React.createElement('span', { style: { marginRight: '6px' } }, `${row.label} :`),
            React.createElement('span', { style: { fontWeight: 'bold', color: '#0f172a' } }, row.besar)
          ]),
          React.createElement('div', { style: { width: '50%', display: 'flex', fontSize: '20px', color: '#475569' } }, [
            React.createElement('span', { style: { marginRight: '6px' } }, `${row.label} :`),
            React.createElement('span', { style: { fontWeight: 'bold', color: '#0f172a' } }, row.kecil)
          ])
        ])))
      ])
    ]),
    // Footer
    React.createElement('div', {
      style: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%', backgroundColor: '#2b4cbf', borderRadius: '50px', padding: '18px 45px', marginTop: 'auto' }
    }, [
      React.createElement('span', { style: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold' } }, 'Instagram: @sppg_official'),
      React.createElement('span', { style: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold' } }, `FB: ${sppgName}`)
    ])
  ]);
}

// ----------------------------------------------------
// TEMPLATE 2: Classic Beige & Sticky Note (Ref Image 1)
// ----------------------------------------------------
function buildTemplate2(params: any) {
  const {
    logoBase64, embeddedPhotoUrl, sppgName, sppgAddress, formattedDate, menuItems,
    energiBesar, proteinBesar, lemakBesar, karbohidratBesar, seratBesar,
    energiKecil, proteinKecil, lemakKecil, karbohidratKecil, seratKecil
  } = params;

  return React.createElement('div', {
    style: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justify: 'space-between',
      backgroundColor: '#fffdf0',
      padding: '50px 60px',
      fontFamily: 'Poppins',
      color: '#1e1b4b',
    }
  }, [
    // Header
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '20px' }
    }, [
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } }, [
        React.createElement('div', {
          style: { width: '60px', height: '60px', borderRadius: '30px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
        }, [
          logoBase64 ? React.createElement('img', { src: logoBase64, style: { width: '60px', height: '60px' } }) : null
        ]),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, [
          React.createElement('span', { style: { fontSize: '20px', fontWeight: '900', color: '#1e1b4b', letterSpacing: '0.5px' } }, 'BADAN GIZI NASIONAL'),
          React.createElement('span', { style: { fontSize: '13px', fontWeight: 'bold', color: '#64748b' } }, sppgName)
        ])
      ]),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' } }, [
        React.createElement('span', { style: { fontSize: '14px', color: '#64748b' } }, sppgAddress)
      ])
    ]),

    // Title
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '25px' } }, [
      React.createElement('span', { style: { fontSize: '76px', fontWeight: '900', color: '#1e1b4b', letterSpacing: '2px', lineHeight: '1.0' } }, "TODAY'S MENU"),
      React.createElement('span', { style: { fontSize: '22px', fontWeight: 'bold', color: '#334155', marginTop: '8px' } }, formattedDate),
      React.createElement('div', { style: { height: '3px', backgroundColor: '#1e1b4b', width: '80%', marginTop: '12px' } })
    ]),

    // Center Section: Photo Left, Sticky Note Right
    React.createElement('div', { style: { display: 'flex', width: '100%', gap: '30px', alignItems: 'stretch', marginBottom: '30px' } }, [
      // Left: Photo Container
      React.createElement('div', {
        style: { width: '58%', height: '440px', borderRadius: '20px', border: '6px solid #ffffff', boxShadow: '0 10px 20px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', backgroundColor: '#edf2f7' }
      }, [
        embeddedPhotoUrl ? React.createElement('img', { src: embeddedPhotoUrl, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '22px', fontWeight: 'bold' } }, 'Foto Makanan Belum Tersedia')
      ]),
      // Right: Yellow Sticky Note Card
      React.createElement('div', {
        style: { width: '42%', backgroundColor: '#fef3c7', border: '2px solid #fde68a', borderRadius: '20px', padding: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 10px rgba(251, 191, 36, 0.15)' }
      }, [
        React.createElement('span', { style: { fontSize: '22px', fontWeight: 'bold', color: '#1e1b4b', marginBottom: '15px', borderBottom: '2px solid #fde68a', paddingBottom: '8px' } }, '📌 Menu Makanan'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          menuItems.map((item: string, idx: number) => React.createElement('span', { key: idx, style: { color: '#1e1b4b', fontSize: '18px', fontWeight: 'bold' } }, `• ${item}`))
        )
      ])
    ]),

    // Bottom Section: 2 Rounded Cards for Nutrition
    React.createElement('div', { style: { display: 'flex', width: '100%', gap: '30px', marginTop: 'auto' } }, [
      // Porsi Besar Card
      React.createElement('div', {
        style: { width: '50%', backgroundColor: '#fff1f2', border: '2px solid #fda4af', borderRadius: '20px', padding: '20px 25px', display: 'flex', flexDirection: 'column' }
      }, [
        React.createElement('span', { style: { fontSize: '18px', fontWeight: 'bold', fontStyle: 'italic', color: '#9f1239', textAlign: 'center', marginBottom: '12px', borderBottom: '1px solid #fecdd3', paddingBottom: '6px' } }, 'NILAI GIZI PORSI BESAR'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, [
          { label: 'Energi', val: `${energiBesar} Kkal` },
          { label: 'Protein', val: `${proteinBesar} g` },
          { label: 'Lemak', val: `${lemakBesar} g` },
          { label: 'Karbohidrat', val: `${karbohidratBesar} g` },
          { label: 'Serat', val: `${seratBesar} g` }
        ].map((r, i) => React.createElement('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', fontSize: '17px', color: '#1e1b4b' } }, [
          React.createElement('span', { style: { color: '#475569' } }, r.label),
          React.createElement('span', { style: { fontWeight: 'bold' } }, `: ${r.val}`)
        ])))
      ]),
      // Porsi Kecil Card
      React.createElement('div', {
        style: { width: '50%', backgroundColor: '#fff1f2', border: '2px solid #fda4af', borderRadius: '20px', padding: '20px 25px', display: 'flex', flexDirection: 'column' }
      }, [
        React.createElement('span', { style: { fontSize: '18px', fontWeight: 'bold', fontStyle: 'italic', color: '#9f1239', textAlign: 'center', marginBottom: '12px', borderBottom: '1px solid #fecdd3', paddingBottom: '6px' } }, 'NILAI GIZI PORSI KECIL'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, [
          { label: 'Energi', val: `${energiKecil} Kkal` },
          { label: 'Protein', val: `${proteinKecil} g` },
          { label: 'Lemak', val: `${lemakKecil} g` },
          { label: 'Karbohidrat', val: `${karbohidratKecil} g` },
          { label: 'Serat', val: `${seratKecil} g` }
        ].map((r, i) => React.createElement('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', fontSize: '17px', color: '#1e1b4b' } }, [
          React.createElement('span', { style: { color: '#475569' } }, r.label),
          React.createElement('span', { style: { fontWeight: 'bold' } }, `: ${r.val}`)
        ])))
      ])
    ])
  ]);
}

// ----------------------------------------------------
// TEMPLATE 3: Sky Blue Grid & Yellow Table (Ref Image 2)
// ----------------------------------------------------
function buildTemplate3(params: any) {
  const {
    logoBase64, embeddedPhotoUrl, sppgName, sppgAddress, formattedDate, menuItems, totalBeneficiaries,
    energiBesar, proteinBesar, lemakBesar, karbohidratBesar, seratBesar,
    energiKecil, proteinKecil, lemakKecil, karbohidratKecil, seratKecil
  } = params;

  return React.createElement('div', {
    style: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justify: 'space-between',
      backgroundColor: '#f0f9ff',
      backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
      backgroundSize: '35px 35px',
      padding: '50px 60px',
      fontFamily: 'Poppins',
      color: '#0f172a',
    }
  }, [
    // Header Banner
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '20px' } }, [
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } }, [
        React.createElement('div', { style: { width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } }, [
          logoBase64 ? React.createElement('img', { src: logoBase64, style: { width: '56px', height: '56px' } }) : null
        ]),
        React.createElement('span', { style: { fontSize: '18px', fontWeight: '900', color: '#0369a1' } }, 'BADAN GIZI NASIONAL')
      ]),
      React.createElement('div', { style: { backgroundColor: '#1e3a8a', color: '#ffffff', borderRadius: '30px', padding: '10px 25px', fontSize: '16px', fontWeight: 'bold' } }, sppgName)
    ]),

    // Title
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' } }, [
      React.createElement('span', { style: { fontSize: '72px', fontWeight: '900', color: '#0284c7', lineHeight: '1.1' } }, 'Menu MBG Hari ini'),
      React.createElement('span', { style: { fontSize: '22px', fontWeight: 'bold', color: '#334155', marginTop: '6px' } }, formattedDate)
    ]),

    // Image Frame
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '25px' } }, [
      React.createElement('div', { style: { width: '720px', height: '430px', borderRadius: '24px', border: '6px solid #0284c7', backgroundColor: '#ffffff', boxShadow: '0 15px 25px rgba(2, 132, 199, 0.15)', overflow: 'hidden', display: 'flex' } }, [
        embeddedPhotoUrl ? React.createElement('img', { src: embeddedPhotoUrl, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '24px', fontWeight: 'bold' } }, 'Foto Makanan Belum Tersedia')
      ])
    ]),

    // Nutrition Yellow Table
    React.createElement('div', { style: { width: '100%', backgroundColor: '#ffffff', border: '3px solid #1e3a8a', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' } }, [
      // Table Header Row (Yellow)
      React.createElement('div', { style: { display: 'flex', backgroundColor: '#fef08a', borderBottom: '2px solid #1e3a8a', padding: '12px 20px', fontWeight: 'bold', fontSize: '18px', color: '#1e3a8a' } }, [
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Porsi'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Energi'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Protein'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Lemak'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Karbohidrat')
      ]),
      // Row 1: Besar
      React.createElement('div', { style: { display: 'flex', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' } }, [
        React.createElement('span', { style: { width: '20%', textAlign: 'center', color: '#1e3a8a' } }, 'Besar'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${energiBesar} kkal`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${proteinBesar} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${lemakBesar} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${karbohidratBesar} g`)
      ]),
      // Row 2: Kecil
      React.createElement('div', { style: { display: 'flex', padding: '12px 20px', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' } }, [
        React.createElement('span', { style: { width: '20%', textAlign: 'center', color: '#0284c7' } }, 'Kecil'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${energiKecil} kkal`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${proteinKecil} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${lemakKecil} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${karbohidratKecil} g`)
      ])
    ]),

    // Floating Beneficiary Badge
    React.createElement('div', { style: { backgroundColor: '#ffffff', border: '2px solid #0284c7', borderRadius: '30px', padding: '10px 30px', fontSize: '18px', fontWeight: '900', color: '#0284c7', marginBottom: '15px' } }, `PM: ${totalBeneficiaries.toLocaleString('id-ID')} Porsi`),

    // Footer Wave Bar
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', backgroundColor: '#22c55e', borderRadius: '40px', padding: '15px 40px', marginTop: 'auto' } }, [
      React.createElement('span', { style: { color: '#ffffff', fontSize: '18px', fontWeight: '900' } }, `MBG ${sppgName} — Sehat & Bergizi`)
    ])
  ]);
}

// ----------------------------------------------------
// TEMPLATE 4: Bold Royal Blue & Starburst Badge (Ref Image 3)
// ----------------------------------------------------
function buildTemplate4(params: any) {
  const {
    embeddedPhotoUrl, sppgName, sppgAddress, formattedDate, menuItems, totalBeneficiaries,
    energiBesar, proteinBesar, lemakBesar, karbohidratBesar,
    energiKecil, proteinKecil, lemakKecil, karbohidratKecil
  } = params;

  return React.createElement('div', {
    style: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#1d4ed8',
      backgroundImage: 'linear-gradient(to bottom, #1d4ed8 0%, #1e40af 35%, #f8fafc 35%, #f8fafc 100%)',
      padding: '50px 60px',
      fontFamily: 'Poppins',
      color: '#ffffff',
    }
  }, [
    // Header
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '20px' } }, [
      React.createElement('span', { style: { fontSize: '20px', fontWeight: '900', color: '#ffffff' } }, sppgName),
      React.createElement('span', { style: { fontSize: '14px', color: '#93c5fd' } }, sppgAddress)
    ]),

    // Title
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px' } }, [
      React.createElement('span', { style: { fontSize: '76px', fontWeight: '900', color: '#ffffff', lineHeight: '1.0' } }, 'Menu MBG Hari ini'),
      React.createElement('div', { style: { backgroundColor: '#1e3a8a', color: '#ffffff', padding: '6px 25px', borderRadius: '20px', fontSize: '18px', fontWeight: 'bold', marginTop: '12px' } }, formattedDate)
    ]),

    // Main Card Container (White)
    React.createElement('div', {
      style: { width: '100%', backgroundColor: '#ffffff', borderRadius: '28px', border: '1px solid #cbd5e1', padding: '30px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 30px rgba(0,0,0,0.12)', position: 'relative' }
    }, [
      // Starburst Yellow Badge (Total Porsi)
      React.createElement('div', {
        style: { position: 'absolute', top: '-30px', left: '20px', backgroundColor: '#f59e0b', color: '#0f172a', borderRadius: '50%', width: '100px', height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 15px rgba(245, 158, 11, 0.4)', border: '4px solid #ffffff' }
      }, [
        React.createElement('span', { style: { fontSize: '20px', fontWeight: '900' } }, totalBeneficiaries.toLocaleString('id-ID')),
        React.createElement('span', { style: { fontSize: '12px', fontWeight: 'bold' } }, 'Porsi')
      ]),

      // Photo Frame inside Card
      React.createElement('div', { style: { width: '100%', height: '420px', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px', backgroundColor: '#edf2f7', border: '4px solid #f1f5f9' } }, [
        embeddedPhotoUrl ? React.createElement('img', { src: embeddedPhotoUrl, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '24px', fontWeight: 'bold' } }, 'Foto Makanan Belum Tersedia')
      ]),

      // Menu string list
      React.createElement('div', { style: { textAlign: 'center', marginBottom: '20px', padding: '0 10px' } }, [
        React.createElement('span', { style: { fontSize: '20px', fontWeight: 'bold', color: '#0f172a' } }, menuItems.join(' | '))
      ]),

      // Nutrition Table
      React.createElement('div', { style: { width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1e40af' } }, [
        // Table Header
        React.createElement('div', { style: { display: 'flex', backgroundColor: '#1e40af', color: '#ffffff', padding: '10px 15px', fontWeight: 'bold', fontSize: '16px' } }, [
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Nilai Gizi'),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Energi'),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Protein'),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Lemak'),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Karbohidrat')
        ]),
        // Row 1: Kecil
        React.createElement('div', { style: { display: 'flex', padding: '10px 15px', borderBottom: '1px solid #e2e8f0', fontSize: '16px', color: '#0f172a', backgroundColor: '#eff6ff' } }, [
          React.createElement('span', { style: { width: '20%', textAlign: 'center', fontWeight: 'bold' } }, 'Porsi Kecil'),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${energiKecil} kkal`),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${proteinKecil} g`),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${lemakKecil} g`),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${karbohidratKecil} g`)
        ]),
        // Row 2: Besar
        React.createElement('div', { style: { display: 'flex', padding: '10px 15px', fontSize: '16px', color: '#0f172a' } }, [
          React.createElement('span', { style: { width: '20%', textAlign: 'center', fontWeight: 'bold' } }, 'Porsi Besar'),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${energiBesar} kkal`),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${proteinBesar} g`),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${lemakBesar} g`),
          React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${karbohidratBesar} g`)
        ])
      ])
    ]),

    // Footer
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 'auto', paddingTop: '20px' } }, [
      React.createElement('span', { style: { color: '#475569', fontSize: '16px', fontWeight: 'bold' } }, `@sppg_official — ${sppgName}`)
    ])
  ]);
}

// ----------------------------------------------------
// TEMPLATE 5: Eco Green Fresh (Ref Image 4)
// ----------------------------------------------------
function buildTemplate5(params: any) {
  const {
    logoBase64, embeddedPhotoUrl, sppgName, formattedDate,
    energiBesar, proteinBesar, lemakBesar, karbohidratBesar, seratBesar,
    energiKecil, proteinKecil, lemakKecil, karbohidratKecil, seratKecil
  } = params;

  return React.createElement('div', {
    style: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justify: 'space-between',
      backgroundColor: '#ffffff',
      padding: '50px 60px',
      fontFamily: 'Poppins',
      color: '#15803d',
    }
  }, [
    // Header
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '20px' } }, [
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } }, [
        React.createElement('div', { style: { width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } }, [
          logoBase64 ? React.createElement('img', { src: logoBase64, style: { width: '56px', height: '56px' } }) : null
        ]),
        React.createElement('span', { style: { fontSize: '18px', fontWeight: '900', color: '#15803d' } }, 'BADAN GIZI NASIONAL')
      ]),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } }, [
        React.createElement('span', { style: { fontSize: '20px', fontWeight: 'bold', color: '#15803d' } }, sppgName),
        React.createElement('span', { style: { fontSize: '14px', color: '#65a30d' } }, formattedDate)
      ])
    ]),

    // Photo Card
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '25px' } }, [
      React.createElement('div', { style: { width: '720px', height: '440px', borderRadius: '24px', border: '6px solid #16a34a', backgroundColor: '#f0fdf4', boxShadow: '0 15px 25px rgba(22, 163, 74, 0.15)', overflow: 'hidden', display: 'flex' } }, [
        embeddedPhotoUrl ? React.createElement('img', { src: embeddedPhotoUrl, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '24px', fontWeight: 'bold' } }, 'Foto Makanan Belum Tersedia')
      ])
    ]),

    // Banner Text
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '25px' } }, [
      React.createElement('span', { style: { fontSize: '56px', fontWeight: '900', color: '#15803d', lineHeight: '1.1' } }, 'MENU MAKAN BERGIZI GRATIS'),
      React.createElement('span', { style: { fontSize: '18px', fontWeight: 'bold', color: '#4d7c0f', marginTop: '6px' } }, 'Jadilah bagian dari gerakan nasional untuk anak-anak Indonesia yang sehat dan cerdas')
    ]),

    // Nutrition Grid Table
    React.createElement('div', { style: { width: '100%', border: '2px solid #16a34a', borderRadius: '20px', overflow: 'hidden', marginBottom: '25px' } }, [
      // Table Header Row
      React.createElement('div', { style: { display: 'flex', backgroundColor: '#f0fdf4', borderBottom: '2px solid #16a34a', padding: '12px 15px', fontWeight: 'bold', fontSize: '18px', color: '#15803d' } }, [
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Karbohidrat'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Protein'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Lemak'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Serat'),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, 'Energi')
      ]),
      // Row 1: Besar
      React.createElement('div', { style: { display: 'flex', padding: '12px 15px', borderBottom: '1px solid #bbf7d0', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' } }, [
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${karbohidratBesar} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${proteinBesar} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${lemakBesar} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${seratBesar} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${energiBesar} kkal`)
      ]),
      // Row 2: Kecil
      React.createElement('div', { style: { display: 'flex', padding: '12px 15px', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' } }, [
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${karbohidratKecil} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${proteinKecil} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${lemakKecil} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${seratKecil} g`),
        React.createElement('span', { style: { width: '20%', textAlign: 'center' } }, `${energiKecil} kkal`)
      ])
    ]),

    // Footer
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', backgroundColor: '#15803d', borderRadius: '40px', padding: '15px 40px', marginTop: 'auto' } }, [
      React.createElement('span', { style: { color: '#ffffff', fontSize: '18px', fontWeight: '900' } }, `@sppg_official — ${sppgName}`)
    ])
  ]);
}

// ----------------------------------------------------
// TEMPLATE 6: Executive Gold & 5 Column Stat Pills (Ref Image 5)
// ----------------------------------------------------
function buildTemplate6(params: any) {
  const {
    logoBase64, embeddedPhotoUrl, sppgName, formattedDate, totalBeneficiaries,
    energiBesar, proteinBesar, lemakBesar, karbohidratBesar, seratBesar,
    energiKecil, proteinKecil, lemakKecil, karbohidratKecil, seratKecil
  } = params;

  return React.createElement('div', {
    style: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justify: 'space-between',
      backgroundColor: '#ffffff',
      padding: '50px 60px',
      fontFamily: 'Poppins',
      color: '#0f172a',
    }
  }, [
    // Header
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '15px' } }, [
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } }, [
        React.createElement('div', { style: { width: '56px', height: '56px', borderRadius: '28px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } }, [
          logoBase64 ? React.createElement('img', { src: logoBase64, style: { width: '56px', height: '56px' } }) : null
        ]),
        React.createElement('span', { style: { fontSize: '18px', fontWeight: '900', color: '#1e3a8a' } }, 'BADAN GIZI NASIONAL')
      ]),
      React.createElement('span', { style: { fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' } }, sppgName)
    ]),

    // Title
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' } }, [
      React.createElement('div', { style: { display: 'flex', gap: '12px', fontSize: '80px', fontWeight: '900', lineHeight: '1.0' } }, [
        React.createElement('span', { style: { color: '#1e3a8a' } }, 'MENU'),
        React.createElement('span', { style: { color: '#d97706' } }, 'MBG')
      ]),
      React.createElement('span', { style: { fontSize: '20px', fontWeight: 'bold', color: '#475569', marginTop: '6px' } }, formattedDate),
      React.createElement('span', { style: { fontSize: '22px', fontWeight: 'bold', color: '#15803d', marginTop: '4px' } }, 'Informasi Gizi')
    ]),

    // 5 Column Nutrition Pills (Energi, Protein, Lemak, Karbohidrat, Serat)
    React.createElement('div', { style: { display: 'flex', width: '100%', gap: '15px', marginBottom: '25px' } }, [
      { label: 'Energi', kecil: `${energiKecil} kkal`, besar: `${energiBesar} kkal` },
      { label: 'Protein', kecil: `${proteinKecil} g`, besar: `${proteinBesar} g` },
      { label: 'Lemak', kecil: `${lemakKecil} g`, besar: `${lemakBesar} g` },
      { label: 'Karbohidrat', kecil: `${karbohidratKecil} g`, besar: `${karbohidratBesar} g` },
      { label: 'Serat', kecil: `${seratKecil} g`, besar: `${seratBesar} g` }
    ].map((col, idx) => React.createElement('div', { key: idx, style: { width: '20%', display: 'flex', flexDirection: 'column', gap: '8px' } }, [
      React.createElement('div', { style: { backgroundColor: '#1e3a8a', color: '#ffffff', borderRadius: '15px', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' } }, col.label),
      React.createElement('div', { style: { backgroundColor: '#d97706', color: '#ffffff', borderRadius: '15px', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' } }, col.kecil),
      React.createElement('div', { style: { backgroundColor: '#b45309', color: '#ffffff', borderRadius: '15px', padding: '10px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' } }, col.besar)
    ]))),

    // Food Photo Frame
    React.createElement('div', { style: { display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '20px' } }, [
      React.createElement('div', { style: { width: '700px', height: '410px', borderRadius: '24px', border: '6px solid #1e3a8a', backgroundColor: '#edf2f7', overflow: 'hidden', display: 'flex' } }, [
        embeddedPhotoUrl ? React.createElement('img', { src: embeddedPhotoUrl, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '24px', fontWeight: 'bold' } }, 'Foto Makanan Belum Tersedia')
      ])
    ]),

    // Bottom Beneficiary Pill Badge
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', backgroundColor: '#1e3a8a', borderRadius: '30px', padding: '6px', color: '#ffffff', fontSize: '16px', fontWeight: 'bold', gap: '10px', marginTop: 'auto' } }, [
      React.createElement('span', { style: { paddingLeft: '20px' } }, 'Penerima Manfaat'),
      React.createElement('div', { style: { backgroundColor: '#d97706', borderRadius: '20px', padding: '6px 20px', color: '#ffffff' } }, `${totalBeneficiaries.toLocaleString('id-ID')} PM`)
    ])
  ]);
}

// ----------------------------------------------------
// MAIN GENERATE POSTER FUNCTION
// ----------------------------------------------------
export async function generatePoster(reportId: string, templateId: string = '1') {
  // 1. Fetch report data
  const { data: report, error: fetchError } = await supabase
    .from('mbg_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (fetchError || !report) {
    throw new Error('Report not found');
  }

  // 1.5. Fetch photo and convert to base64 if it exists
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

  // Extract menu and nutrition data
  const menuString = report.menu || '';
  const menuItems = menuString.split(/[,;\n]+/).map((item: string) => item.trim()).filter(Boolean);
  if (menuItems.length === 0) menuItems.push('-');

  const ext = (report.extracted_data || {}) as unknown as ExtractedMBGReport;
  const besarRaw = ext["Porsi Besar"] || ext.porsi_besar;
  const besar = (besarRaw && typeof besarRaw === "object") ? (besarRaw as ExtractedNutritionalInfo) : {};
  const kecilRaw = ext["Porsi Kecil"] || ext.porsi_kecil;
  const kecil = (kecilRaw && typeof kecilRaw === "object") ? (kecilRaw as ExtractedNutritionalInfo) : {};

  const totalBeneficiaries = (report.porsi_besar || 0) + (report.porsi_kecil || 0);

  const templateParams = {
    logoBase64,
    embeddedPhotoUrl,
    sppgName: ext.sppg_name || 'Sekolah Salford & Co.',
    sppgAddress: ext.sppg_address || 'Jl. H. Sinarah Ibrahim, Sikur, Kec. Sikur',
    formattedDate: formatIndonesianDate(report.tanggal),
    menuItems,
    totalBeneficiaries,
    energiBesar: besar.Energi || besar.energi || report.energi || 0,
    proteinBesar: besar.Protein || besar.protein || report.protein || 0,
    lemakBesar: besar.Lemak || besar.lemak || report.lemak || 0,
    karbohidratBesar: besar.Karbohidrat || besar.karbohidrat || report.karbohidrat || 0,
    seratBesar: besar.Serat || besar.serat || report.serat || 0,
    energiKecil: kecil.Energi || kecil.energi || 0,
    proteinKecil: kecil.Protein || kecil.protein || 0,
    lemakKecil: kecil.Lemak || kecil.lemak || 0,
    karbohidratKecil: kecil.Karbohidrat || kecil.karbohidrat || 0,
    seratKecil: kecil.Serat || kecil.serat || 0,
  };

  // Select Template Builder based on templateId
  let templateNode;
  switch (String(templateId)) {
    case '2':
      templateNode = buildTemplate2(templateParams);
      break;
    case '3':
      templateNode = buildTemplate3(templateParams);
      break;
    case '4':
      templateNode = buildTemplate4(templateParams);
      break;
    case '5':
      templateNode = buildTemplate5(templateParams);
      break;
    case '6':
      templateNode = buildTemplate6(templateParams);
      break;
    case '1':
    default:
      templateNode = buildTemplate1(templateParams);
      break;
  }

  // 3. Render HTML to SVG
  const svg = await satori(templateNode, {
    width: 1080,
    height: 1350,
    fonts: [{ name: 'Poppins', data: fontData, weight: 700, style: 'normal' }],
  });

  // 4. Convert SVG to PNG
  const resvg = new Resvg(svg, { background: 'rgba(255, 255, 255, 1)' });
  const pngData = resvg.render().asPng();

  // 5. Upload to Storage
  const fileName = `poster-${reportId}-t${templateId}-${Date.now()}.png`;
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
