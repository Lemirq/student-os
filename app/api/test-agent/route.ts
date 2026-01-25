import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://localhost:3001/agents/spawn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.AGENT_SERVICE_API_KEY || '',
      },
      body: JSON.stringify({
        userId: '8ee26315-f43d-4e3b-8ae4-b2635173e1a8',
        prompt: 'Go to google.com and search for "cats". Take a screenshot.'
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: 'Backend failed', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
