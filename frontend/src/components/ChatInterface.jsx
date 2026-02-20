import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2, Cpu, Terminal, Sparkles, AlertCircle, Paperclip, Mic, MicOff, Volume2, Settings, Code, Maximize2 } from 'lucide-react';
import SettingsModal from './SettingsModal';
import ArtifactPanel from './ArtifactPanel';
import FileExplorer from './FileExplorer';
import PreviewPanel from './PreviewPanel';
import TerminalPanel from './Terminal'; // Renaming import to avoid conflict with lucide-react Terminal icon
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speakingInfo, setSpeakingInfo] = useState(null); // { id: msgIdx, status: 'playing' }
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);
    const [settings, setSettings] = useState({
        modelName: "gemini-2.5-flash",
        temperature: 0.7,
        systemPrompt: "You are Nexus AI, an intelligent coding assistant. - When asked to create or modify code, ALWAYS use the 'write_file' tool to save the code directly to the file. - If the user asks for a React component, create it in a suitable file (e.g., src/components/MyComponent.jsx). - After writing a file, confirm to the user that it has been created.",
        jsonMode: false
    });
    const [activeArtifact, setActiveArtifact] = useState(null); // { content, language }
    const [previewFiles, setPreviewFiles] = useState(null); // { filename: content }
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const baseInputRef = useRef(''); // Stores input before current speech session
    const synthRef = useRef(window.speechSynthesis);
    const threadId = useRef(Math.random().toString(36).substring(7)).current;

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let transcript = '';
                // Get the full transcript of the current session
                for (let i = 0; i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript;
                }
                if (transcript) {
                    // Combine base input with new transcript
                    const spacer = baseInputRef.current && !baseInputRef.current.endsWith(' ') ? ' ' : '';
                    setInput(baseInputRef.current + spacer + transcript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported in this browser.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            baseInputRef.current = input; // Snapshot current input
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const speakText = (text, idx) => {
        if (speakingInfo?.id === idx && speakingInfo?.status === 'playing') {
            synthRef.current.cancel();
            setSpeakingInfo(null);
            return;
        }

        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeakingInfo(null);
        setSpeakingInfo({ id: idx, status: 'playing' });
        synthRef.current.speak(utterance);
    };

    // Initial welcome message
    useEffect(() => {
        setMessages([
            {
                role: 'assistant',
                content: "Hello! I'm Nexus AI. I can access the web, run system commands, and more. How can I help you today?"
            }
        ]);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Upload failed");

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `📄 **System**: Successfully uploaded \`${file.name}\`. Added to knowledge base.`
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'error', content: `Error uploading file: ${error.message}` }]);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileOpen = async (path) => {
        try {
            const res = await fetch(`http://localhost:8000/read?path=${encodeURIComponent(path)}`);
            if (!res.ok) throw new Error("Failed to read file");
            const data = await res.json();

            // Determine language extension
            const ext = path.split('.').pop();
            setActiveArtifact({
                content: data.content,
                language: ext,
                filePath: path
            });
        } catch (error) {
            console.error("Error opening file:", error);
            // Optionally show an error toast
        }
    };

    const handlePreview = (content, language) => {
        let files = {};

        if (language === 'html') {
            files = { "/index.html": content };
        } else if (language === 'jsx' || language === 'javascript' || language === 'js') {
            // Simple heuristic: if it looks like a component, wrap it or treat as App.js
            files = {
                "/App.js": content,
                "/index.js": `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`
            };
        } else {
            // Default to text file or just try to render as is
            files = { "/index.js": content };
        }

        setPreviewFiles(files);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        if (isListening) toggleListening(); // Stop listening when sending

        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    thread_id: threadId,
                    model_name: settings.modelName,
                    temperature: settings.temperature,
                    system_prompt: settings.systemPrompt,
                    json_mode: settings.jsonMode
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let aiMsgData = { role: 'assistant', content: '', tools: [] };
            setMessages(prev => [...prev, aiMsgData]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);

                        if (data.type === 'ai' || data.type === 'AIMessageChunk') {
                            if (data.content) {
                                aiMsgData.content += data.content;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1] = { ...aiMsgData };
                                    return newMsgs;
                                });
                            }
                        }
                        // Handle Tool Outputs - typically comes as a separate message or part of the stream
                        // This logic might need adjustment based on exact LangGraph output format for tools
                        else if (data.node === 'tools') {
                            // For now, we append tool outputs to the content or handle them if we passed them differently
                            // Let's format tool output nicely in the content
                            if (data.content) {
                                const toolOutput = `\n\n> **System Tool Output**:\n\`\`\`\n${data.content}\n\`\`\`\n\n`;
                                aiMsgData.content += toolOutput;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1] = { ...aiMsgData };
                                    return newMsgs;
                                });
                            }
                        }
                        else if (data.error) {
                            aiMsgData.content += `\n\n*Error: ${data.error}*`;
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                newMsgs[newMsgs.length - 1] = { ...aiMsgData };
                                return newMsgs;
                            });
                        }
                    } catch (e) {
                        console.error("Error parsing JSON chunk", e);
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { role: 'error', content: 'Connection failed. Ensure the backend server is running on port 8000.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full relative overflow-hidden bg-slate-950">
            {/* File Explorer Sidebar */}
            <div className="w-64 flex flex-col border-r border-slate-800/50 bg-slate-900/30">
                <FileExplorer onFileSelect={handleFileOpen} />
            </div>

            {/* Main Chat Area */}
            <div className={clsx(
                "flex-1 flex flex-col h-full relative transition-all duration-300 min-w-0"
            )}>
                {/* Header */}
                <header className="p-6 pb-2 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm z-10 sticky top-0">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            Nexus Assistant
                        </h2>
                        <p className="text-slate-500 text-sm">Powered by Gemini 2.5 Flash & LangGraph</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <StatusBadge label="Online" status="success" />
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800/50"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={settings}
                    onSave={setSettings}
                />

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => (
                            <MessageBubble
                                key={idx}
                                message={msg}
                                onSpeak={() => speakText(msg.content, idx)}
                                isSpeaking={speakingInfo?.id === idx}
                                onOpenArtifact={(content, language) => setActiveArtifact({ content, language })}
                            />
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-lg">
                                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                <span className="animate-pulse">Thinking</span>
                                <span className="animate-bounce delay-100">.</span>
                                <span className="animate-bounce delay-200">.</span>
                                <span className="animate-bounce delay-300">.</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 pt-2 bg-slate-900/50 backdrop-blur-sm z-10">
                    <form onSubmit={handleSubmit} className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative flex items-center bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-2 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all gap-2">

                            {/* Mic Button */}
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={clsx(
                                    "p-2 rounded-full transition-all duration-300",
                                    isListening
                                        ? "bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                        : "text-slate-400 hover:text-indigo-400"
                                )}
                                title={isListening ? "Stop Listening" : "Start Voice Input"}
                            >
                                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>

                            {/* File Upload Button */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                                accept=".pdf,.txt,.md"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || uploading}
                                className="p-2 text-slate-400 hover:text-indigo-400 disabled:opacity-50 transition-colors"
                                title="Upload Document (PDF, TXT)"
                            >
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                            </button>

                            <div className="w-px h-6 bg-slate-700" />

                            <button
                                type="button"
                                onClick={() => setShowTerminal(!showTerminal)}
                                className={clsx(
                                    "p-1 text-slate-400 hover:text-indigo-400 transition-colors rounded hover:bg-slate-800/50",
                                    showTerminal && "text-indigo-400 bg-slate-800/50"
                                )}
                                title="Toggle Terminal"
                            >
                                <Terminal className="w-4 h-4" />
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask anything (e.g., 'What does the uploaded PDF say?')..."
                                className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:ring-0 px-2 py-2"
                                disabled={loading}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all duration-200 shadow-lg shadow-indigo-500/30"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-slate-600 text-xs mt-3">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>

            <AnimatePresence>
                {activeArtifact && (
                    <ArtifactPanel
                        content={activeArtifact.content}
                        language={activeArtifact.language}
                        filePath={activeArtifact.filePath}
                        onClose={() => setActiveArtifact(null)}
                        onPreview={() => handlePreview(activeArtifact.content, activeArtifact.language)}
                    />
                )}
                {previewFiles && (
                    <PreviewPanel
                        files={previewFiles}
                        onClose={() => setPreviewFiles(null)}
                    />
                )}
            </AnimatePresence>

            {/* Terminal at the bottom */}
            <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${showTerminal ? 'translate-y-0' : 'translate-y-full'}`}>
                {showTerminal && <TerminalPanel onClose={() => setShowTerminal(false)} />}
            </div>
        </div>
    );
}

function MessageBubble({ message, onSpeak, isSpeaking, onOpenArtifact }) {
    const isUser = message.role === 'user';
    const isError = message.role === 'error';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            {!isUser && (
                <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-lg">
                        {isError ? <AlertCircle className="w-5 h-5 text-red-400" /> : <Bot className="w-5 h-5 text-indigo-400" />}
                    </div>
                    {!isError && (
                        <button
                            onClick={onSpeak}
                            className={clsx(
                                "w-10 h-10 rounded-xl border border-slate-700 flex items-center justify-center shrink-0 transition-all",
                                isSpeaking ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                            )}
                            title="Read Aloud"
                        >
                            <Volume2 className={clsx("w-4 h-4", isSpeaking && "animate-pulse")} />
                        </button>
                    )}
                </div>
            )}

            <div className={clsx(
                "p-4 rounded-2xl max-w-[85%] shadow-lg backdrop-blur-sm border",
                isUser ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-none" :
                    isError ? "bg-red-900/20 text-red-200 border-red-800 rounded-tl-none" :
                        "bg-slate-800/80 text-slate-200 border-slate-700 rounded-tl-none"
            )}>
                {isError ? (
                    message.content
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none break-words prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                a: ({ ...props }) => <a {...props} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" />,
                                code: ({ inline, className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const language = match ? match[1] : null;
                                    const content = String(children).replace(/\n$/, '');

                                    if (inline) {
                                        return <code className="bg-slate-700/50 px-1 py-0.5 rounded text-indigo-300 font-mono text-xs" {...props}>{children}</code>;
                                    }

                                    return (
                                        <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-900/50">
                                            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
                                                <span className="text-xs font-mono text-slate-400 lowercase">{language || 'text'}</span>
                                                <button
                                                    onClick={() => onOpenArtifact && onOpenArtifact(content, language)}
                                                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                                >
                                                    <Maximize2 className="w-3 h-3" />
                                                    Open Side Panel
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-x-auto">
                                                <code className="text-sm font-mono text-slate-200" {...props}>
                                                    {children}
                                                </code>
                                            </div>
                                        </div>
                                    );
                                }
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {isUser && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg">
                    <User className="w-5 h-5 text-white" />
                </div>
            )}
        </motion.div>
    );
}

function StatusBadge({ label, status }) {
    const colors = {
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        neutral: "bg-slate-700/50 text-slate-400 border-slate-600/50",
    };

    return (
        <div className={`px-2 py-1 rounded-md border text-xs font-medium flex items-center gap-1 ${colors[status]}`}>
            {status === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            {label}
        </div>
    );
}
