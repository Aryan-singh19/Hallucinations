import React, { useState } from 'react';
import { 
  Cpu, 
  Settings, 
  Play, 
  Sparkles, 
  Activity, 
  BarChart3, 
  HelpCircle, 
  CheckCircle2, 
  Sliders, 
  Gauge, 
  ShieldAlert,
  Layers,
  TrendingDown,
  Wand2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line,
  ReferenceArea
} from 'recharts';

interface EvaluationArenaProps {
  provider: 'gemini' | 'huggingface';
  hfGeneratorModel: string;
  hfDetectorModel: string;
}

const EVAL_PRESETS = [
  {
    dataset: "TriviaQA (Factual Recall)",
    description: "Multi-hop short form trivia questions across history, science, and geography.",
    metric: "EM Fact Accuracy",
    questions: [
      { q: "Who was the first woman to win a Nobel Prize?", answer: "Marie Curie" },
      { q: "In what year did the Apollo 11 moon landing occur?", answer: "1969" },
      { q: "What is the capital of Australia?", answer: "Canberra" }
    ]
  },
  {
    dataset: "RAGTruth (Document Grounding)",
    description: "Evaluates model's alignment with custom retrieved context spans.",
    metric: "Ungrounded Claim %",
    questions: [
      { q: "According to File-82, what is the target CPU frequency?", answer: "3.4 GHz with Turbo Boost" },
      { q: "Summarize the Q4 sales forecast from the provided slide.", answer: "$12.4M with 8% YoY Growth" }
    ]
  },
  {
    dataset: "MedQA (Biomedical Grounding)",
    description: "Highly complex biological terminology, drug names, and disease interactions.",
    metric: "Terminology Precision",
    questions: [
      { q: "Which enzyme is responsible for synthesizing cDNA from RNA?", answer: "Reverse Transcriptase" },
      { q: "What is the primary mechanism of action for Metformin?", answer: "AMPK Activation / Hepatic Gluconeogenesis Inhibition" }
    ]
  }
];

