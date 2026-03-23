import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const MY_TELEGRAM_ID = Number(process.env.MY_TELEGRAM_ID);

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  });
}

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const message = update.message;

    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text;

    // Security check
    if (chatId !== MY_TELEGRAM_ID) {
      await sendMessage(chatId, "Access Denied! System Locked. 🔒");
      return NextResponse.json({ ok: true });
    }

    // Start command
    if (text === '/start') {
      await sendMessage(chatId, "Aye aye, Captain! 🏴‍☠️ Command Center is online. Send a note or say Hi!");
      return NextResponse.json({ ok: true });
    }

    // Save idea to Firebase
    if (text.toLowerCase().startsWith('note:') || text.toLowerCase().startsWith('idea:')) {
      await addDoc(collection(db, "brain_dump"), {
        text: text,
        createdAt: serverTimestamp(),
      });
      await sendMessage(chatId, "✅ Idea securely logged in the Command Center.");
      return NextResponse.json({ ok: true });
    }

    // Gemini AI Processing
    const prompt = `You are a strict, smart personal assistant. The user said: "${text}". Give a short, helpful response.`;
    const aiResult = await geminiModel.generateContent(prompt);
    
    await sendMessage(chatId, aiResult.response.text());
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    // 🚨 Asli error ab Telegram par aayega aur logs mein bhi print hoga!
    console.error("System Error:", error);
    await sendMessage(MY_TELEGRAM_ID, `⚠️ AI Error: ${error.message || "Something went wrong with Gemini."}`);
    return NextResponse.json({ ok: true });
  }
}
