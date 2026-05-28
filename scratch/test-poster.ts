import fs from 'fs';
import path from 'path';

// Manually parse .env.local to avoid adding npm dependencies before dynamic imports
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual > 0) {
        const key = trimmed.slice(0, firstEqual).trim().replace(/\r/g, "");
        const value = trimmed.slice(firstEqual + 1).trim().replace(/\r/g, "");
        process.env[key] = value;
        // Also set public equivalents if any
        if (key.startsWith('NEXT_PUBLIC_')) {
          process.env[key] = value;
        }
      }
    }
  }
}

async function run() {
  // Dynamically import generatePoster so env variables are already loaded
  const { generatePoster } = await import('../src/lib/poster-service');
  
  let reportId = process.argv[2];
  
  if (!reportId) {
    console.log('No report ID provided. Fetching latest report from supabase...');
    const { supabase } = await import('../src/lib/supabase');
    const { data, error } = await supabase
      .from('mbg_reports')
      .select('id, tanggal, menu, photo_url, extracted_data')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest report:', error);
      process.exit(1);
    }
    if (!data) {
      console.error('No reports found in the database.');
      process.exit(1);
    }
    reportId = data.id;
    console.log(`Found latest report: ID=${data.id}, Tanggal=${data.tanggal}, Menu=${data.menu}, PhotoURL=${data.photo_url}`);
  }

  console.log(`Testing generatePoster for report ID: ${reportId}`);
  try {
    const url = await generatePoster(reportId);
    console.log('SUCCESS! Poster generated and uploaded:', url);
  } catch (error) {
    console.error('ERROR generating poster:', error);
  }
}

run();
