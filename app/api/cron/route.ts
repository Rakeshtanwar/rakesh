// app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { morningWishes, afternoonWishes, eveningWishes, nightWishes, getRandomWish } from '@/lib/greetings';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MY_TELEGRAM_ID = Number(process.env.MY_TELEGRAM_ID);

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timeOfDay = searchParams.get('time');

  let messageArray: string[] = [];
  if (timeOfDay === 'morning') messageArray = morningWishes;
  else if (timeOfDay === 'afternoon') messageArray = afternoonWishes;
  else if (timeOfDay === 'evening') messageArray = eveningWishes;
  else if (timeOfDay === 'night') messageArray = nightWishes;
  else return NextResponse.json({ error: 'Invalid time' }, { status: 400 });

  const randomMessage = getRandomWish(messageArray);

  // 🔥 Firebase se Pending Tasks Fetch Karna
  let taskListText = "";
  try {
    const q = query(collection(db, "tasks"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      taskListText = "\n\n📋 *Aaj Ke Daily Missions:*\n";
      let counter = 1;
      querySnapshot.forEach((doc) => {
        taskListText += `${counter}. 🎯 ${doc.data().title}\n`;
        counter++;
      });
    } else {
      taskListText = "\n\n📋 *Aaj koi pending mission nahi hai. Command Center check karein!*";
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
  }

  // Greeting aur Tasks ko jodh kar final message banana
  const finalMessage = randomMessage + taskListText;

  // Telegram ko bhejna (Markdown mode ke sath taaki Bold/Italic kaam kare)
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: MY_TELEGRAM_ID, 
      text: finalMessage,
      parse_mode: 'Markdown' 
    }),
  });

  return NextResponse.json({ success: true });
}
