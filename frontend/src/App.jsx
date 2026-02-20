import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import WelcomeScreen from './components/WelcomeScreen';

function App() {
  const [workspacePath, setWorkspacePath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWorkspace();
  }, []);

  const checkWorkspace = async () => {
    try {
      const res = await fetch('http://localhost:8000/workspace/current');
      if (res.ok) {
        const data = await res.json();
        setWorkspacePath(data.path);
      }
    } catch (e) {
      console.error("Failed to check workspace", e);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (path) => {
    setWorkspacePath(path);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-indigo-400">Loading Nexus...</div>
      </div>
    );
  }

  // We interpret workspacePath as:
  // null = loading/unknown (initially)
  // "skipped" = user wants general chat (no specific project)
  // string = valid path

  if (!workspacePath && workspacePath !== "skipped") {
    return <WelcomeScreen onProjectSelect={(path) => handleProjectSelect(path || "skipped")} />;
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex overflow-hidden font-sans selection:bg-indigo-500/30">
      <ChatInterface />
    </div>
  );
}

export default App;
