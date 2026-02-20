import React, { useState } from 'react';
import { FolderOpen, Sparkles, Command, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WelcomeScreen({ onProjectSelect }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSelect = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:8000/select-workspace-native', {
                method: 'POST'
            });
            const data = await res.json();

            if (data.status === 'success') {
                onProjectSelect(data.path);
            } else if (data.status === 'cancelled') {
                setIsLoading(false);
            } else {
                throw new Error(data.message || "Failed to select project");
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="z-10 flex flex-col items-center max-w-2xl w-full px-6"
            >
                {/* Logo / Icon */}
                <div className="w-16 h-16 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/10 ring-1 ring-white/5">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent mb-4 tracking-tight">
                    Welcome to Nexus
                </h1>

                {/* Subtitle */}
                <p className="text-slate-400 text-center text-lg mb-12 max-w-md leading-relaxed">
                    Your intelligent, context-aware coding companion. Select a project to begin vibe coding.
                </p>

                {/* Action Card */}
                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.8)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSelect}
                    disabled={isLoading}
                    className="group relative w-full max-w-md bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 flex items-center justify-between cursor-pointer transition-all shadow-xl hover:shadow-indigo-500/20 ring-1 ring-white/5 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                            <FolderOpen className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-slate-200 font-semibold mb-1 group-hover:text-white transition-colors">Open Project</h3>
                            <p className="text-slate-500 text-sm">Select a folder to start coding</p>
                        </div>
                    </div>
                    <div className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                        <ArrowRight className="w-5 h-5" />
                    </div>

                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
                            <div className="flex items-center gap-2 text-indigo-400 font-medium">
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                Opening...
                            </div>
                        </div>
                    )}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onProjectSelect(null)} // Pass null to indicate "General Chat"
                    className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                >
                    Or just continue to chat &rarr;
                </motion.button>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2"
                    >
                        <span>⚠️</span> {error}
                    </motion.div>
                )}

                {/* Shortcuts / Footer */}
                <div className="mt-16 flex gap-8 text-xs text-slate-600 font-medium uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 hover:text-slate-400 transition-colors cursor-help" title="Just start coding">
                        <Command className="w-3 h-3" /> Context Aware
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-slate-400 transition-colors cursor-help" title="Integrated Terminal">
                        <span className="font-mono">$_</span> Terminal Ready
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-slate-400 transition-colors cursor-help" title="Live Preview">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Preview
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
