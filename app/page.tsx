// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, setDoc, increment } from "firebase/firestore";

export default function AdminPanel() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [brainDumps, setBrainDumps] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  
  // XP & Ranking System
  const [xp, setXp] = useState(0);
  
  // Timer System
  const [timeLeft, setTimeLeft] = useState(50 * 60); // 50 mins in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [heistMode, setHeistMode] = useState(false);

  // Fetching Data (Tasks, Ideas, and XP)
  useEffect(() => {
    // Tasks Fetch
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Brain Dump Fetch
    const qBrainDump = query(collection(db, "brain_dump"), orderBy("createdAt", "desc"));
    const unsubscribeBrainDump = onSnapshot(qBrainDump, (snapshot) => {
      setBrainDumps(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // XP Fetch
    const unsubscribeXp = onSnapshot(doc(db, "stats", "mastermind"), (docSnap) => {
      if (docSnap.exists()) {
        setXp(docSnap.data().xp || 0);
      }
    });

    return () => { unsubscribeTasks(); unsubscribeBrainDump(); unsubscribeXp(); };
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      // Timer Finished - Add Bonus XP!
      setIsTimerRunning(false);
      setHeistMode(false);
      setTimeLeft(50 * 60);
      setDoc(doc(db, "stats", "mastermind"), { xp: increment(100) }, { merge: true });
      alert("Heist Successful! +100 Bonus XP Added.");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  // Task Management
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    // Note: AI auto-categorization only happens via Telegram. Web tasks get 'Manual' tag for now.
    await addDoc(collection(db, "tasks"), { title: newTask, status: "pending", tag: "Manual", createdAt: serverTimestamp() });
    setNewTask("");
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "completed" : "pending";
    await updateDoc(doc(db, "tasks", id), { status: newStatus });
    if (newStatus === "completed") {
      await setDoc(doc(db, "stats", "mastermind"), { xp: increment(50) }, { merge: true });
    }
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  // Helper formatting functions
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getRank = (xp: number) => {
    if (xp >= 5000) return "The Professor 👑";
    if (xp >= 2000) return "Mastermind 🧠";
    if (xp >= 500) return "Hacker 💻";
    return "Recruit 🔰";
  };

  const nextLevelXp = xp < 500 ? 500 : xp < 2000 ? 2000 : xp < 5000 ? 5000 : 10000;
  const progressPercent = Math.min((xp / nextLevelXp) * 100, 100);

  // Dynamic Theme Colors
  const themeBg = heistMode ? "bg-red-950" : "bg-slate-950";
  const themeBorder = heistMode ? "border-red-500/50" : "border-emerald-500/30";
  const themeText = heistMode ? "text-red-400" : "text-emerald-400";
  const panelBg = heistMode ? "bg-red-900/20" : "bg-slate-900/50";

  return (
    <div className={`min-h-screen ${themeBg} text-slate-300 font-sans p-4 md:p-8 transition-colors duration-700`}>
      
      {/* 🌟 Top Header & Level Progress */}
      <header className={`mb-10 border-b ${themeBorder} pb-6`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className={`text-3xl md:text-4xl font-bold tracking-wider flex items-center gap-3 ${themeText} drop-shadow-lg`}>
            <span className="text-2xl">{heistMode ? "⏳" : "🏴‍☠️"}</span> 
            {heistMode ? "HEIST IN PROGRESS..." : "COMMAND CENTER"}
          </h1>
          
          <div className="w-full md:w-1/3 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-inner">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold text-cyan-400">{getRank(xp)}</span>
              <span className="text-slate-400">{xp} / {nextLevelXp} XP</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-1000 ${heistMode ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-cyan-500 shadow-[0_0_10px_cyan]'}`} 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Timer & Tasks */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* ⏳ Focus Timer (Heist Mode) */}
          <section className={`${panelBg} p-6 md:p-8 rounded-2xl border ${heistMode ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-slate-800 shadow-xl'}`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className={`text-2xl font-semibold mb-2 flex items-center gap-2 ${themeText}`}>
                  {heistMode ? "🔴 Strict Focus ON" : "⏱️ Execute Masterplan"}
                </h2>
                <p className="text-sm text-slate-400">Complete 50 mins without distraction for +100 XP.</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className={`text-6xl font-mono font-bold tracking-widest mb-4 ${heistMode ? 'text-red-500 drop-shadow-[0_0_15px_red]' : 'text-slate-100'}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setIsTimerRunning(!isTimerRunning); setHeistMode(true); }}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${isTimerRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'}`}
                  >
                    {isTimerRunning ? "PAUSE" : "START HEIST"}
                  </button>
                  <button 
                    onClick={() => { setIsTimerRunning(false); setTimeLeft(50 * 60); setHeistMode(false); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                  >
                    RESET
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ✅ Daily Missions */}
          <section className={`${panelBg} p-6 rounded-2xl border border-slate-800 shadow-xl`}>
            <h2 className="text-2xl font-semibold text-emerald-300 mb-6 flex items-center gap-2">✅ Active Missions</h2>
            <form onSubmit={addTask} className="flex gap-3 mb-6">
              <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add quick mission..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium">Add</button>
            </form>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {tasks.map((task) => (
                <div key={task.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${task.status === 'completed' ? 'bg-slate-900/30 border-slate-800/50' : 'bg-slate-800/60 border-slate-700/50 hover:border-emerald-500/50'}`}>
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <button onClick={() => toggleTask(task.id, task.status)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                      {task.status === 'completed' && <span className="text-black text-xs font-bold">✓</span>}
                    </button>
                    <span className={`truncate cursor-pointer ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}`} onClick={() => toggleTask(task.id, task.status)}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {/* Tag rendering with dynamic colors */}
                    {task.tag && (
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full 
                        ${task.tag === 'Study' ? 'bg-blue-500/20 text-blue-400' : 
                          task.tag === 'Dev' ? 'bg-purple-500/20 text-purple-400' : 
                          task.tag === 'YouTube' ? 'bg-red-500/20 text-red-400' : 
                          'bg-slate-700 text-slate-300'}`}>
                        {task.tag}
                      </span>
                    )}
                    <button onClick={() => deleteTask(task.id)} className="text-red-400/50 hover:text-red-400 text-sm">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Brain Dump */}
        <div className="lg:col-span-5 space-y-8">
          <section className={`${panelBg} p-6 rounded-2xl border border-slate-800 shadow-xl h-full flex flex-col max-h-[800px]`}>
            <h2 className="text-2xl font-semibold text-cyan-400 mb-2 flex items-center gap-2">🧠 The Brain Dump</h2>
            <p className="text-sm text-slate-500 mb-6">Synced directly from Telegram signals.</p>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {brainDumps.length === 0 ? (
                <p className="text-slate-600 italic text-center mt-10">Waiting for intelligence... Send a note via Telegram.</p>
              ) : (
                brainDumps.map((note) => (
                  <div key={note.id} className="bg-slate-950/80 p-4 rounded-lg border-l-4 border-cyan-500 shadow-sm relative group">
                    <p className="text-slate-300 whitespace-pre-wrap text-sm">{note.text}</p>
                    <div className="text-[10px] text-slate-600 mt-2 text-right">
                      {note.createdAt ? new Date(note.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
