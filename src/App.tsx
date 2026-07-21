import React, { useState } from 'react';
import Header from './components/Header';
import DetectorDashboard from './components/DetectorDashboard';
import CorrectionPanel from './components/CorrectionPanel';
import LiteratureLibrary from './components/LiteratureLibrary';
import EvaluationArena from './components/EvaluationArena';
import GroundingExplorer from './components/GroundingExplorer';
import { TokenSignal, CorrectionResult } from './types';
import { Layers, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'detector' | 'corrector' | 'literature' | 'arena' | 'grounding'>('detector');
  const [tokens, setTokens] = useState<TokenSignal[]>([]);
  const [text, setText] = useState<string>('');
  const [errors, setErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'huggingface'>('gemini');
  const [hfGeneratorModel, setHfGeneratorModel] = useState<string>('meta-llama/Meta-Llama-3.1-8B-Instruct');
  const [hfDetectorModel, setHfDetectorModel] = useState<string>('PatronusAI/lynx-8b-instruct');
  const [hfSolverModel, setHfSolverModel] = useState<string>('Qwen/Qwen2.5-14B-Instruct');

  const runGenerate = async (prompt: string, mode: 'faithful' | 'hallucinated') => {
    setIsLoading(true);
    setApiError(null);
    setCorrectionResult(null); // Clear out previous repairs on new generation
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, mode, provider, hfGeneratorModel, hfDetectorModel })
      });

      const data = await response.json();
      if (response.ok) {
        setText(data.text);
        setTokens(data.tokens);
        setErrors(data.errors);
      } else {
        setApiError(data.error || "An error occurred during token extraction.");
      }
    } catch (err: any) {
      console.error("Failed to generate:", err);
      setApiError("Failed to connect to full-stack backend. Please check your dev server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-100 flex flex-col antialiased">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        originalTextExists={text !== ''}
      />

      <main className="flex-1">
        {/* Error Notification Alert */}
        {apiError && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold text-rose-200">System Diagnostic Error</p>
                <p className="mt-0.5">{apiError}</p>
                <p className="mt-1 text-[10px] text-rose-400">
                  Tip: Ensure the Gemini API key or Hugging Face API token is properly set under the <strong>Settings &gt; Secrets</strong> menu.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Panel Routing */}
        {activeTab === 'detector' && (
          <DetectorDashboard
            tokens={tokens}
            setTokens={setTokens}
            text={text}
            setText={setText}
            errors={errors}
            setErrors={setErrors}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            runGenerate={runGenerate}
            provider={provider}
            setProvider={setProvider}
            hfGeneratorModel={hfGeneratorModel}
            setHfGeneratorModel={setHfGeneratorModel}
            hfDetectorModel={hfDetectorModel}
            setHfDetectorModel={setHfDetectorModel}
          />
        )}

        {activeTab === 'corrector' && (
          <CorrectionPanel
            tokens={tokens}
            errors={errors}
            originalText={text}
            correctionResult={correctionResult}
            setCorrectionResult={setCorrectionResult}
            isCorrecting={isCorrecting}
            setIsCorrecting={setIsCorrecting}
            provider={provider}
            hfSolverModel={hfSolverModel}
            setHfSolverModel={setHfSolverModel}
            hfDetectorModel={hfDetectorModel}
            setHfDetectorModel={setHfDetectorModel}
          />
        )}

        {activeTab === 'literature' && (
          <LiteratureLibrary />
        )}

        {activeTab === 'arena' && (
          <EvaluationArena 
            provider={provider}
            hfGeneratorModel={hfGeneratorModel}
            hfDetectorModel={hfDetectorModel}
          />
        )}

        {activeTab === 'grounding' && (
          <GroundingExplorer />
        )}
      </main>

      {/* Elegant minimalist footer */}
      <footer className="border-t border-[#1e293b] py-6 text-center text-[10px] text-slate-500 font-mono bg-[#0c1020]/40 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400/60" />
            <span>Aryan-singh19/Hallucinations © 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Standard: Llama-3.1-8B-equivalent (32 layers)</span>
            <span>Grounding: Google Search Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
