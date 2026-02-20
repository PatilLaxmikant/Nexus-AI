import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { X, Maximize2, Minimize2 } from 'lucide-react';

export default function Terminal({ onClose }) {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const wsRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [expanded, setExpanded] = React.useState(false);

    useEffect(() => {
        // Initialize xterm
        const term = new XTerm({
            cursorBlink: true,
            theme: {
                background: '#0f172a', // slate-900
                foreground: '#e2e8f0', // slate-200
                cursor: '#6366f1', // indigo-500
                selectionBackground: '#6366f140',
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontSize: 14,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalRef.current) {
            term.open(terminalRef.current);
            fitAddon.fit();
        }

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Connect to WebSocket
        const ws = new WebSocket('ws://localhost:8000/ws/terminal');
        wsRef.current = ws;

        ws.onopen = () => {
            term.writeln('\x1b[32mConnected to backend terminal\x1b[0m');
            term.write('\r\n$ ');
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = () => {
            term.writeln('\r\n\x1b[31mConnection closed\x1b[0m');
        };

        ws.onerror = (error) => {
            term.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
        };

        // Handle terminal input
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // Handle resize
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    // Re-fit when expanded state changes
    useEffect(() => {
        if (fitAddonRef.current) {
            setTimeout(() => fitAddonRef.current.fit(), 300); // Wait for transition
        }
    }, [expanded]);

    return (
        <div
            className={`flex flex-col bg-slate-950 border-t border-slate-800 transition-all duration-300 ${expanded ? 'fixed inset-0 z-50' : 'h-64'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-2 px-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <span className="font-mono">$</span>
                    <span>Terminal</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded hover:bg-slate-800"
                    >
                        {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded hover:bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Terminal Container */}
            <div
                ref={terminalRef}
                className="flex-1 overflow-hidden p-2"
            />
        </div>
    );
}
