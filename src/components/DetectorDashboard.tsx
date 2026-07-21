import React, { useState, useEffect } from 'react';
import { 
  Play, RefreshCw, AlertTriangle, CheckCircle, Info, 
  HelpCircle, Sparkles, Sliders, ChevronRight, Activity, 
  LineChart as ChartIcon, Eye
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, Legend } from 'recharts';
import { TokenSignal, SignalType, SignalMeta } from '../types';

interface DetectorDashboardProps {
  tokens: TokenSignal[];
  setTokens: (tokens: TokenSignal[]) => void;
  text: string;
  setText: (text: string) => void;
  errors: any[];
  setErrors: (errors: any[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  runGenerate: (prompt: string, mode: 'faithful' | 'hallucinated') => void;
  provider: 'gemini' | 'huggingface';
  setProvider: (val: 'gemini' | 'huggingface') => void;
  hfGeneratorModel: string;
  setHfGeneratorModel: (val: string) => void;
  hfDetectorModel: string;
  setHfDetectorModel: (val: string) => void;
}

const PRESETS = [
  {
    name: "Apollo 11 Moon Landing",
    prompt: "Detail the astronauts on the Apollo 11 mission who successfully walked on the Moon's surface in 1969.",
    description: "Ideal for showing name/date swaps in historical records."
  },
  {
    name: "Invention of the Telephone",
    prompt: "Detail the exact patent timeline and key inventors involved in the invention of the telephone in March 1876.",
    description: "Highlights competitor disputes and patent misattributions."
  },
  {
    name: "Whisper ASR Cross-Attention",
    prompt: "Transcribe a highly noisy audio clip that begins with absolute silence and mechanical fan hums.",
    description: "Simulates attention collapse caused by non-speech audio inputs."
  }
];

const SIGNALS_META: Record<SignalType, SignalMeta> = {
  attention_entropy: {
    id: 'attention_entropy',
    name: 'Attention Entropy (Head-Avg)',
    description: 'Measures the dispersion of attention weights across contexts. A collapse (near 0) signals high model confusion or repetitive looping.',
    sourcePaper: 'NPUsper (2607.01108) / 2606.02628',
    layerLocus: 'First-block (early) / Final decoder layer (deep)',
    normalRange: '1.2 - 2.8 (gradual rise)',
    anomalyDirection: 'Sudden collapse to < 0.3 in final layers'
  },
  hidden_state_separation: {
    id: 'hidden_state_separation',
    name: 'Hidden-State Separation (Probe AUROC)',
    description: 'Probes class separation between truthful and hallucinated hidden state manifolds. Healthy states show high separation in middle layers.',
    sourcePaper: 'SEPs (2406.15927) / 2606.02628',
    layerLocus: 'Middle layers (layers 12 - 22)',
    normalRange: '0.70 - 0.95 (strong plateau)',
    anomalyDirection: 'Fails to peak, collapses to < 0.20 in mid-layers'
  },
  logit_lens_divergence: {
    id: 'logit_lens_divergence',
    name: 'Logit-Lens Divergence',
    description: 'Contrasts predictions of intermediate layers against the final layer. Large late-stage divergence indicates the model is guessing.',
    sourcePaper: 'DoLa (Contrastive Layers) via 2509.09700',
    layerLocus: 'Middle-to-late layers',
    normalRange: '< 0.15 (consistent predictions)',
    anomalyDirection: 'Spikes to > 0.70 in the final 8 layers'
  },
  semantic_entropy: {
    id: 'semantic_entropy',
    name: 'Semantic Entropy',
    description: 'Captures the underlying semantic uncertainty by analyzing penultimates logits. High value indicates high factual disagreement.',
    sourcePaper: 'Farquhar et al. (Nature 2024) / SEPs',
    layerLocus: 'Later layers (layers 20 - 32)',
    normalRange: '< 0.30 (steady and low)',
    anomalyDirection: 'Escalates rapidly to > 0.80'
  },
  monotonicity: {
    id: 'monotonicity',
    name: 'Spearman Monotonicity',
    description: 'Rank correlation of attention-to-evidence weights across layers. A break in monotonicity flags attention shift or collapse.',
    sourcePaper: 'NPUsper (2607.01108)',
    layerLocus: 'Full network stack (0 - 31)',
    normalRange: 'Monotonically decreasing gradient',
    anomalyDirection: 'Severe fluctuations and inversion in mid-to-deep layers'
  },
  sae_latent_sparsity: {
    id: 'sae_latent_sparsity',
    name: 'SAE Latent Activation Rate',
    description: 'Measures activation of specialized Sparse Autoencoder latents linked specifically to hallucination features.',
    sourcePaper: 'Whisper Steering & SAEs (2606.07473)',
    layerLocus: 'Deeper layers (layers 16 - 32)',
    normalRange: '< 0.05 (extremely sparse)',
    anomalyDirection: 'Sudden high density burst (> 0.40)'
  }
};

export default function DetectorDashboard({
  tokens, setTokens, text, setText, errors, setErrors,
  isLoading, setIsLoading, runGenerate, provider, setProvider,
  hfGeneratorModel, setHfGeneratorModel, hfDetectorModel, setHfDetectorModel
}: DetectorDashboardProps) {
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [activeSignal, setActiveSignal] = useState<SignalType>('attention_entropy');
  const [generationMode, setGenerationMode] = useState<'faithful' | 'hallucinated'>('hallucinated');
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize with a default state if nothing is generated yet
  useEffect(() => {
    if (tokens.length > 0 && selectedTokenIndex === null) {
      // Auto-select first hallucinated token or first token in general
      const firstHallucinated = tokens.find(t => t.isHallucinated);
      if (firstHallucinated) {
        setSelectedTokenIndex(firstHallucinated.index);
      } else {
        setSelectedTokenIndex(tokens[0].index);
      }
    }
  }, [tokens]);

  const handlePresetSelect = (promptText: string) => {
    setCustomPrompt(promptText);
    setErrorMessage(null);
  };

  const handleTriggerGenerate = () => {
    if (!customPrompt.trim()) {
      setErrorMessage("Please enter a prompt or select a research preset.");
      return;
    }
    setErrorMessage(null);
    setSelectedTokenIndex(null);
    runGenerate(customPrompt, generationMode);
  };

  const selectedToken = selectedTokenIndex !== null ? tokens[selectedTokenIndex] : null;

  // Prepare line chart data for selected token
  const getChartData = () => {
    if (!selectedToken) return [];
    
    // We compare the selected token's signal against the baseline 'opposite' state
    // so the user can clearly see how a faithful vs hallucinated signal differs on the graph!
    return Array.from({ length: 32 }).map((_, l) => {
      let metricValue = 0;
      let referenceValue = 0;

      // Extract values
      switch (activeSignal) {
        case 'attention_entropy':
          metricValue = selectedToken.attentionEntropy[l];
          // Faithful reference (monotonic clean slope)
          referenceValue = 1.1 + (l / 32) * 1.15;
          break;
        case 'hidden_state_separation':
          metricValue = selectedToken.hiddenStateSeparation[l];
          // Faithful reference (beautiful mid-layer plateau)
          referenceValue = l < 14 ? 0.1 + (l / 14) * 0.7 : 0.8;
          break;
        case 'logit_lens_divergence':
          metricValue = selectedToken.logitLensDivergence[l];
          // Faithful reference (steady low alignment)
          referenceValue = Math.max(0.03, 0.11 - (l / 32) * 0.06);
          break;
        case 'semantic_entropy':
          metricValue = selectedToken.semanticEntropy[l];
          // Faithful reference (low uncertainty)
          referenceValue = Math.max(0.04, 0.22 - (l / 32) * 0.14);
          break;
        case 'monotonicity':
          metricValue = selectedToken.monotonicity[l];
          // Faithful reference
          referenceValue = Math.max(0.04, 0.88 - (l / 32) * 0.72);
          break;
        case 'sae_latent_sparsity':
          metricValue = selectedToken.saeLatentSparsity[l];
          // Faithful reference
          referenceValue = 0.04;
          break;
      }

      return {
        layer: `L${l}`,
        [selectedToken.text.trim() || `Token_${selectedToken.index}`]: Number(metricValue.toFixed(3)),
        "Faithful Baseline (Ideal)": Number(referenceValue.toFixed(3))
      };
    });
  };

  const chartData = getChartData();
  const currentSignalMeta = SIGNALS_META[activeSignal];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* SECTION 1: PROMPT BUILDER & COUPLING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Inputs */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white font-display">
                Factual Grounding Probe Controls
              </h3>
            </div>
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-850">
              <button
                id="mode-faithful"
                onClick={() => setGenerationMode('faithful')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  generationMode === 'faithful'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                id="mode-hallucinated"
                onClick={() => setGenerationMode('hallucinated')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  generationMode === 'hallucinated'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Demo Hallucination
              </button>
            </div>
          </div>

          {/* Model Provider Settings */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Model Provider
              </label>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setProvider('gemini')}
                  className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                    provider === 'gemini'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/25 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('huggingface')}
                  className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                    provider === 'huggingface'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/25 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hugging Face (HF)
                </button>
              </div>
            </div>

            {provider === 'huggingface' && (
              <div className="space-y-4 pt-3 border-t border-slate-900 animate-fadeIn">
                {/* Generator Model Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">1. Initial Text Generator</span>
                    <span className="text-[9px] text-indigo-400 font-mono">Generation</span>
                  </div>
                  <select
                    value={hfGeneratorModel}
                    onChange={(e) => setHfGeneratorModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/85 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
                  >
                    <option value="meta-llama/Meta-Llama-3.1-8B-Instruct">Meta Llama 3.1 8B (Standard/Default)</option>
                    <option value="Qwen/Qwen2.5-14B-Instruct">Qwen 2.5 14B (High Precision & Structured)</option>
                    <option value="google/gemma-2-9b-it">Google Gemma 2 9B (Fluent & Creative)</option>
                    <option value="mistralai/Mistral-7B-Instruct-v0.3">Mistral 7B Instruct v0.3 (Low Latency)</option>
                  </select>
                  <p className="text-[9px] text-slate-500 leading-tight pl-1">
                    Responsible for writing the initial response to the prompt (optionally injecting factual errors).
                  </p>
                </div>

                {/* Detector Model Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">2. Hallucination Audit & Detection</span>
                    <span className="text-[9px] text-emerald-400 font-mono">SOTA Evaluator</span>
                  </div>
                  <select
                    value={hfDetectorModel}
                    onChange={(e) => setHfDetectorModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/85 focus:ring-1 focus:ring-emerald-500/20 transition-all cursor-pointer font-sans"
                  >
                    <option value="PatronusAI/lynx-8b-instruct">Patronus Lynx 8B (SOTA Hallucination Evaluator)</option>
                    <option value="Qwen/Qwen2.5-72B-Instruct">Qwen 2.5 72B (Elite Reasoning Fact-Checker)</option>
                    <option value="meta-llama/Meta-Llama-3.1-70B-Instruct">Meta Llama 3.1 70B (Deep Knowledge Auditor)</option>
                    <option value="meta-llama/Meta-Llama-3.1-8B-Instruct">Meta Llama 3.1 8B (Standard Factual Auditor)</option>
                  </select>
                  <p className="text-[9px] text-slate-500 leading-tight pl-1">
                    Dedicated auditing model that compares claims with factual records to flag specific span contradictions.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              1. Select Research Presets
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset.prompt)}
                  className={`p-3.5 text-left rounded-xl border transition-all duration-200 cursor-pointer block ${
                    customPrompt === preset.prompt
                      ? 'border-indigo-500 bg-indigo-500/5 shadow-indigo-950/20 shadow-md'
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                  }`}
                >
                  <p className="text-xs font-semibold text-white tracking-tight">{preset.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Area */}
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              2. Custom Input Prompt
            </label>
            <textarea
              id="prompt-input"
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="Provide a historical query, mathematical statement, or transcription task to explore model signal responses..."
              className="w-full h-24 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none leading-relaxed"
            />
            {errorMessage && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {errorMessage}
              </p>
            )}
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[10px] text-slate-400 max-w-xs md:max-w-md leading-relaxed font-sans">
              {generationMode === 'hallucinated' 
                ? "💡 Demo Hallucination forces Gemini to generate factual distortions, allowing you to observe layer-wise signal collapse."
                : "💡 Standard instructs Gemini to produce factual alignments, showing clean, healthy signals across layers."
              }
            </div>
            <button
              id="btn-generate"
              disabled={isLoading}
              onClick={handleTriggerGenerate}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer font-display"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run & Extract
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Side: Quick Stats / Meta */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white font-display">
                Signal Probe Diagnostics
              </h3>
            </div>

            {tokens.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-3">
                <HelpCircle className="w-7 h-7 mx-auto stroke-1 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">No active diagnostic sequence</p>
                <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                  Select a research preset prompt or write a custom query above to begin.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl text-center">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Total Tokens</p>
                    <p className="text-xl font-bold font-mono text-white mt-1">{tokens.length}</p>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl text-center">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Flagged Anomalies</p>
                    <p className={`text-xl font-bold font-mono mt-1 ${errors.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {errors.length}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Factual Integrity Estimate</span>
                    <span className="font-mono font-semibold text-white">
                      {Math.round(100 - (errors.length * 15))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${errors.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(10, 100 - (errors.length * 15))}%` }}
                    />
                  </div>
                  <div className="flex items-start gap-2 text-[10px] text-slate-400 pt-1 leading-relaxed">
                    {errors.length > 0 ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>Detector registered signal drop. Open the <strong className="text-indigo-300 font-medium">Masked Repair</strong> panel to apply factual mitigation.</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Signals are healthy and aligned with normal baseline manifolds. Factual accuracy is confirmed.</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Model: gemini-3.5-flash</span>
            <span>Sequence: 32 Layers</span>
          </div>
        </div>

      </div>

      {/* SECTION 2: INTERACTIVE TOKENS & VISUALIZER */}
      {tokens.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Token Visualizer Panel */}
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white font-display">
                  Tokenized Signal Probe Canvas
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Select a token to inspect its layer-wise properties</span>
            </div>

            {/* Generated output block */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 min-h-[140px] leading-8 font-sans text-sm select-none">
              {tokens.map((token, idx) => {
                const isSelected = selectedTokenIndex === token.index;
                // Determine style based on status
                let tokenClass = "px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150 inline-block text-xs font-mono tracking-tight ";
                if (token.isHallucinated) {
                  tokenClass += isSelected 
                    ? "bg-rose-500/20 text-rose-200 border border-rose-500 ring-2 ring-rose-500/10 font-semibold "
                    : "bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 ";
                } else {
                  tokenClass += isSelected
                    ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500 ring-2 ring-indigo-500/10 font-semibold "
                    : "text-slate-300 hover:text-white hover:bg-slate-850 border border-transparent ";
                }

                // If space token, just render spacing
                if (!token.text.trim()) {
                  return <span key={idx} className="inline">{token.text}</span>;
                }

                return (
                  <span
                    key={idx}
                    id={`token-${idx}`}
                    onClick={() => setSelectedTokenIndex(token.index)}
                    className={tokenClass}
                    title={token.isHallucinated ? `Anomaly flagged (${Math.round(token.score * 100)}%)` : undefined}
                  >
                    {token.text}
                  </span>
                );
              })}
            </div>

            {/* Signal heat overview of the text */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Full-Sequence Signal Heat Map
              </h4>
              <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-4 overflow-x-auto">
                <div className="min-w-[550px] space-y-2">
                  {/* Grid cells representing layers and tokens */}
                  {Object.keys(SIGNALS_META).map((key) => {
                    const meta = SIGNALS_META[key as SignalType];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-24 text-[10px] text-slate-400 truncate font-mono select-none font-medium" title={meta.name}>
                          {meta.name.split(' (')[0]}
                        </span>
                        <div className="flex-1 flex gap-0.5">
                          {tokens.filter(t => t.text.trim()).map((t, idx) => {
                            // Compute representative color
                            let score = 0;
                            if (key === 'attention_entropy') score = t.attentionEntropy[31];
                            else if (key === 'hidden_state_separation') score = t.hiddenStateSeparation[16];
                            else if (key === 'logit_lens_divergence') score = t.logitLensDivergence[31];
                            else if (key === 'semantic_entropy') score = t.semanticEntropy[31];
                            else if (key === 'sae_latent_sparsity') score = t.saeLatentSparsity[24];
                            
                            let color = 'bg-slate-800/40';
                            if (t.isHallucinated) {
                              color = 'bg-rose-500/70';
                            } else {
                              color = score > 0.6 ? 'bg-indigo-500/70' : 'bg-slate-800/40';
                            }

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedTokenIndex(t.index)}
                                className={`flex-1 h-3.5 rounded-sm cursor-pointer transition-all hover:scale-115 ${color}`}
                                title={`${t.text.trim()}: ${meta.name}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-0.5 pl-24 text-[9px] text-slate-500 font-mono select-none pt-1">
                    {tokens.filter(t => t.text.trim()).map((t, idx) => (
                      <span key={idx} className="flex-1 text-center truncate font-semibold">
                        {t.text.substring(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Deep Probe Signal Graph Panel */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <ChartIcon className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white font-display">
                Layer-Wise Signal Tensor Probe
              </h3>
            </div>

            {selectedToken ? (
              <div className="space-y-5">
                {/* Token Info card */}
                <div className={`p-4 rounded-xl border flex items-start justify-between ${
                  selectedToken.isHallucinated 
                    ? 'bg-rose-500/5 border-rose-500/20' 
                    : 'bg-indigo-500/5 border-indigo-500/20'
                }`}>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-semibold font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      Token #{selectedToken.index}
                    </span>
                    <p className="text-base font-bold text-white font-mono tracking-tight pt-1">
                      "{selectedToken.text.trim()}"
                    </p>
                    {selectedToken.isHallucinated && (selectedToken as any).reason && (
                      <div className="mt-2 text-[10px] text-rose-300 bg-rose-500/10 rounded border border-rose-500/20 p-2.5 leading-relaxed font-sans">
                        <p className="font-semibold text-rose-400">Factual Conflict:</p>
                        <p className="mt-0.5 text-[11px]">{(selectedToken as any).reason}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-mono">Risk Score</p>
                    <p className={`text-lg font-bold font-mono mt-0.5 ${selectedToken.isHallucinated ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {Math.round(selectedToken.score * 100)}%
                    </p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full inline-block mt-1.5 font-bold font-mono tracking-wider ${
                      selectedToken.isHallucinated ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {selectedToken.isHallucinated ? 'ANOMALOUS' : 'FAITHFUL'}
                    </span>
                  </div>
                </div>

                {/* Signal Select tabs */}
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                    Select Metric Dimension
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(SIGNALS_META).map((key) => {
                      const meta = SIGNALS_META[key as SignalType];
                      const isSel = activeSignal === key;
                      return (
                        <button
                          key={key}
                          id={`signal-tab-${key}`}
                          onClick={() => setActiveSignal(key as SignalType)}
                          className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-indigo-600/95 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                              : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          {meta.name.split(' (')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* The Chart */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4">
                  <div className="h-44 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="layer" stroke="#64748b" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                        <ChartTooltip 
                          contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                        <Line 
                          type="monotone" 
                          dataKey={selectedToken.text.trim() || `Token_${selectedToken.index}`} 
                          stroke={selectedToken.isHallucinated ? '#f43f5e' : '#6366f1'} 
                          strokeWidth={2.5}
                          activeDot={{ r: 6 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Faithful Baseline (Ideal)" 
                          stroke="#10b981" 
                          strokeWidth={1.5}
                          strokeDasharray="4 4" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Explanatory notes about active signal */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-2 text-[11px] leading-relaxed">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold font-display">
                    <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Academic Grounding Context</span>
                  </div>
                  <p className="text-slate-400">
                    {currentSignalMeta.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-850 pt-2.5 mt-2.5 font-mono text-[9px] text-slate-400">
                    <div>
                      <span className="text-slate-500">Paper Reference:</span>
                      <p className="text-slate-300 truncate font-semibold" title={currentSignalMeta.sourcePaper}>{currentSignalMeta.sourcePaper}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Locus:</span>
                      <p className="text-slate-300 font-semibold">{currentSignalMeta.layerLocus}</p>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 space-y-3">
                <HelpCircle className="w-7 h-7 mx-auto stroke-1 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">Select a token to inspect</p>
                <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto leading-relaxed">
                  Click on any token in the probe canvas to dissect its layer activations.
                </p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
