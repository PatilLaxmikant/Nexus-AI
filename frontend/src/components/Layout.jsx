import React from 'react';
import { Bot, Home, Settings, Activity } from 'lucide-react';

export default function Layout({ children }) {
    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Sidebar background with blurred orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[100px] animate-pulse delay-1000" />
            </div>

            {/* Sidebar */}
            <aside className="w-20 lg:w-64 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 z-20 flex flex-col transition-all duration-300">
                <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-700/50">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                        <Bot className="w-8 h-8 text-indigo-400 relative z-10" />
                    </div>
                    <span className="ml-3 font-bold text-xl tracking-tight hidden lg:block bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                        Nexus AI
                    </span>
                </div>

                <nav className="flex-1 py-6 flex flex-col gap-2 px-2 lg:px-4">
                    <NavItem icon={<Home />} label="Chat" active />
                    <NavItem icon={<Activity />} label="Activity" />
                    <NavItem icon={<Settings />} label="Settings" />
                </nav>

                <div className="p-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                            U
                        </div>
                        <div className="hidden lg:block text-sm">
                            <p className="font-medium text-slate-200">User</p>
                            <p className="text-slate-400 text-xs">Pro Plan</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative z-10 min-w-0">
                {children}
            </main>
        </div>
    );
}

function NavItem({ icon, label, active }) {
    return (
        <button
            className={`
        flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden
        ${active
                    ? 'bg-indigo-600/10 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }
      `}
        >
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
            )}
            {React.cloneElement(icon, { size: 22 })}
            <span className="hidden lg:block font-medium">{label}</span>

            {!active && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
            )}
        </button>
    );
}
