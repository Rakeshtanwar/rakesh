// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, setDoc, query, where, getDocs } from 'firebase/firestore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const MY_TELEGRAM_ID = Number(process.env.MY_TELEGRAM_ID);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper: Send Message to Telegram
async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Helper: Send GIF/Animation
async function sendAnimation(chatId: number, animationUrl: string, caption?: string) {
  await fetch(`${TELEGRAM_API_URL}/sendAnimation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, animation: animationUrl, caption: caption, parse_mode: 'Markdown' }),
  });
}

// Helper: Safe Gemini API Fetcher (Crash Proof)
async function getGeminiResponse(prompt: string, isCategory: boolean = false) {
  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    
    // Safely check if valid response exists
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.trim();
    } else {
        console.error("Gemini Error / Blocked:", data);
        return isCategory ? "Manual" : "⚠️ PROFESSOR, AI Core me kuch interference hai. Please try again.";
    }
  } catch (e) {
     console.error("Fetch Error:", e);
     return isCategory ? "Manual" : "⚠️ PROFESSOR, Main server se connection lost ho gaya hai.";
  }
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    // ==========================================
    // 🕹️ BUTTON CLICKS (Task Complete Tracker)
    // ==========================================
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data; 
      
      if (data.startsWith('done_')) {
        const taskId = data.split('_')[1];
        
        // Mark task as completed in Firebase
        await updateDoc(doc(db, "tasks", taskId), { status: "completed" });
        await setDoc(doc(db, "stats", "mastermind"), { xp: increment(50) }, { merge: true });

        // Show cool Popup Alert in Telegram
        await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            callback_query_id: cb.id, 
            text: "✅ Target Destroyed! +50 XP Added to your profile, Professor.", 
            show_alert: true 
          }),
        });
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text;

    // Security
    if (chatId !== MY_TELEGRAM_ID) {
      await sendMessage(chatId, "Access Denied! Intruder detected. 🔒");
      return NextResponse.json({ ok: true });
    }

    // ==========================================
    // 🌅 THE '/live' COMMAND (Advanced Dashboard)
    // ==========================================
    if (text === '/live') {
        // Calculate IST Time safely
        const istTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const hour = istTime.getHours();
        
        let greeting = "Good Night 🌙";
        if (hour >= 4 && hour < 12) greeting = "Good Morning 🌅";
        else if (hour >= 12 && hour < 17) greeting = "Good Afternoon ☀️";
        else if (hour >= 17 && hour < 21) greeting = "Good Evening 🌆";

        // Fetch Pending Tasks
        const q = query(collection(db, "tasks"), where("status", "==", "pending"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            await sendAnimation(chatId, "https://media.giphy.com/media/26tn33aiTi1jIGsnu/giphy.gif", `🤖 *${greeting}, PROFESSOR!*\n\nSir, system completely clear hai. Aaj ke liye koi pending tasks nahi bache hain. You can rest now. ✨`);
            return NextResponse.json({ ok: true });
        }

        // Build Consolidated Message & Stacked Buttons
        let taskText = `🤖 *${greeting}, PROFESSOR!*\n\nFRIDAY online. Here is your current mission briefing:\n\n`;
        let keyboard: any[] = [];
        let counter = 1;

        snapshot.forEach((doc) => {
            const task = doc.data();
            taskText += `*${counter}.* ${task.title}  [ 🏷️ _${task.tag || 'Manual'}_ ]\n`;
            
            // Add button strictly under the message (Stacked Array)
            keyboard.push([{ text: `✅ Complete Mission ${counter}`, callback_data: `done_${doc.id}` }]);
            counter++;
        });

        taskText += `\nAwaiting your commands, Sir. ⚡`;

        await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: taskText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            })
        });

        return NextResponse.json({ ok: true });
    }

    // ==========================================
    // 🧠 TASK ADDER (Safe AI)
    // ==========================================
    if (text.toLowerCase().startsWith('task:')) {
      const taskTitle = text.substring(5).trim();
      
      const catPrompt = `Categorize this task into ONE exact word (Study, YouTube, Dev, or Life): "${taskTitle}"`;
      let category = await getGeminiResponse(catPrompt, true);
      category = category.replace(/[^a-zA-Z]/g, ''); // Clean up extra spaces/symbols
      
      // Ab error hone par bhi data definitely save hoga
      await addDoc(collection(db, "tasks"), {
        title: taskTitle,
        status: "pending",
        tag: category || 'Manual',
        createdAt: serverTimestamp(),
      });

      await sendMessage(chatId, `🚀 **Mission Registered, PROFESSOR!**\n\n**Task:** ${taskTitle}\n**System Tag:** 🏷️ ${category || 'Manual'}\n\nType \`/live\` anytime to see all active missions.`);
      return NextResponse.json({ ok: true });
    }

    // Notes
    if (text.toLowerCase().startsWith('note:') || text.toLowerCase().startsWith('idea:')) {
      await addDoc(collection(db, "brain_dump"), { text: text, createdAt: serverTimestamp() });
      await sendMessage(chatId, "✅ Memory saved. Data securely logged in the vault, Professor.");
      return NextResponse.json({ ok: true });
    }

    // ==========================================
    // 🤖 FRIDAY PERSONA CHAT
    // ==========================================
    const prompt = `You are FRIDAY, an ultra-advanced, highly intelligent, and loyal AI assistant created by "PROFESSOR". Respond to the Professor's input in a highly professional, cool, and sci-fi manner using a mix of Hindi and English (Hinglish). Keep it concise, energetic, and highly respectful. Treat the Professor as your ultimate commander. The Professor says: "${text}"`;
    
    const aiResponse = await getGeminiResponse(prompt, false);
    await sendMessage(chatId, aiResponse);
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("System Error:", error);
    await sendMessage(MY_TELEGRAM_ID, `⚠️ Core System Error: ${error.message}`);
    return NextResponse.json({ ok: true });
  }
}
