import React from 'react';
import { Brain, ShieldAlert, Cpu, BookOpen, Layers, Sliders, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'detector' | 'corrector' | 'literature' | 'arena' | 'grounding';
  setActiveTab: (tab: 'detector' | 'corrector' | 'literature' | 'arena' | 'grounding') => void;
  originalTextExists: boolean;
}

export default function Header({ activeTab, setActiveTab, originalTextExists }: HeaderProps) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-md sticky top-0 z-50 px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand/Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-indigo-500/5 shadow-md">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold font-display tracking-tight text-white leading-none">
                Hallucination-Aware LM
              </h1>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-mono font-medium px-2 py-0.5 rounded-full border border-indigo-500/20">
                PROBE ENGINE v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Layer-Wise Internal Signals Probe & Masked Restoration Pipeline
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            id="nav-detector"
            onClick={() => setActiveTab('detector')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
              activeTab === 'detector'
                ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Signal Probe
          </button>
          
          <button
            id="nav-corrector"
            onClick={() => setActiveTab('corrector')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer relative ${
              activeTab === 'corrector'
                ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Masked Repair
            {!originalTextExists && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            )}
          </button>

          <button
            id="nav-arena"
            onClick={() => setActiveTab('arena')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
              activeTab === 'arena'
                ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Bench & Steering
          </button>

          <button
            id="nav-grounding"
            onClick={() => setActiveTab('grounding')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
              activeTab === 'grounding'
                ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Grounding Map
          </button>

          <button
            id="nav-literature"
            onClick={() => setActiveTab('literature')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-all cursor-pointer ${
              activeTab === 'literature'
                ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Literature Lab
          </button>
        </nav>

      </div>
    </header>
  );
}
