import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '../prompttemplate/route';

const groq = new Groq({
  apiKey: process.env.grok_api,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
    });


    return NextResponse.json({ 
      text: chatCompletion.choices[0]?.message?.content || "No response from AI" 
    });
  } catch (error: any) {
    console.error('Groq API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}


