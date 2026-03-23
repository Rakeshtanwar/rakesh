// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const MY_TELEGRAM_ID = Number(process.env.MY_TELEGRAM_ID);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

    // Save idea to Firebase Brain Dump
    if (text.toLowerCase().startsWith('note:') || text.toLowerCase().startsWith('idea:')) {
      await addDoc(collection(db, "brain_dump"), {
        text: text,
        createdAt: serverTimestamp(),
      });
      await sendMessage(chatId, "✅ Idea securely logged in the Command Center.");
      return NextResponse.json({ ok: true });
    }
    // Save Direct Task to Command Center
    if (text.toLowerCase().startsWith('task:')) {
      const taskTitle = text.substring(5).trim();
      await addDoc(collection(db, "tasks"), {
        title: taskTitle,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await sendMessage(chatId, `🎯 Mission Accepted: "${taskTitle}" Command Center mein add ho gaya hai.`);
      return NextResponse.json({ ok: true });
    }

    // 🚀 DIRECT GEMINI REST API CALL (Aapka Logic)
    const prompt = `You are a strict, smart personal assistant. The user said: "${text}". Give a short, helpful, and energetic response.`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error ? data.error.message : "AI Engine Failed");
    }

    // AI ka reply nikalna
    const aiResponseText = data.candidates[0].content.parts[0].text;
    
    // Telegram par AI ka reply bhejna
    await sendMessage(chatId, aiResponseText);
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("System Error:", error);
    await sendMessage(MY_TELEGRAM_ID, `⚠️ AI Error: ${error.message || "Something went wrong."}`);
    return NextResponse.json({ ok: true });
  }
}
