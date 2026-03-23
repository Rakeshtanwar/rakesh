import { NextResponse } from 'next/server';
import { morningWishes, afternoonWishes, eveningWishes, nightWishes, getRandomWish } from '@/lib/greetings';

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

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: MY_TELEGRAM_ID, text: randomMessage }),
  });

  return NextResponse.json({ success: true });
}
