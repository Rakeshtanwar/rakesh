// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

export default function AdminPanel() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [brainDumps, setBrainDumps] = useState<any[]>([]);

  // Firebase se real-time data fetch karna
  useEffect(() => {
    // Tasks Fetching
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Brain Dump Fetching
    const qBrainDump = query(collection(db, "brain_dump"), orderBy("createdAt", "desc"));
    const unsubscribeBrainDump = onSnapshot(qBrainDump, (snapshot) => {
      setBrainDumps(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeBrainDump();
    };
  }, []);

  // Naya Task Add karne ka function
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    await addDoc(collection(db, "tasks"), {
      title: newTask,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setNewTask("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 md:p-12">
      {/* Header Section */}
      <header className="mb-12 border-b border-emerald-500/30 pb-6">
        <h1 className="text-4xl font-bold text-emerald-400 tracking-wider flex items-center gap-3">
          <span className="text-2xl">🏴‍☠️</span> COMMAND CENTER
        </h1>
        <p className="text-slate-500 mt-2">Masterplan Execution & Tracker</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Task Manager */}
        <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-black/50">
          <h2 className="text-2xl font-semibold text-emerald-300 mb-6 flex items-center gap-2">
            ✅ Daily Missions
          </h2>
          
          {/* Add Task Form */}
          <form onSubmit={addTask} className="flex gap-3 mb-8">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Enter tomorrow's mission..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-emerald-600/20"
            >
              Add
            </button>
          </form>

          {/* Task List */}
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-slate-600 italic">No missions set yet. Plan your next move.</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 hover:border-emerald-500/50 transition-colors">
                  <span className="text-slate-300">{task.title}</span>
                  <span className={`text-xs px-3 py-1 rounded-full ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Brain Dump & Notes */}
        <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-black/50">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-6 flex items-center gap-2">
            🧠 Brain Dump
          </h2>
          <p className="text-sm text-slate-500 mb-6">Ideas synced directly from Telegram bot.</p>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {brainDumps.length === 0 ? (
              <p className="text-slate-600 italic">Your mind is clear. Send an idea to the bot to log it here.</p>
            ) : (
              brainDumps.map((note) => (
                <div key={note.id} className="bg-slate-800/80 p-4 rounded-lg border-l-4 border-cyan-500">
                  <p className="text-slate-300 whitespace-pre-wrap">{note.text}</p>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
