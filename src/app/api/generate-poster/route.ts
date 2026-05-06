import { NextResponse } from 'next/server';
import { generatePoster } from '@/lib/poster-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const publicUrl = await generatePoster(id);

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      id: id
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate Poster Error:', error);
    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}
