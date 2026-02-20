import React from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsModal({ isOpen, onClose, settings, onSave }) {
    const [localSettings, setLocalSettings] = React.useState(settings);

    // Sync local state when modal opens
    React.useEffect(() => {
        if (isOpen) setLocalSettings(settings);
    }, [isOpen, settings]);

    const handleChange = (key, value) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    const handleReset = () => {
        const defaults = {
            modelName: "gemini-2.5-flash",
            temperature: 0.7,
            systemPrompt: "You are a powerful AI Assistant capable of using various tools to solve problems.",
            jsonMode: false
        };
        setLocalSettings(defaults);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                        <h2 className="text-xl font-bold text-slate-100">Agent Settings</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Model Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Model</label>
                            <select
                                value={localSettings.modelName}
                                onChange={(e) => handleChange('modelName', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                            >
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gpt-4">GPT-4 (Mock)</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Mock)</option>
                            </select>
                            <p className="text-xs text-slate-500">Select the LLM powering the agent.</p>
                        </div>

                        {/* Temperature Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-slate-300">Temperature</label>
                                <span className="text-sm text-indigo-400 font-mono">{localSettings.temperature}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={localSettings.temperature}
                                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Precise</span>
                                <span>Creative</span>
                            </div>
                        </div>

                        {/* System Prompt */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">System Prompt</label>
                            <textarea
                                value={localSettings.systemPrompt}
                                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                rows={4}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none"
                                placeholder="Define how the agent should behave..."
                            />
                        </div>
                        {/* JSON Mode Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-slate-300 block">JSON Mode</label>
                                <p className="text-xs text-slate-500">Force the model to output valid JSON.</p>
                            </div>
                            <button
                                onClick={() => handleChange('jsonMode', !localSettings.jsonMode)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.jsonMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.jsonMode ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-slate-700/50 bg-slate-800/50">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset Defaults
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
