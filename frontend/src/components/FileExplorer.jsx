import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, RefreshCw } from 'lucide-react';

const FileTreeNode = ({ node, level = 0, onFileClick }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleClick = () => {
        if (node.type === 'directory') {
            setIsOpen(!isOpen);
        } else {
            onFileClick(node.path);
        }
    };

    return (
        <div style={{ paddingLeft: `${level * 12}px` }}>
            <div
                className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer hover:bg-slate-700/50 rounded-sm text-sm ${node.type === 'file' ? 'text-slate-300' : 'text-slate-100 font-medium'
                    }`}
                onClick={handleClick}
            >
                {node.type === 'directory' && (
                    <span className="text-slate-400">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                )}
                {node.type === 'directory' ? (
                    isOpen ? <FolderOpen size={14} className="text-blue-400" /> : <Folder size={14} className="text-blue-400" />
                ) : (
                    <File size={14} className="text-slate-400" />
                )}
                <span className="truncate">{node.name}</span>
            </div>

            {node.type === 'directory' && isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            level={level + 1}
                            onFileClick={onFileClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function FileExplorer({ onFileSelect }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    useEffect(() => {
        // Check workspace status first, then fetch if available
        checkAndFetchFiles();
    }, []);

    useEffect(() => {
        // Auto-refresh files every 3 seconds to keep sync with agent/terminal
        // Only poll if we have a workspace (no error or error is not "No project selected")
        if (error === "No project selected") {
            return; // Don't poll
        }

        const intervalId = setInterval(fetchFiles, 3000);
        return () => clearInterval(intervalId);
    }, [error]);

    const checkAndFetchFiles = async () => {
        try {
            // First check if workspace is selected
            const wsResponse = await fetch('http://localhost:8000/workspace/current');
            if (wsResponse.ok) {
                const wsData = await wsResponse.json();
                if (wsData.path === null) {
                    // No workspace, set error state immediately without trying to fetch files
                    setFiles([]);
                    setError("No project selected");
                    setLoading(false);
                    return;
                }
            }
            // Workspace exists, proceed with normal fetch
            await fetchFiles();
        } catch (err) {
            console.error("Workspace check failed:", err);
            setLoading(false);
        }
    };

    const fetchFiles = async () => {
        try {
            const response = await fetch('http://localhost:8000/files');
            if (response.status === 400) {
                // No workspace selected
                setFiles([]);
                setError("No project selected");
                return;
            }
            if (!response.ok) throw new Error('Failed to load files');
            const data = await response.json();
            setFiles(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeWorkspace = async () => {
        try {
            // Try native dialog first
            let nativeSuccess = false;
            try {
                const res = await fetch('http://localhost:8000/select-workspace-native', {
                    method: 'POST'
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        nativeSuccess = true;
                    } else if (data.status === 'cancelled') {
                        return; // User cancelled native dialog, don't show prompt
                    }
                }
            } catch (e) {
                console.warn("Native dialog failed, falling back to prompt", e);
            }

            if (nativeSuccess) {
                setLoading(true);
                await fetchFiles();
                return;
            }

            // Fallback to manual entry
            const path = window.prompt("Enter absolute path to project directory:");
            if (!path) return;

            const res = await fetch('http://localhost:8000/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to change workspace");
            }

            // Refresh files
            setLoading(true);
            await fetchFiles();
        } catch (error) {
            alert(error.message);
        }
    };

    if (loading) return <div className="p-4 text-slate-400 text-sm">Loading files...</div>;

    // Custom render for no workspace
    if (error === "No project selected") {
        return (
            <div className="h-full flex flex-col bg-slate-900 border-r border-slate-700 select-none">
                <div className="p-3 border-b border-slate-700/50 font-medium text-slate-200 flex justify-between items-center">
                    <span className="text-sm">Explorer</span>
                    <button
                        onClick={handleChangeWorkspace}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                        title="Open Project"
                    >
                        Open Project
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                    <p className="text-sm mb-2">General Chat Mode</p>
                    <p className="text-xs">Select a project to see files.</p>
                </div>
            </div>
        );
    }

    if (error) return <div className="p-4 text-red-400 text-sm">Error: {error}</div>;

    return (
        <div className="h-full flex flex-col bg-slate-900 border-r border-slate-700 select-none">
            <div className="p-3 border-b border-slate-700/50 font-medium text-slate-200 flex justify-between items-center">
                <span className="text-sm">Explorer</span>
                <div className="flex gap-1">
                    <button
                        onClick={handleChangeWorkspace}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                        title="Change Project Folder"
                    >
                        Change
                    </button>
                    <button
                        onClick={fetchFiles}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                        title="Refresh"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
                {files.map((node) => (
                    <FileTreeNode
                        key={node.path}
                        node={node}
                        onFileClick={onFileSelect}
                    />
                ))}
            </div>
        </div>
    );
}
