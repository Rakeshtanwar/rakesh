"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";

export default function AdminPanel() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [brainDumps, setBrainDumps] = useState<any[]>([]);

  useEffect(() => {
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const qBrainDump = query(collection(db, "brain_dump"), orderBy("createdAt", "desc"));
    const unsubscribeBrainDump = onSnapshot(qBrainDump, (snapshot) => {
      setBrainDumps(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubscribeTasks(); unsubscribeBrainDump(); };
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    await addDoc(collection(db, "tasks"), { title: newTask, status: "pending", createdAt: serverTimestamp() });
    setNewTask("");
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    await updateDoc(doc(db, "tasks", id), { status: currentStatus === "pending" ? "completed" : "pending" });
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-6 md:p-12">
      <header className="mb-12 border-b border-emerald-500/30 pb-6">
        <h1 className="text-4xl font-bold text-emerald-400 tracking-wider flex items-center gap-3">
          <span className="text-2xl">🏴‍☠️</span> COMMAND CENTER
        </h1>
        <p className="text-slate-500 mt-2">Masterplan Execution & Tracker</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-black/50">
          <h2 className="text-2xl font-semibold text-emerald-300 mb-6 flex items-center gap-2">✅ Daily Missions</h2>
          <form onSubmit={addTask} className="flex gap-3 mb-8">
            <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Enter mission..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg">Add</button>
          </form>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <span className={`flex-1 cursor-pointer ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-300'}`} onClick={() => toggleTask(task.id, task.status)}>
                  {task.title}
                </span>
                <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-300 ml-4 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-black/50">
          <h2 className="text-2xl font-semibold text-cyan-400 mb-6 flex items-center gap-2">🧠 Brain Dump</h2>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {brainDumps.map((note) => (
              <div key={note.id} className="bg-slate-800/80 p-4 rounded-lg border-l-4 border-cyan-500">
                <p className="text-slate-300">{note.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
