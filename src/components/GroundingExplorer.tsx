import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw, 
  Activity, 
  ArrowRight, 
  Bookmark, 
  Search,
  BookOpen,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Info
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface ClaimAlignment {
  claim: string;
  claimSpan: string;
  status: 'supported' | 'contradicted' | 'ungrounded';
  sourceSentence: string;
  alignmentScore: number;
  explanation: string;
}

const DEFAULT_REFERENCE = `The Apollo 11 mission landed on the Moon on July 20, 1969. Commander Neil Armstrong and Lunar Module Pilot Buzz Aldrin walked on the lunar surface for two and a half hours, while Command Module Pilot Michael Collins remained in lunar orbit. They collected 47.5 pounds of lunar material to bring back to Earth. The mission launched from Kennedy Space Center in Florida on July 16, 1969.`;

const DEFAULT_GENERATION = `Apollo 11 successfully touched down on the Moon in July 1969. Buzz Aldrin and Neil Armstrong walked on the surface for over two hours. Meanwhile, Michael Collins stayed behind in orbit. They returned with 120 pounds of lunar rocks, which were distributed to laboratories in France and Germany.`;

export default function GroundingExplorer() {
  const [referenceText, setReferenceText] = useState(DEFAULT_REFERENCE);
  const [generatedText, setGeneratedText] = useState(DEFAULT_GENERATION);
  const [provider, setProvider] = useState<'gemini' | 'huggingface'>('gemini');
  const [hfModel, setHfModel] = useState('meta-llama/Meta-Llama-3.1-8B-Instruct');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [claims, setClaims] = useState<ClaimAlignment[]>([]);
  const [selectedClaimIdx, setSelectedClaimIdx] = useState<number | null>(null);

  // Run initial alignment on load
  useEffect(() => {
    handleRunAlignment();
  }, []);

  const handleRunAlignment = async () => {
    setIsLoading(true);
    setApiError(null);
    setSelectedClaimIdx(null);

    try {
      const response = await fetch('/api/grounding-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          referenceText,
          generatedText,
          provider,
          hfModel
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze factual alignment.');
      }

      setClaims(data.claims || []);
      if (data.claims && data.claims.length > 0) {
        setSelectedClaimIdx(0);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An error occurred during factual grounding alignment.');
      // Fallback local simulation so the app is always functional
      simulateLocalAlignment();
    } finally {
      setIsLoading(false);
    }
  };

  const simulateLocalAlignment = () => {
    const mockClaims: ClaimAlignment[] = [
      {
        claim: "Apollo 11 landed on the Moon in July 1969",
        claimSpan: "Moon in July 1969",
        status: "supported",
        sourceSentence: "The Apollo 11 mission landed on the Moon on July 20, 1969.",
        alignmentScore: 0.98,
        explanation: "Correctly matches the date and landing context explicitly stated in the source."
      },
      {
        claim: "Buzz Aldrin and Neil Armstrong walked on the surface for over two hours",
        claimSpan: "walked on the surface for over two hours",
        status: "supported",
        sourceSentence: "Commander Neil Armstrong and Lunar Module Pilot Buzz Aldrin walked on the lunar surface for two and a half hours",
        alignmentScore: 0.95,
        explanation: "Supported. Two and a half hours is indeed 'over two hours'."
      },
      {
        claim: "They returned with 120 pounds of lunar rocks",
        claimSpan: "120 pounds of lunar rocks",
        status: "contradicted",
        sourceSentence: "They collected 47.5 pounds of lunar material to bring back to Earth.",
        alignmentScore: 0.12,
        explanation: "Factual Contradiction. The source states they collected 47.5 pounds of material, whereas the response claims 120 pounds."
      },
      {
        claim: "Lunar rocks were distributed to laboratories in France and Germany",
        claimSpan: "distributed to laboratories in France and Germany",
        status: "ungrounded",
        sourceSentence: "None",
        alignmentScore: 0.50,
        explanation: "Ungrounded. The reference document contains no mention of distributing material to France or Germany."
      }
    ];
    setClaims(mockClaims);
    setSelectedClaimIdx(0);
  };

  // Preset scenarios to load instantly
  const loadScenario = (ref: string, gen: string) => {
    setReferenceText(ref);
    setGeneratedText(gen);
    setClaims([]);
    setSelectedClaimIdx(null);
  };

  const SCENARIOS = [
    {
      name: "Apollo Moon Landing (Factual Overstatement)",
      ref: DEFAULT_REFERENCE,
      gen: DEFAULT_GENERATION
    },
    {
      name: "Superconductors LK-99 (Fictional Claim Swap)",
      ref: "In July 2023, South Korean researchers published papers claiming the discovery of LK-99, a room-temperature superconductor. However, subsequent independent global studies by Max Planck Institute and Argonne Labs failed to replicate the superconductivity, identifying impurities like copper sulfide (Cu2S) as the source of resistivity drops.",
      gen: "LK-99 was successfully confirmed as a room-temperature superconductor in August 2023. Independent replication studies at the Paris Institute of Materials successfully manufactured pure crystals that showed zero resistance at room temp."
    },
    {
      name: "Ada Lovelace History (Time & Role Misattribution)",
      ref: "Ada Lovelace wrote the first computer algorithm for Charles Babbage's mechanical general-purpose computer, the Analytical Engine, in 1843. Her notes contained a method for calculating Bernoulli numbers.",
      gen: "Ada Lovelace invented the digital electronic vacuum tube computer in 1912 for her close research partner Alan Turing. Together they coded a complete algorithm for playing chess."
    }
  ];

  // Calculate high-level summary metrics
  const totalClaims = claims.length;
  const supportedCount = claims.filter(c => c.status === 'supported').length;
  const contradictedCount = claims.filter(c => c.status === 'contradicted').length;
  const ungroundedCount = claims.filter(c => c.status === 'ungrounded').length;

  const groundingRatio = totalClaims > 0 ? (supportedCount / totalClaims) * 100 : 0;
  const contaminationIndex = totalClaims > 0 ? (contradictedCount / totalClaims) * 100 : 0;
  const ungroundedIndex = totalClaims > 0 ? (ungroundedCount / totalClaims) * 100 : 0;

  // Chart data
  const pieData = [
    { name: 'Supported', value: supportedCount, color: '#10b981' },
    { name: 'Contradicted', value: contradictedCount, color: '#f43f5e' },
    { name: 'Ungrounded', value: ungroundedCount, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  const selectedClaim = selectedClaimIdx !== null ? claims[selectedClaimIdx] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans animate-fadeIn" id="grounding-explorer-tab">
      
      {/* Banner */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl backdrop-blur-sm">
        <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-indigo-500/5 shadow-md shrink-0">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 text-center md:text-left flex-1">
          <h3 className="text-base font-semibold text-white font-display">
            Dynamic RAG Grounding & Factual Attractor Map
          </h3>
          <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
            Compare model output against authoritative reference text. Deconstruct statements into atomic factual claims and map their 
            gravitational attraction or repulsion to specific sentences in your reference documentation.
          </p>
        </div>
        
        {/* Preset Selector Dropdown */}
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Scenarios presets</span>
          <select
            onChange={(e) => {
              const selected = SCENARIOS[parseInt(e.target.value)];
              if (selected) loadScenario(selected.ref, selected.gen);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {SCENARIOS.map((sc, i) => (
              <option key={i} value={i}>{sc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input Ingestion Editors */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold text-white font-display flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              Source Context & Output
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">Input Workspace</span>
          </div>

          {/* Reference Ground Truth Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                1. Reference Context (Authoritative Ground Truth)
              </label>
              <span className="text-[9px] text-slate-500 font-mono">Source documents / RAG retrieval</span>
            </div>
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              className="w-full h-32 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/85 focus:ring-1 focus:ring-indigo-500/20 leading-relaxed font-sans placeholder-slate-600 resize-none"
              placeholder="Paste authoritative grounding documents, wikipedia entries, API schemas, or legal clauses..."
            />
          </div>

          {/* Generated Text to Align */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                2. Generated Text (Factual Assertions to Map)
              </label>
              <span className="text-[9px] text-slate-500 font-mono">Model draft output</span>
            </div>
            <textarea
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              className="w-full h-28 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/85 focus:ring-1 focus:ring-indigo-500/20 leading-relaxed font-sans placeholder-slate-600 resize-none"
              placeholder="Paste response generated by an LLM to rate..."
            />
          </div>

          {/* Integration Model Selector & Alignment Trigger */}
          <div className="pt-2 border-t border-slate-900/80 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase font-mono block">Provider Engine</span>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
                  <button
                    onClick={() => setProvider('gemini')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                      provider === 'gemini' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Gemini API
                  </button>
                  <button
                    onClick={() => setProvider('huggingface')}
                    className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                      provider === 'huggingface' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hugging Face
                  </button>
                </div>
              </div>

              {provider === 'huggingface' && (
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase font-mono block">HF Solver</span>
                  <select
                    value={hfModel}
                    onChange={(e) => setHfModel(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="meta-llama/Meta-Llama-3.1-8B-Instruct">Llama 3.1 8B</option>
                    <option value="Qwen/Qwen2.5-14B-Instruct">Qwen 2.5 14B</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleRunAlignment}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all font-mono uppercase tracking-wider"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Factual Alignment...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Audit Factual Claims
                </>
              )}
            </button>
          </div>

          {apiError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2 animate-fadeIn font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice</p>
                <p className="text-[10px] mt-0.5 leading-normal text-rose-300/90">{apiError}. Simulated offline layout applied.</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Factual Attractor Map & Alignments */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-xl backdrop-blur-sm">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">Factual Claims</span>
              <span className="text-2xl font-black text-white font-mono block mt-2">{totalClaims}</span>
              <span className="text-[9px] text-slate-500 font-mono mt-1">Total Assertions</span>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-xl backdrop-blur-sm">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">Grounding Rate</span>
              <span className="text-2xl font-black text-emerald-400 font-mono block mt-2">{groundingRatio.toFixed(0)}%</span>
              <span className="text-[9px] text-slate-500 font-mono mt-1">{supportedCount} Supported</span>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-xl backdrop-blur-sm">
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase block">Contamination</span>
              <span className="text-2xl font-black text-rose-400 font-mono block mt-2">{contaminationIndex.toFixed(0)}%</span>
              <span className="text-[9px] text-slate-500 font-mono mt-1">{contradictedCount} Contradicted</span>
            </div>

            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-xl backdrop-blur-sm">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">Ungrounded Rate</span>
              <span className="text-2xl font-black text-amber-400 font-mono block mt-2">{ungroundedIndex.toFixed(0)}%</span>
              <span className="text-[9px] text-slate-500 font-mono mt-1">{ungroundedCount} Not verifiable</span>
            </div>
          </div>

          {/* Interactive Attractor Map (Cosmic Factual Gravity Field) */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-xs font-semibold text-white font-display flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Factual Gravity Field / Grounding Map
                </span>
                <span className="text-[10px] text-slate-500 font-sans mt-0.5 block">
                  Orbiting claims attracted to Reference Center. Closer orbit = Higher Factual Alignment Score.
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-mono border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded font-bold uppercase">
                Active Field
              </span>
            </div>

            {claims.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Attractor Map Canvas (SVG) */}
                <div className="md:col-span-6 flex justify-center relative bg-slate-950/60 rounded-xl p-4 border border-slate-900 overflow-hidden h-[240px]">
                  
                  {/* Subtle Background Stars / Waves */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
                  
                  <svg viewBox="0 0 200 200" className="w-full h-full max-w-[200px] select-none relative z-10 overflow-visible">
                    {/* Gravitational Waves (Orbit Rings) */}
                    <circle cx="100" cy="100" r="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                    <circle cx="100" cy="100" r="55" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4" />

                    {/* Central Gravity Core (Reference Ground Truth) */}
                    <circle cx="100" cy="100" r="12" fill="#6366f1" className="animate-pulse shadow-xl" style={{ animationDuration: '4s' }} />
                    <circle cx="100" cy="100" r="12" fill="none" stroke="#818cf8" strokeWidth="1" />
                    <text x="100" y="102" fontSize="5" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontStyle="normal" fontFamily="monospace">
                      RAG
                    </text>

                    {/* Draw Connection Lines and Orbiting Claim Nodes */}
                    {claims.map((claim, index) => {
                      // Orbit calculation based on index and score
                      // supported = close orbit (r: 30-45)
                      // contradicted = very outer orbit (r: 80-90)
                      // ungrounded = middle orbit (r: 55-65)
                      let radius = 80;
                      let color = '#f43f5e'; // contradicted
                      if (claim.status === 'supported') {
                        radius = 35 + (1 - claim.alignmentScore) * 15;
                        color = '#10b981';
                      } else if (claim.status === 'ungrounded') {
                        radius = 60;
                        color = '#f59e0b';
                      }

                      // Distribute nodes evenly around the circle
                      const angle = (index * (360 / claims.length)) * (Math.PI / 180);
                      const x = 100 + radius * Math.cos(angle);
                      const y = 100 + radius * Math.sin(angle);

                      const isSelected = selectedClaimIdx === index;

                      return (
                        <g key={index} className="cursor-pointer transition-all duration-300" onClick={() => setSelectedClaimIdx(index)}>
                          {/* Tether line with gradient or dashed opacity */}
                          <line 
                            x1="100" 
                            y1="100" 
                            x2={x} 
                            y2={y} 
                            stroke={color} 
                            strokeWidth={isSelected ? "1" : "0.4"} 
                            strokeDasharray={claim.status === 'supported' ? 'none' : '2,2'}
                            opacity={isSelected ? "0.95" : "0.35"} 
                          />
                          
                          {/* Inner pulsing aura for selected claim */}
                          {isSelected && (
                            <circle cx={x} cy={y} r="10" fill={color} opacity="0.15" className="animate-ping" />
                          )}

                          {/* Interactive claim Node */}
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={isSelected ? "7" : "5"} 
                            fill={color} 
                            stroke={isSelected ? "#ffffff" : "none"}
                            strokeWidth="1"
                            className="transition-all duration-300 hover:scale-125" 
                          />
                          
                          {/* Label number */}
                          <text x={x} y={y + 1.8} fontSize="5" fontWeight="bold" fill="#020617" textAnchor="middle" fontFamily="monospace">
                            {index + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend and explanation */}
                <div className="md:col-span-6 space-y-3 font-sans text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Orbital Gravity Coordinates
                  </span>
                  
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Factual Core Attraction (Supported claims)</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-400 font-mono">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Centrifugal Repulsion (Factual contradictions)</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-400 font-mono">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Drifting Space Inertia (Ungrounded claims)</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed font-sans border-t border-slate-900 pt-3">
                    Hover or click the orbiting claim spheres on the map, or select claims in the list below to analyze claims alignment, evidence, and mathematical tethers.
                  </p>
                </div>

              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 bg-slate-950/20 border border-slate-900 rounded-xl">
                <p className="text-xs">No active claims parsed yet. Write reference document and press Factual Audit to initialize.</p>
              </div>
            )}
          </div>

          {/* Interactive Claim Inspector & Alignment List */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
            <div className="border-b border-slate-800/80 pb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-white font-display">Claim Alignment Audit Trail</span>
              <span className="text-[10px] font-mono text-slate-500">Atomic Claims</span>
            </div>

            <div className="space-y-2.5">
              {claims.map((claim, idx) => {
                const isSelected = selectedClaimIdx === idx;
                
                let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
                let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                if (claim.status === 'contradicted') {
                  badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/25";
                  icon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
                } else if (claim.status === 'ungrounded') {
                  badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/25";
                  icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
                }

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedClaimIdx(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer block ${
                      isSelected
                        ? 'bg-slate-950 border-indigo-500 shadow-md shadow-indigo-950/20'
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center border border-slate-700">
                          {idx + 1}
                        </span>
                        <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${badgeColor}`}>
                          {claim.status}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Score: {(claim.alignmentScore * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white mt-2.5 leading-relaxed">
                      "{claim.claim}"
                    </p>

                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-slate-900 space-y-3.5 animate-fadeIn text-[11px] font-sans">
                        {/* Reference Evidence Segment */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                            Evidence in Source Reference
                          </span>
                          <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-slate-300 leading-relaxed font-sans italic border-l-2 border-l-indigo-500">
                            {claim.sourceSentence === "None" ? (
                              <span className="text-slate-500 not-italic">No supporting or contradicting evidence found in the reference document.</span>
                            ) : (
                              `"${claim.sourceSentence}"`
                            )}
                          </div>
                        </div>

                        {/* Semantic Audit Verdict Explanation */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                            Auditor Verdict & Analysis
                          </span>
                          <p className="text-slate-400 leading-relaxed pl-1">
                            {claim.explanation}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
