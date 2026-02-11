/* eslint-disable @typescript-eslint/no-explicit-any */
import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.grok_api,
});

export async function POST(req: Request) {
  try {
    const { text, voice = "daniel" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const audioResponse = await groq.audio.speech.create({
      model: "canopylabs/orpheus-v1-english",
      voice: voice,
      input: text,
      response_format: "wav" // or "mp3"
    });

    // The SDK returns a standard response-like object or buffer. 
    // In Node environments with groq-sdk, create() typically returns a response object with .arrayBuffer() or similar
    // for handling binary data.
    
    const buffer = await audioResponse.arrayBuffer();

    // Return the audio as a wav file response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.byteLength.toString(),
      },
    });

  } catch (error: any) {
    console.error('Groq TTS API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
