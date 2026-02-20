import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Save, ExternalLink, Loader2, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';

export default function ArtifactPanel({ content, language, filePath, onClose, onPreview }) {
    const [copied, setCopied] = useState(false);
    const [editorContent, setEditorContent] = useState(content);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Update editor content when prop changes
    useEffect(() => {
        setEditorContent(content);
        setIsDirty(false);
    }, [content]);

    const handleCopy = () => {
        navigator.clipboard.writeText(editorContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEditorChange = (value) => {
        setEditorContent(value);
        setIsDirty(value !== content);
    };

    const handleSave = async () => {
        if (!filePath) return;
        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:8000/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: filePath,
                    content: editorContent
                })
            });

            if (!res.ok) throw new Error("Failed to save");

            setIsDirty(false);
            // Optional: You might want to update the 'content' prop or notify parent, 
            // but for now local state is fine.
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    // Map language extension to Monaco language
    const getMonacoLanguage = (lang) => {
        const map = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'sql': 'sql'
        };
        return map[lang] || lang || 'plaintext';
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700 w-full md:w-1/2 lg:w-[50%] shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <TerminalIcon language={language} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-slate-200 truncate text-sm">
                            {filePath ? filePath.split(/[/\\]/).pop() : 'Code Snippet'}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{getMonacoLanguage(language)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onPreview && (
                        <button
                            onClick={onPreview}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 transition-all border border-emerald-500/20 mr-2"
                            title="Live Preview"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Preview
                        </button>
                    )}

                    {filePath && (
                        <button
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDirty
                                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                            title="Save changes (Ctrl+S)"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save
                        </button>
                    )}

                    <div className="w-px h-4 bg-slate-700 mx-2" />

                    <button
                        onClick={handleCopy}
                        className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-700/50"
                        title="Copy content"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700/50"
                        title="Close panel"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative group" data-testid="code-content">
                {filePath || language !== 'markdown' ? (
                    <Editor
                        height="100%"
                        language={getMonacoLanguage(language)}
                        value={editorContent}
                        theme="vs-dark"
                        onChange={handleEditorChange}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            padding: { top: 16, bottom: 16 },
                            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        }}
                    />
                ) : (
                    <div className="h-full overflow-auto p-6 prose prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}

function TerminalIcon({ language }) {
    // Simple icon mapper based on language could be added here
    return <ExternalLink className="w-4 h-4" />;
}
