export const morningWishes = [
  "🌸🌸 Good Morning! 🌸🌸 'Time is greater than money.' - The Professor. Aaj ka masterplan ready hai. Apne pehle study slot aur main tasks ko flawlessly execute karna shuru karo. ✅",
  "🌻🌤️ Rise and Shine! 🌤️🌻 'Not all treasure is silver and gold, mate.' 🏴‍☠️💰 Apna focus set karo aur aaj ke daily missions conquer karne nikal pado!"
];

export const afternoonWishes = [
  "🌞☕ Afternoon Check-in! ☕🌞 'For everything to be perfect, we must stick to the plan.' Break over! Wapas apne important tasks aur learning modules par focus karne ka time aa gaya hai. ✅",
  "☀️🔥 Good Afternoon! 🔥☀️ 'A lot of people believe that the heist is over once you have the money... No, that's just the beginning.' Ek slot khatam hua hai, par streak abhi baaki hai. Keep pushing! ✅"
];

export const eveningWishes = [
  "🌤️🍂 Evening Vibes! 🍂🌤️ 'First rule of a heist: No names, no personal questions... ' Sirf pure focus! Kya aaj ke daily targets hit hue? ✅ Jaldi se admin panel mein update karo.",
  "🏴‍☠️💰 Good Evening, Captain! 💰🏴‍☠️ 'Hope is like dominoes. Once one falls, the rest follow.' Time to review the day's loot! Apne pending projects complete karne ka aakhri push do."
];

export const nightWishes = [
  "🌙✨ Good Night! ✨🌙 'I've spent my life planning this...' Aaj ka execution ekdum solid tha. Kal ki strategy system mein set ho chuki hai. ✅ Ab aaram karo!",
  "😴🌟 Sweet Dreams! 🌟😴 'Sometimes, a truce is the most important part of a war.' Dimaag ko ab thoda aaram do, kal naye battle ke liye energy bacha kar rakhni hai."
];

export function getRandomWish(wishesArray: string[]) {
  return wishesArray[Math.floor(Math.random() * wishesArray.length)];
}