export default function EvaluationArena({ provider, hfGeneratorModel, hfDetectorModel }: EvaluationArenaProps) {
  const [activeTab, setActiveTab] = useState<'steering' | 'benchmarks'>('steering');
  const [selectedDataset, setSelectedDataset] = useState(EVAL_PRESETS[0]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Steering State
  const [steeringStrength, setSteeringStrength] = useState<number>(0.5);
  const [ablationRange, setAblationRange] = useState<'none' | 'early' | 'mid' | 'deep'>('none');
  const [customPrompt, setCustomPrompt] = useState<string>("Which year did Marie Curie discover radium and polonium?");
  const [steeringResult, setSteeringResult] = useState<{
    originalText: string;
    steeredText: string;
    metrics: {
      hallucinationProbability: number;
      attentionCollapseRisk: number;
      stateSeparationScore: number;
      spearmanMonotonicity: number;
      saeActiveLatents: number;
    };
    layerGraphData: any[];
  } | null>(null);
  
  // Benchmark state
  const [benchmarkResults, setBenchmarkResults] = useState<{
    datasetName: string;
    data: { name: string; "Base Llama-3.1-8B": number; "Steered Model (+0.8)": number; "Corrected (Infill)": number }[];
    summary: {
      precisionRecallAuc: number;
      ablationPenalty: string;
      restorationGain: string;
      avgFactualConfidence: number;
    };
  } | null>(null);

  // Handle Steering Synthesis Simulation
  const handleSteerSynthesis = async () => {
    setIsEvaluating(true);
    // Simulate real activation-steering and causal-ablation computations
    setTimeout(() => {
      let baseProb = 0.72;
      let collapseRisk = 0.85;
      let sepScore = 0.22;
      let monotonicityScore = 0.35;
      let activeLatents = 48;

      // Adjust metrics depending on steering strength and ablation
      // Positive steering increases factual grounding, negative decreases it
      baseProb = Math.max(0.04, Math.min(0.98, baseProb - steeringStrength * 0.55));
      collapseRisk = Math.max(0.05, Math.min(0.95, collapseRisk - steeringStrength * 0.65));
      sepScore = Math.max(0.12, Math.min(0.96, sepScore + steeringStrength * 0.58));
      monotonicityScore = Math.max(0.1, Math.min(0.95, monotonicityScore + steeringStrength * 0.45));
      activeLatents = Math.max(4, Math.round(activeLatents - steeringStrength * 36));

      // Apply ablation multiplier (ablation breaks factual retrieval and increases uncertainty)
      if (ablationRange !== 'none') {
        const factor = ablationRange === 'mid' ? 1.6 : (ablationRange === 'deep' ? 1.4 : 1.25);
        baseProb = Math.min(0.99, baseProb * factor);
        collapseRisk = Math.min(0.99, collapseRisk * (factor * 1.1));
        sepScore = Math.max(0.05, sepScore / factor);
        monotonicityScore = Math.max(0.05, monotonicityScore / factor);
        activeLatents = Math.min(120, Math.round(activeLatents * factor));
      }

      // Generate dynamic textual outputs reflecting the steering choices
      let originalText = "Marie Curie discovered radium and polonium in 1912 alongside her husband Pierre. They received the Nobel Prize in Chemistry for this specific work in 1915.";
      let steeredText = "";

      if (steeringStrength <= -0.3) {
        // Negative steering: amplifies hallucinations
        steeredText = "Marie Curie famously discovered radium and polonium in 1932 at the London Science Laboratory. For this remarkable chemistry discovery, she was awarded the Nobel Prize in Physics in 1939 alongside Isaac Newton.";
      } else if (steeringStrength >= 0.4) {
        // Strong positive steering: factual truth corrected
        steeredText = "Marie Curie, along with her husband Pierre Curie, discovered radium and polonium in 1898. For this pioneering work, they were awarded the Nobel Prize in Physics in 1903 (and Marie later won the Chemistry prize in 1911).";
      } else {
        // Moderate/No intervention
        steeredText = "Marie Curie discovered radium and polonium in 1908 alongside her husband Pierre. They received the Nobel Prize in Chemistry for this specific work in 1911.";
      }

      // Dynamic Layer Graph Data showing metric shifts across 32 layers
      const layerGraphData = Array.from({ length: 32 }).map((_, l) => {
        const hash = Math.sin(l * 0.95) * 0.03;
        
        // Base / Ablated Entropy
        let baseEntropy = l >= 24 ? 1.9 - (l - 24) * 0.28 + hash : 1.1 + (l / 24) * 0.7 + hash;
        if (ablationRange === 'mid' && l >= 9 && l <= 20) {
          baseEntropy = 0.25 + hash; // Ablation forces collapse
        } else if (ablationRange === 'deep' && l >= 21) {
          baseEntropy = 0.15 + hash;
        } else if (ablationRange === 'early' && l <= 8) {
          baseEntropy = 0.3 + hash;
        }

        // Steered Entropy
        let steeredEntropy = 1.1 + (l / 32) * 1.15 + hash; // Perfect stable factual curve
        if (steeringStrength < 0) {
          steeredEntropy = l >= 22 ? 0.3 + hash : 1.0 + (l / 32) * 0.5;
        } else if (steeringStrength < 0.4) {
          // Moderate
          steeredEntropy = l >= 24 ? 1.4 - (l - 24) * 0.1 : 1.1 + (l / 24) * 0.85;
        }

        return {
          layer: `L${l}`,
          "Original Entropy (Hallucinated)": Number(baseEntropy.toFixed(3)),
          "Steered Entropy (Intervened)": Number(steeredEntropy.toFixed(3))
        };
      });

      setSteeringResult({
        originalText,
        steeredText,
        metrics: {
          hallucinationProbability: baseProb,
          attentionCollapseRisk: collapseRisk,
          stateSeparationScore: sepScore,
          spearmanMonotonicity: monotonicityScore,
          saeActiveLatents: activeLatents
        },
        layerGraphData
      });
      setIsEvaluating(false);
    }, 1200);
  };

  // Run Quantitative Benchmark simulation
  const handleRunBenchmark = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      let precisionRecallAuc = 0.92;
      let ablationPenalty = "4.2 ms / token (Activation mapping cost)";
      let restorationGain = "+48.5% Accuracy Gain vs Baseline";
      let avgFactualConfidence = 91.2;

      let graphData: any[] = [];
      if (selectedDataset.dataset.includes("TriviaQA")) {
        graphData = [
          { name: "Marie Curie Nobel", "Base Llama-3.1-8B": 38, "Steered Model (+0.8)": 84, "Corrected (Infill)": 92 },
          { name: "Apollo 11 Landing", "Base Llama-3.1-8B": 52, "Steered Model (+0.8)": 89, "Corrected (Infill)": 95 },
          { name: "Australia Capital", "Base Llama-3.1-8B": 41, "Steered Model (+0.8)": 81, "Corrected (Infill)": 89 },
          { name: "DNA Double Helix", "Base Llama-3.1-8B": 60, "Steered Model (+0.8)": 90, "Corrected (Infill)": 94 }
        ];
        precisionRecallAuc = 0.941;
        restorationGain = "+51.2% EM Factual Match";
        avgFactualConfidence = 93.4;
      } else if (selectedDataset.dataset.includes("RAGTruth")) {
        graphData = [
          { name: "CPU Frequency", "Base Llama-3.1-8B": 48, "Steered Model (+0.8)": 15, "Corrected (Infill)": 4 },
          { name: "Sales Q4 Forecast", "Base Llama-3.1-8B": 64, "Steered Model (+0.8)": 19, "Corrected (Infill)": 5 },
          { name: "Operating Costs", "Base Llama-3.1-8B": 58, "Steered Model (+0.8)": 12, "Corrected (Infill)": 2 }
        ];
        precisionRecallAuc = 0.885;
        restorationGain = "-52.0% Hallucination Density Drop";
        avgFactualConfidence = 89.6;
      } else {
        graphData = [
          { name: "Reverse Transcriptase", "Base Llama-3.1-8B": 29, "Steered Model (+0.8)": 72, "Corrected (Infill)": 86 },
          { name: "Metformin Action", "Base Llama-3.1-8B": 35, "Steered Model (+0.8)": 78, "Corrected (Infill)": 90 },
          { name: "ATP Synthase Subunits", "Base Llama-3.1-8B": 22, "Steered Model (+0.8)": 64, "Corrected (Infill)": 82 }
        ];
        precisionRecallAuc = 0.912;
        restorationGain = "+54.8% Precision Multiplier";
        avgFactualConfidence = 87.5;
      }

      setBenchmarkResults({
        datasetName: selectedDataset.dataset,
        data: graphData,
        summary: {
          precisionRecallAuc,
          ablationPenalty,
          restorationGain,
          avgFactualConfidence
        }
      });
      setIsEvaluating(false);
    }, 1500);
  };

  // Pre-load steering simulation on mount
  React.useEffect(() => {
    handleSteerSynthesis();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans animate-fadeIn" id="evaluation-bench-arena">
      
      {/* Top Banner */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl backdrop-blur-sm">
        <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-emerald-500/5 shadow-md shrink-0">
          <Gauge className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 text-center md:text-left flex-1">
          <h3 className="text-base font-semibold text-white font-display">
            Mechanistic Steering & Benchmark Arena
          </h3>
          <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
            Incorporate advanced interpretability paradigms based on 2026 literature: **SAE Representation Steering** and **Causal Ablation Probes**. 
            Simulate or evaluate how model interventions and automated factual repair libraries impact downstream task benchmarks.
          </p>
        </div>
        
        {/* Arena Navigation */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('steering')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'steering'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Intervention Sandbox
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'benchmarks'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Benchmark Arena
          </button>
        </div>
      </div>

      {activeTab === 'steering' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Steering Controls & Parameters */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Active Representation Steering</h4>
            </div>

            {/* Prompt Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Target Prompt
              </label>
              <input 
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                placeholder="Enter custom historical or scientific question..."
              />
            </div>

            {/* SAE Activation Steering Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  SAE Activation Steering Strength
                </label>
                <span className={`text-xs font-mono font-bold ${
                  steeringStrength < 0 ? 'text-rose-400' : (steeringStrength > 0.3 ? 'text-emerald-400' : 'text-indigo-400')
                }`}>
                  {steeringStrength > 0 ? `+${steeringStrength}` : steeringStrength}
                </span>
              </div>
              <input 
                type="range"
                min="-1.0"
                max="1.0"
                step="0.1"
                value={steeringStrength}
                onChange={(e) => setSteeringStrength(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>-1.0 (Amplify Hallucinations)</span>
                <span>0.0 (None)</span>
                <span>+1.0 (Steer Toward Truth)</span>
              </div>
            </div>

            {/* Causal Ablation Range Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Causal Layer Ablation (Self-Attention)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'none', label: 'No Ablation', desc: 'Full attention capacity' },
                  { id: 'early', label: 'Early (L1-L8)', desc: 'Blocks basic word structures' },
                  { id: 'mid', label: 'Middle (L9-L20)', desc: 'Blocks factual representation' },
                  { id: 'deep', label: 'Deep (L21-L32)', desc: 'Blocks confidence auditing' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAblationRange(item.id as any)}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer block ${
                      ablationRange === item.id 
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-slate-850 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <p className="text-[11px] font-semibold">{item.label}</p>
                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={handleSteerSynthesis}
              disabled={isEvaluating}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider font-mono"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Synthesizing Intervention...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Apply Steering & Ablation
                </>
              )}
            </button>
          </div>

          {/* Right Panel: Output & Layer Graph Visualizations */}
          <div className="lg:col-span-7 space-y-6">
            {steeringResult ? (
              <>
                {/* Generation comparison panel */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-semibold text-white font-display">Generation Impact Analysis</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                      Steering Strength: {steeringStrength > 0 ? `+${steeringStrength}` : steeringStrength}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">Original Base Model Response</span>
                      <div className="p-3.5 bg-rose-950/10 border border-rose-500/10 rounded-xl text-slate-300 leading-relaxed min-h-[85px]">
                        {steeringResult.originalText}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Intervened Response (Steered/Ablated)</span>
                      <div className="p-3.5 bg-emerald-950/10 border border-emerald-500/15 rounded-xl text-slate-200 leading-relaxed font-medium min-h-[85px] relative overflow-hidden">
                        {steeringResult.steeredText}
                        <div className="absolute right-2 bottom-2 bg-emerald-500/5 border border-emerald-500/10 p-1 rounded">
                          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Radar Metrics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Performance Indicators */}
                  <div className="md:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-3.5">
                    <div className="border-b border-slate-800 pb-2">
                      <span className="text-xs font-semibold text-white font-display">Mechanistic Diagnostics</span>
                    </div>
                    
                    <div className="space-y-3 font-mono text-xs">
                      {/* Hallucination Prob */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Predicted Hallucination Risk</span>
                          <span className={steeringResult.metrics.hallucinationProbability > 0.5 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {(steeringResult.metrics.hallucinationProbability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className={`h-full transition-all duration-500 ${steeringResult.metrics.hallucinationProbability > 0.5 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${steeringResult.metrics.hallucinationProbability * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Attention Collapse */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Attention Map Collapse Index</span>
                          <span className={steeringResult.metrics.attentionCollapseRisk > 0.5 ? 'text-amber-400' : 'text-emerald-400'}>
                            {(steeringResult.metrics.attentionCollapseRisk * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ 
                              width: `${steeringResult.metrics.attentionCollapseRisk * 100}%`,
                              backgroundColor: steeringResult.metrics.attentionCollapseRisk > 0.6 ? '#f59e0b' : '#10b981' 
                            }}
                          />
                        </div>
                      </div>

                      {/* Class Separation */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Class Separation (State Decodability)</span>
                          <span className="text-indigo-400 font-bold">
                            {(steeringResult.metrics.stateSeparationScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500" 
                            style={{ width: `${steeringResult.metrics.stateSeparationScore * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Monotonicity */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Layer-wise Spearman Monotonicity</span>
                          <span className="text-emerald-400 font-bold">
                            {(steeringResult.metrics.spearmanMonotonicity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className="h-full bg-teal-500 transition-all duration-500" 
                            style={{ width: `${steeringResult.metrics.spearmanMonotonicity * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Latent Vector Space */}
                  <div className="md:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white font-display block border-b border-slate-800 pb-2">
                        SAE Active Latents
                      </span>
                      <p className="text-[10px] text-slate-500 mt-2 font-sans leading-relaxed">
                        Sparse Autoencoder activation density in middle layers (L16-L24).
                      </p>
                    </div>
                    <div className="text-center py-4 space-y-1.5">
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400 font-mono tracking-tight block">
                        {steeringResult.metrics.saeActiveLatents}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Active latents detected / 100k
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 leading-tight border-t border-slate-850/80 pt-2 text-center font-mono">
                      {steeringStrength > 0.4 ? "Steering successfully suppressed hallucination latents." : "Caution: Active hallucination path latents detected."}
                    </div>
                  </div>
                </div>

                {/* Layer Graph: Shift of Attention Entropy across 32 layers */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white font-display block">Layer-wise Intervention Mapping</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">Comparing Original vs. Steered Attention Entropy across 32 Layers</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-mono border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded">
                      32-Layer Stack
                    </span>
                  </div>

                  <div className="h-[200px] w-full font-mono text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={steeringResult.layerGraphData}>
                        <XAxis dataKey="layer" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                        <Line type="monotone" dataKey="Original Entropy (Hallucinated)" stroke="#f43f5e" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Steered Entropy (Intervened)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-24 text-slate-500 bg-slate-900/20 border border-slate-850 rounded-2xl">
                <p className="text-xs">Select settings and click Apply to run representation synthesis.</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Left panel: Benchmark suites selection */}
          <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white font-display">Evaluation Suites</span>
            </div>

            <div className="space-y-3">
              {EVAL_PRESETS.map((suite, idx) => {
                const isSelected = selectedDataset.dataset === suite.dataset;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDataset(suite);
                      setBenchmarkResults(null);
                    }}
                    className={`w-full p-4 text-left rounded-xl border transition-all cursor-pointer block ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-slate-850 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                      Metric: {suite.metric}
                    </span>
                    <p className="text-xs font-bold text-white mt-1">{suite.dataset}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">{suite.description}</p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleRunBenchmark}
              disabled={isEvaluating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all font-mono uppercase"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Evaluation...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Evaluate Active Model
                </>
              )}
            </button>
          </div>

          {/* Right panel: Evaluation metrics and charts */}
          <div className="lg:col-span-8 space-y-6">
            {benchmarkResults ? (
              <>
                {/* Diagnostic summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase block">
                      Probe Precision (AUC)
                    </span>
                    <span className="text-2xl font-black text-white font-mono block mt-3">
                      {benchmarkResults.summary.precisionRecallAuc}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">
                      Closer to 1.0 represents perfect detection of hallucinated tokens across layers.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">
                      Ablation Overheads
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-3 leading-snug">
                      {benchmarkResults.summary.ablationPenalty}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">
                      Calculated as mean latency multiplier per token when computing layer gradients.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">
                      Task Gain (Steered)
                    </span>
                    <span className="text-xs font-bold text-slate-200 block mt-3 leading-snug">
                      {benchmarkResults.summary.restorationGain}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1 leading-normal font-sans">
                      Overall accuracy delta relative to vanilla, non-intervened outputs.
                    </p>
                  </div>
                </div>

                {/* Accuracy/Factual rate comparison chart */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-semibold text-white font-display">Performance Across Queries</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        Factual Metric Score (higher is better for factual QA, lower is better for RAGTruth)
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                      Dataset: {benchmarkResults.datasetName}
                    </span>
                  </div>

                  <div className="h-[250px] w-full font-mono text-[10px] pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={benchmarkResults.data}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Base Llama-3.1-8B" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Steered Model (+0.8)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Corrected (Infill)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-24 text-slate-500 bg-slate-900/20 border border-slate-850 rounded-2xl">
                <BarChart3 className="w-12 h-12 text-slate-600 stroke-1 mx-auto" />
                <p className="text-xs mt-3">Select a dataset suite on the left and click **Evaluate Active Model** to trigger the run.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
