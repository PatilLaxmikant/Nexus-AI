import React from 'react';
import { Sandpack } from "@codesandbox/sandpack-react";
import { X, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

export default function PreviewPanel({ files, template = "react", onClose }) {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className={`
            flex flex-col bg-slate-900 border-l border-slate-700 shadow-2xl animate-in slide-in-from-right duration-300
            ${expanded ? 'fixed inset-0 z-50' : 'w-full md:w-1/2 lg:w-[45%] h-full'}
        `}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Preview</span>
                    <span className="text-xs text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded uppercase">
                        {template}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-700/50"
                        title={expanded ? "Minimize" : "Maximize"}
                    >
                        {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700/50"
                        title="Close preview"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Sandpack Content */}
            <div className="flex-1 overflow-hidden relative">
                <Sandpack
                    template={template}
                    files={files}
                    theme="dark"
                    options={{
                        showNavigator: true,
                        showTabs: true,
                        showConsole: true,
                        showConsoleButton: true,
                        autoReload: true,
                        externalResources: ["https://cdn.tailwindcss.com"],
                        classes: {
                            "sp-wrapper": "h-full",
                            "sp-layout": "h-full",
                            "sp-tab-button": "text-sm",
                        }
                    }}
                    customSetup={{
                        dependencies: {
                            "lucide-react": "latest",
                            "framer-motion": "latest",
                            "clsx": "latest",
                            "tailwind-merge": "latest"
                        }
                    }}
                />
            </div>
        </div>
    );
}
