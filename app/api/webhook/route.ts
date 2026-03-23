// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const MY_TELEGRAM_ID = Number(process.env.MY_TELEGRAM_ID);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Message bhejne ka function (with optional inline buttons)
async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Button click ka loading rokne ka function
async function answerCallback(callbackQueryId: string, text: string) {
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text }),
  });
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    // ==========================================
    // 🕹️ FEATURE 2 & 1: TELEGRAM BUTTONS & XP
    // ==========================================
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data; // Example: "done_TASKID"
      
      if (data.startsWith('done_')) {
        const taskId = data.split('_')[1];
        
        // Task ko complete mark karo
        await updateDoc(doc(db, "tasks", taskId), { status: "completed" });
        
        // Mastermind XP System: +50 XP add karo
        await setDoc(doc(db, "stats", "mastermind"), { xp: increment(50) }, { merge: true });

        await answerCallback(cb.id, "✅ Mission Accomplished! +50 XP Gained.");
        await sendMessage(MY_TELEGRAM_ID, `🔥 Task Completed! Tumhe **+50 XP** mil gaye hain. The Professor is proud.`);
      }
      return NextResponse.json({ ok: true });
    }

    // Normal message handling
    const message = update.message;
    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text;

    if (chatId !== MY_TELEGRAM_ID) {
      await sendMessage(chatId, "Access Denied! System Locked. 🔒");
      return NextResponse.json({ ok: true });
    }

    if (text === '/start') {
      await sendMessage(chatId, "Aye aye, Captain! 🏴‍☠️ Command Center is online. XP System Activated.");
      return NextResponse.json({ ok: true });
    }

    if (text.toLowerCase().startsWith('note:') || text.toLowerCase().startsWith('idea:')) {
      await addDoc(collection(db, "brain_dump"), { text: text, createdAt: serverTimestamp() });
      await sendMessage(chatId, "✅ Idea securely logged in the Command Center.");
      return NextResponse.json({ ok: true });
    }

    // ==========================================
    // 🧠 FEATURE 5: AI AUTO-CATEGORIZATION
    // ==========================================
    if (text.toLowerCase().startsWith('task:')) {
      const taskTitle = text.substring(5).trim();
      
      // Gemini ko bolkar task ka Category tag nikalwana
      const catPrompt = `Analyze this task: "${taskTitle}". Categorize it into EXACTLY ONE of these words: 
      - 'Study' (if it relates to MSc Physics, SSC CGL, CDS, BSF RO, Airforce X Group, mock tests, etc.)
      - 'YouTube' (if it relates to NextGen Droids, video editing, scripts)
      - 'Dev' (if it relates to HyperOS themes, Blogger website, coding)
      - 'Life' (for workouts, reading, habits)
      Reply with ONLY the exact category word.`;
      
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: catPrompt }] }] })
      });
      const aiData = await response.json();
      const category = aiData.candidates[0].content.parts[0].text.trim().replace(/[^a-zA-Z]/g, '');

      // Database mein Task + Category save karna
      const docRef = await addDoc(collection(db, "tasks"), {
        title: taskTitle,
        status: "pending",
        tag: category, // AI ne jo tag diya
        createdAt: serverTimestamp(),
      });

      // Telegram Button UI Banana
      const inlineKeyboard = {
        inline_keyboard: [[{ text: "✅ Mark Done (+50 XP)", callback_data: `done_${docRef.id}` }]]
      };

      await sendMessage(chatId, `🎯 Mission Accepted!\n\n**Task:** ${taskTitle}\n**Tag:** 🏷️ ${category}\n\n*Click below when finished:*`, inlineKeyboard);
      return NextResponse.json({ ok: true });
    }

    // Direct AI Chat
    const prompt = `You are a strict, smart personal assistant. The user said: "${text}". Give a short, helpful, and energetic response.`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await response.json();
    await sendMessage(chatId, data.candidates[0].content.parts[0].text);
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("System Error:", error);
    await sendMessage(MY_TELEGRAM_ID, `⚠️ System Error: ${error.message}`);
    return NextResponse.json({ ok: true });
  }
}
