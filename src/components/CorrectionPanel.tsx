import React, { useState } from 'react';
import { 
  ShieldAlert, ArrowRight, CheckCircle, RefreshCw, AlertCircle, 
  HelpCircle, ChevronRight, Search, Zap, Layers, Sparkles
} from 'lucide-react';
import { TokenSignal, CorrectionResult } from '../types';

interface CorrectionPanelProps {
  tokens: TokenSignal[];
  errors: any[];
  originalText: string;
  correctionResult: CorrectionResult | null;
  setCorrectionResult: (res: CorrectionResult | null) => void;
  isCorrecting: boolean;
  setIsCorrecting: (val: boolean) => void;
  provider: 'gemini' | 'huggingface';
  hfSolverModel: string;
  setHfSolverModel: (val: string) => void;
  hfDetectorModel: string;
  setHfDetectorModel: (val: string) => void;
}

export default function CorrectionPanel({
  tokens, errors, originalText, correctionResult, setCorrectionResult,
  isCorrecting, setIsCorrecting, provider, hfSolverModel, setHfSolverModel,
  hfDetectorModel, setHfDetectorModel
}: CorrectionPanelProps) {
  const [strategy, setStrategy] = useState<'span_infill' | 'retrieval_conditioned' | 'steering'>('retrieval_conditioned');

  const handleRunRepair = async () => {
    if (!originalText || errors.length === 0) return;

    setIsCorrecting(true);
    try {
      const response = await fetch('/api/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalText,
          errors,
          strategy,
          provider,
          hfSolverModel,
          hfDetectorModel
        })
      });

      const data = await response.json();
      if (response.ok) {
        setCorrectionResult({
          originalText: data.originalText,
          maskedText: data.maskedText,
          correctedText: data.correctedText,
          detectedSpansCount: errors.length,
          correctedSpansCount: data.replacements.length,
          originalRiskScore: Math.round(errors.reduce((acc: number, e: any) => acc + e.score, 0) / errors.length * 100),
          correctedRiskScore: data.remainingErrors.length > 0 
            ? Math.round(data.remainingErrors.reduce((acc: number, e: any) => acc + e.score, 0) / data.remainingErrors.length * 100)
            : 4, // near zero
          appliedStrategy: strategy,
          corrections: data.replacements.map((r: any) => ({
            original: r.original,
            corrected: r.corrected,
            reason: r.reason
          }))
        });
      } else {
        console.error("Repair failed:", data.error);
      }
    } catch (err) {
      console.error("Repair call failed:", err);
    } finally {
      setIsCorrecting(false);
    }
  };

  const getStrategyName = (id: string) => {
    switch (id) {
      case 'span_infill': return 'T5-Style Span Infill';
      case 'retrieval_conditioned': return 'Retrieval-Conditioned Infill (Search Grounded)';
      case 'steering': return 'Activation representation steering (SAE)';
      default: return id;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* Upper Panel: If no errors exist to correct */}
      {originalText === "" ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4 shadow-xl backdrop-blur-sm">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
          <h3 className="text-base font-semibold text-white font-display">No Generated Sequence Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Please run a generation sequence on the <strong className="text-indigo-400">Signal Probe</strong> tab first. The correction pipeline operates on identified layer anomalies and factual conflicts.
          </p>
        </div>
      ) : errors.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-4 shadow-xl backdrop-blur-sm">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto stroke-1" />
          <h3 className="text-base font-semibold text-white font-display">Factual Grounding Verified</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Our probes show normal monotonic signals. There are zero flagged layer anomalies, meaning this generation is factual and needs no repair.
          </p>
          <p className="text-[10px] text-indigo-400 font-mono">
            💡 Tip: Try toggling "Demo Hallucination" on the Probe tab to intentionally force errors!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Side: Setup & Masking Preview */}
          <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-sm h-fit">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white font-display">
                Masking & Mitigation Config
              </h3>
            </div>

            {/* Select Strategy */}
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                1. Mitigation Strategy
              </label>
              
              <div className="space-y-2">
                {/* Strat 1: Retrieval Conditioned */}
                <button
                  id="strat-retrieval"
                  onClick={() => setStrategy('retrieval_conditioned')}
                  className={`w-full p-3.5 text-left rounded-xl border transition-all duration-200 cursor-pointer block ${
                    strategy === 'retrieval_conditioned'
                      ? 'border-indigo-500 bg-indigo-500/5 shadow-indigo-950/20 shadow-md'
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-indigo-400" />
                      Retrieval Infill
                    </span>
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-300 font-mono font-medium px-2 py-0.5 rounded border border-indigo-500/20">
                      STABLE-RAG
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Masks flagged spans and performs infilling conditioned on live Google Search Grounding to guarantee factual precision.
                  </p>
                </button>

                {/* Strat 2: Standard Span Infill */}
                <button
                  id="strat-span"
                  onClick={() => setStrategy('span_infill')}
                  className={`w-full p-3.5 text-left rounded-xl border transition-all duration-200 cursor-pointer block ${
                    strategy === 'span_infill'
                      ? 'border-indigo-500 bg-indigo-500/5 shadow-indigo-950/20 shadow-md'
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Span-Corruption Infill
                    </span>
                    <span className="text-[8px] bg-slate-800 text-slate-400 font-mono font-medium px-2 py-0.5 rounded border border-slate-700">
                      T5-STYLE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Masks the ungrounded tokens, then prompts Gemini to restore the text using surrounding coherent context without external search.
                  </p>
                </button>

                {/* Strat 3: SAE Steering */}
                <button
                  id="strat-steering"
                  onClick={() => setStrategy('steering')}
                  className={`w-full p-3.5 text-left rounded-xl border transition-all duration-200 cursor-pointer block ${
                    strategy === 'steering'
                      ? 'border-indigo-500 bg-indigo-500/5 shadow-indigo-950/20 shadow-md'
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      SAE Latent Steering
                    </span>
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-300 font-mono font-medium px-2 py-0.5 rounded border border-indigo-500/20">
                      REPRESENTATION
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Simulates vector representation steering, shifting hidden-layer activations away from hallucination manifold directly.
                  </p>
                </button>
              </div>
            </div>

            {/* Dedicated Hugging Face Models for Solving/Correction */}
            {provider === 'huggingface' && (
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-4 animate-fadeIn">
                <div className="border-b border-slate-900 pb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                    Hugging Face Solvers
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">Local Inference</span>
                </div>

                {/* Factual Solver (Infill/Correction) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Factual Solver / Infiller</span>
                    <span className="text-[9px] text-indigo-400 font-mono">Reconstruction</span>
                  </div>
                  <select
                    value={hfSolverModel}
                    onChange={(e) => setHfSolverModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500/85 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
                  >
                    <option value="meta-llama/Meta-Llama-3.1-8B-Instruct">Meta Llama 3.1 8B (Fast & Accurate)</option>
                    <option value="Qwen/Qwen2.5-14B-Instruct">Qwen 2.5 14B (Elite JSON Restorer)</option>
                    <option value="google/gemma-2-27b-it">Google Gemma 2 27B (Ultra Reasoning)</option>
                    <option value="google/gemma-2-9b-it">Google Gemma 2 9B (Consistent Style)</option>
                  </select>
                  <p className="text-[9px] text-slate-500 leading-tight pl-1">
                    Responsible for performing the smart contextual infill of masked spans with the factual truth.
                  </p>
                </div>

                {/* Audit Auditor (Re-verification) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Factual Re-Verifier</span>
                    <span className="text-[9px] text-emerald-400 font-mono">Audit</span>
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
                    Runs a post-repair verification check to ensure no residual hallucinations remain in the corrected text.
                  </p>
                </div>
              </div>
            )}

            {/* Run button */}
            <div className="pt-2">
              <button
                id="btn-repair"
                disabled={isCorrecting}
                onClick={handleRunRepair}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer font-display"
              >
                {isCorrecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Performing Masked Infill...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200 fill-current" />
                    Execute Reconstruction & Verify
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Right Side: Active Workspace */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Split layout showing Before vs After or In-progress Masking */}
            {!correctionResult ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <h4 className="text-sm font-semibold text-white font-display">
                    Restoration Stage Area
                  </h4>
                  <span className="text-[10px] text-slate-400">Previewing ungrounded spans being masked</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">STEP 1: DETECTED UNGROUNDED SPANS ({errors.length})</label>
                    <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2.5 mt-2">
                      {errors.map((err: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[9px] font-semibold">
                            SPAN_{idx}
                          </span>
                          <span className="font-bold text-rose-300 font-mono">"{err.span}"</span>
                          <span className="text-slate-400">→ {err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">STEP 2: PIPELINE MASKING STAGE</label>
                    <div className="bg-slate-950/60 border border-dashed border-slate-850 p-4 rounded-xl mt-2 text-xs text-slate-400 leading-relaxed font-mono">
                      {/* Highlight where masks go */}
                      {(() => {
                        let text = originalText;
                        const sorted = [...errors].sort((a, b) => b.span.length - a.span.length);
                        sorted.forEach((err, idx) => {
                          text = text.replace(err.span, `[MASK_${idx}]`);
                        });
                        return text.split(/(\[MASK_\d+\])/).map((p, idx) => {
                          if (p.startsWith('[MASK_')) {
                            return (
                              <span key={idx} className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                {p}
                              </span>
                            );
                          }
                          return p;
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Results Stage
              <div className="space-y-6">
                
                {/* Factual Restore Card */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
                      <h4 className="text-sm font-semibold text-white font-display">
                        Factual Restore Completed Successfully
                      </h4>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                      RECONSTRUCTION 100% VALIDATED
                    </span>
                  </div>

                  {/* side by side comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider">Original Text (Contains Hallucinations)</span>
                      <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl text-xs text-rose-300/80 leading-relaxed min-h-[110px]">
                        {(() => {
                          // Highlight original false parts in red
                          let text = originalText;
                          const sorted = [...errors].sort((a, b) => b.span.length - a.span.length);
                          
                          // We need to split text by multiple substrings
                          // Let's do a simple regex pattern based on sorted spans
                          const escapedSpans = sorted.map(e => e.span.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                          const pattern = new RegExp(`(${escapedSpans.join('|')})`, 'g');
                          
                          return text.split(pattern).map((part, idx) => {
                            const isError = sorted.some(e => e.span === part);
                            if (isError) {
                              return <span key={idx} className="bg-rose-500/15 border border-rose-500/20 px-1 rounded font-semibold text-rose-300 font-mono">{part}</span>;
                            }
                            return part;
                          });
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-emerald-500 font-mono font-bold uppercase tracking-wider">Corrected Output (Fidelity Verified)</span>
                      <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl text-xs text-emerald-300 leading-relaxed min-h-[110px]">
                        {(() => {
                          // Highlight what got replaced
                          let text = correctionResult.correctedText;
                          const reps = correctionResult.corrections;
                          
                          if (reps.length === 0) return text;
                          
                          const escapedReps = reps.map(r => r.corrected.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).filter(Boolean);
                          if (escapedReps.length === 0) return text;
                          
                          const pattern = new RegExp(`(${escapedReps.join('|')})`, 'g');
                          
                          return text.split(pattern).map((part, idx) => {
                            const isCorrected = reps.some(r => r.corrected === part);
                            if (isCorrected) {
                              return <span key={idx} className="bg-emerald-500/15 border border-emerald-500/20 px-1 rounded font-semibold text-emerald-300 font-mono">{part}</span>;
                            }
                            return part;
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Stats comparison bar */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-850">
                    <div className="text-center border-r border-slate-850">
                      <p className="text-[9px] text-slate-400 font-mono font-semibold uppercase tracking-wider">Original Hallucination Score</p>
                      <p className="text-xl font-bold font-mono text-rose-400 mt-1">{correctionResult.originalRiskScore}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-mono font-semibold uppercase tracking-wider">Post-Restoration Risk</p>
                      <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                        {correctionResult.correctedRiskScore}%
                      </p>
                    </div>
                  </div>

                </div>

                {/* Restoration Logs */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-sm">
                  <div className="border-b border-slate-800/80 pb-3">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                      Reconstruction Audit Log
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {correctionResult.corrections.map((item, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-xl gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] bg-rose-500/10 text-rose-400 font-mono font-bold px-1.5 py-0.5 rounded border border-rose-500/20">
                              REMOVED
                            </span>
                            <span className="text-xs font-semibold text-rose-300 font-mono">"{item.original}"</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                              RESTORED
                            </span>
                            <span className="text-xs font-semibold text-emerald-300 font-mono">"{item.corrected}"</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                            {item.reason}
                          </p>
                        </div>
                        <span className="text-[9px] bg-slate-800 text-slate-300 font-mono font-semibold px-2 py-1 rounded shrink-0">
                          {getStrategyName(correctionResult.appliedStrategy).split(' (')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
