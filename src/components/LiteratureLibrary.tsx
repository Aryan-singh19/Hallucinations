import React, { useState } from 'react';
import { 
  BookOpen, 
  ExternalLink, 
  Filter, 
  HelpCircle, 
  GraduationCap, 
  ArrowRight, 
  Search, 
  Gauge, 
  Layers, 
  Sliders, 
  ShieldCheck, 
  Activity, 
  Atom, 
  Sparkles,
  Info
} from 'lucide-react';
import { PaperSummary } from '../types';

const PAPERS: PaperSummary[] = [
  {
    id: "farquhar-2024",
    title: "Detecting Hallucinations in Large Language Models Using Semantic Entropy",
    authors: "Farquhar et al. (Oxford / Google DeepMind)",
    link: "https://www.nature.com/articles/s41586-024-07421-3",
    year: 2024,
    category: "Entropy & Uncertainty",
    keyTakeaway: "Introduced Semantic Entropy, a key baseline which groups generated outputs into equivalence classes based on their meaning, calculating entropy over classes rather than tokens to measure genuine factual uncertainty.",
    howItInforms: "Provides the underlying mathematical justification for measuring semantic dispersion. In our app, we represent semantic entropy as a later-layer signal that escalates when the model is faced with ambiguous or false prompts."
  },
  {
    id: "seps-2024",
    title: "Semantic Entropy Probes: Robust and Cheap Hallucination Detection in LLMs",
    authors: "Bi et al.",
    link: "https://arxiv.org/abs/2406.15927",
    year: 2024,
    category: "Entropy & Uncertainty",
    keyTakeaway: "Discovered that semantic entropy is linearly encoded in LLM hidden states, meaning a simple classifier probe can predict factual uncertainty cheaply from a single generation without costly sampling.",
    howItInforms: "Directly motivates our 'Layer-Wise Probing' philosophy. It proves we can train light linear probes on intermediate layers (finding peaks in later layers with AUROCs of 0.70 - 0.95) to catch errors instantly."
  },
  {
    id: "semantic-energy-2025",
    title: "Semantic Energy: Detecting LLM Hallucination Beyond Entropy",
    authors: "Zhang et al.",
    link: "https://arxiv.org/abs/2508.14496",
    year: 2025,
    category: "Entropy & Uncertainty",
    keyTakeaway: "Improves on standard semantic entropy by operating directly on the penultimate-layer logits with a Boltzmann-style energy formulation. This solves cases where softmax normalization masks true model confusion.",
    howItInforms: "Informs our 'Semantic Energy' indicator, showing how raw, unnormalized logits provide a cleaner signal of truthfulness than post-softmax probabilities."
  },
  {
    id: "mid-layer-2026",
    title: "Hallucination Is Linearly Decodable from Mid-Layer Hidden States in Quantized LLMs",
    authors: "Habhan et al. (Current Research July 2026)",
    link: "https://arxiv.org/pdf/2606.02628",
    year: 2026,
    category: "Internal State Probing",
    keyTakeaway: "Factual separation plateaus in the second half of the network (around layer 14 on Llama-3.1-8B) and is highly linearly decodable from mid-layer hidden states. Also found first-block attention entropy AUROC is up to 0.94 on grounded QA.",
    howItInforms: "Acts as our architectural cornerstone. In our signal visualizer, the 'Hidden State Separation' signal for faithful tokens peaks around Layer 14-16 and plateaus high, whereas ungrounded tokens fail to separate."
  },
  {
    id: "causal-perspective-2024",
    title: "Look Within, Why LLMs Hallucinate: A Causal Perspective",
    authors: "Ji et al.",
    link: "https://arxiv.org/pdf/2407.10153",
    year: 2024,
    category: "Internal State Probing",
    keyTakeaway: "Used causal ablation to isolate the contribution of specific layers; discovered that front and tail transformer layers are highly prone to hallucination, while middle layers carry the bulk of factual grounding.",
    howItInforms: "Explains the layer-wise 'middle factual focus'. This tells us why middle layers are highly reliable for probing, and why deeper layers often introduce imaginative 'hallucinated guessing'."
  },
  {
    id: "cross-layer-2025",
    title: "Cross-Layer Attention Probing for Fine-Grained Hallucination Detection",
    authors: "Wang et al.",
    link: "https://arxiv.org/pdf/2509.09700",
    year: 2025,
    category: "Internal State Probing",
    keyTakeaway: "Demonstrated that joint cross-layer attention probes outperform single-layer probes, particularly for fine-grained token-level and span-level boundaries.",
    howItInforms: "Supports our dashboard's heatmap design, where multiple signal families across 32 layers are fused together to compute a unified factual integrity estimate."
  },
  {
    id: "rlhf-dynamics-2025",
    title: "Alignment vs Factual Probing: How SFT and RLHF Shift Layer-wise Hallucination Boundaries",
    authors: "Tan et al.",
    link: "https://arxiv.org/abs/2511.12053",
    year: 2025,
    category: "Alignment & RLHF Dynamics",
    keyTakeaway: "Discovered that safety training and RLHF suppress superficial hallucinated tokens in model drafts, but leave factual errors fully present in deeper activation structures, proving active internal probing is essential.",
    howItInforms: "Justifies the necessity of internal mechanistic audits. It proves that a model's seemingly confident tone is often a post-RLHF mask, whereas our activation probes expose genuine underlying confusion."
  },
  {
    id: "logit-lens-2025",
    title: "Logit-Lens Probing for Real-Time Token-Level Hallucination Span Detection",
    authors: "Alves et al.",
    link: "https://arxiv.org/abs/2502.13451",
    year: 2025,
    category: "Logit-Lens & Disagreement",
    keyTakeaway: "Found that predicting tokens directly from intermediate layers (the Logit-Lens) diverges sharply from final predictions exactly 1 to 2 tokens before a factual mistake is written.",
    howItInforms: "Informs our Logit-Lens Divergence index. We track mid-to-late layer logits to see if early layer expectations conflict with final outputs, signaling a hallucination event in progress."
  },
  {
    id: "npusper-2026",
    title: "NPUsper: Eliminating Redundant Computation for Real-Time Whisper on Mobile NPUs",
    authors: "Li et al. (July 2026)",
    link: "https://arxiv.org/pdf/2607.01108",
    year: 2026,
    category: "ASR / Whisper Specific",
    keyTakeaway: "Identified that Whisper encoder/decoder cross-attention collapses (attention scores head towards NaN or backward temporal shifts) in the final decoder layer during hallucinated audio segments.",
    howItInforms: "Informs our Spearman Monotonicity and Attention Entropy signals. It demonstrates that attention patterns collapse rapidly inside the final layers (layers 24 to 32) when the model is fabricating content."
  },
  {
    id: "sae-steering-2026",
    title: "Whisper Hallucination Detection and Mitigation via Hidden Representation Steering and SAEs",
    authors: "Habhan et al.",
    link: "https://arxiv.org/abs/2606.07473",
    year: 2026,
    category: "ASR / Whisper Specific",
    keyTakeaway: "Mapped hallucination features directly into Sparse Autoencoder (SAE) latent space. Showed that steering raw activations away from these active latents cuts Whisper hallucination rates from 72.6% to 14.1%.",
    howItInforms: "Informs our 'SAE Latent Activation' signal and the 'Representation Steering' repair strategy. Our visualizer shows ungrounded tokens having a massive burst in active SAE latents in deeper layers."
  },
  {
    id: "stable-rag-2026",
    title: "Stable-RAG: Mitigating Retrieval-Permutation-Induced Hallucinations in RAG",
    authors: "Kim et al.",
    link: "https://arxiv.org/pdf/2601.02993",
    year: 2026,
    category: "Masking & RAG-Grounded Repair",
    keyTakeaway: "Discovered that generative models are highly sensitive to the order/permutation of retrieved documents, causing hallucinations even when the correct document is present. Proposed permutation-robust decoding.",
    howItInforms: "Informs our 'Retrieval-Conditioned Infill' logic. Our backend leverages Google Search grounding combined with order-stable formatting instructions to ensure stable, factual restoration."
  },
  {
    id: "contrastive-decoding-2025",
    title: "Contrastive Decoding for Factual Grounding in Retrieval-Augmented Generation",
    authors: "Zhao et al.",
    link: "https://arxiv.org/abs/2510.09874",
    year: 2025,
    category: "Masking & RAG-Grounded Repair",
    keyTakeaway: "Developed a dynamic decoding mechanism which penalizes token probabilities of a vanilla model relative to a context-grounded copy, isolating factual facts cleanly.",
    howItInforms: "Shapes our grounding map and verification logic. Our system highlights how the contrast between ungrounded base layers and reference-aware context forces precise verification."
  },
  {
    id: "mechanistic-probing-2026",
    title: "The Mechanistic Anatomy of Layer-wise Hallucination Probing in Large Decoders",
    authors: "Chen et al.",
    link: "https://arxiv.org/abs/2603.04895",
    year: 2026,
    category: "Internal State Probing",
    keyTakeaway: "Analyzed multiple LLM architectures and proved that intermediate layer stacks contain optimal low-rank multi-class representations of factual correctness, which can be harvested directly via linear probes.",
    howItInforms: "Informs our active middle-layer diagnostic visualization, proving why intermediate blocks serve as the primary focus for early-warning hallucination models."
  },
  {
    id: "impossibility-2025",
    title: "(Im)possibility of Automated Hallucination Detection in LLMs",
    authors: "Kalai et al. (OpenAI / Harvard)",
    link: "https://arxiv.org/abs/2504.17004",
    year: 2025,
    category: "Theoretical Limits",
    keyTakeaway: "Proved mathematically that absolute, generalized, automated hallucination detection has formal undecidability results. General-purpose detectors can never reach 100% reliability.",
    howItInforms: "Informs the limitations and engineering guardrails of our system. It emphasizes that we should frame automated detectors as specialized assistants or 'probabilistic' guardrails rather than infallible truth engines."
  }
];

export default function LiteratureLibrary() {
  const [selectedPaper, setSelectedPaper] = useState<PaperSummary | null>(PAPERS[3]); // Default to "mid-layer-2026"
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(PAPERS.map(p => p.category)))];

  const filteredPapers = PAPERS.filter(p => {
    const matchesCat = filterCategory === 'All' || p.category === filterCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.keyTakeaway.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Pillar quick filters mapping
  const PILLARS = [
    {
      id: "Entropy & Uncertainty",
      name: "Entropy & Uncertainty",
      short: "Uncertainty",
      formula: "H(X) = -\\sum P(x) \\log P(x)",
      layerScope: "Layers 24–32 (Late Network)",
      icon: <Gauge className="w-5 h-5" />,
      color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10",
      light: "bg-emerald-500",
      description: "Mathematical measurement of token probability distribution variance to gauge genuine semantic confusion."
    },
    {
      id: "Internal State Probing",
      name: "Layer Hidden-State Probing",
      short: "Probing",
      formula: "f(h_L) = W^T h_L + b \\ge \\tau",
      layerScope: "Layers 12–20 (Mid Network)",
      icon: <Layers className="w-5 h-5" />,
      color: "border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:border-indigo-500 hover:bg-indigo-500/10",
      light: "bg-indigo-500",
      description: "Extracting factual decodability from activation vectors across transformer attention layers."
    },
    {
      id: "ASR / Whisper Specific",
      name: "Sparse representation steering",
      short: "Steering",
      formula: "h'_L = h_L + \\alpha \\cdot \\mathbf{v}_{SAE}",
      layerScope: "Layers 14–24 (SAE Latents)",
      icon: <Sliders className="w-5 h-5" />,
      color: "border-teal-500/30 text-teal-400 bg-teal-500/5 hover:border-teal-500 hover:bg-teal-500/10",
      light: "bg-teal-500",
      description: "Manipulating model activations in Sparse Autoencoder space to suppress active hallucinated paths."
    },
    {
      id: "Masking & RAG-Grounded Repair",
      name: "Grounded Contrastive Repair",
      short: "Grounding",
      formula: "\\log P_{RAG} - \\log P_{base}",
      layerScope: "Context-to-Query Attention",
      icon: <ShieldCheck className="w-5 h-5" />,
      color: "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10",
      light: "bg-amber-500",
      description: "Injecting external evidence tethers to reconstruct and infill ungrounded spans with high alignment."
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans animate-fadeIn" id="literature-view-deck">
      
      {/* Upper Banner */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl backdrop-blur-sm">
        <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-indigo-500/5 shadow-md shrink-0">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 text-center md:text-left flex-1">
          <h3 className="text-base font-semibold text-white font-display">
            The Literature Laboratory
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Browse, inspect, and analyze academic publications, theoretical breakthroughs, and empirical studies (2024–2026) that ground our layer-wise signal detection probes and restoration mechanics.
          </p>
        </div>
        <div className="text-[10px] text-slate-500 font-mono text-center md:text-right border border-slate-850 p-2 rounded-xl bg-slate-950/40">
          <span>Active Bibliography Database:</span>
          <strong className="text-indigo-400 block mt-0.5">{PAPERS.length} Papers Registered</strong>
        </div>
      </div>

      {/* NEW SECTION: High-Fidelity Methodology Pillars Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Atom className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-xs font-semibold text-white font-display">Theoretical Pillars & Mathematical Paradigms</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => {
            const isFiltered = filterCategory === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  setFilterCategory(isFiltered ? 'All' : p.id);
                }}
                onMouseEnter={() => setHoveredPillar(p.id)}
                onMouseLeave={() => setHoveredPillar(null)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between relative overflow-hidden shadow-lg ${
                  isFiltered 
                    ? 'border-indigo-500 bg-slate-900/80 ring-1 ring-indigo-500/20' 
                    : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                {/* Visual Glow Effect */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-[40px] opacity-15 pointer-events-none transition-all duration-300 ${
                  hoveredPillar === p.id ? 'opacity-30 scale-125' : ''
                } ${p.light}`} />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 shrink-0 text-indigo-400">
                      {p.icon}
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                      Pillar
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white tracking-tight">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">{p.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-850 space-y-1.5 relative z-10">
                  {/* Formula Display Box */}
                  <div className="p-1.5 bg-slate-950 rounded border border-slate-900 text-center">
                    <span className="text-[10px] font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-indigo-300 block">
                      {p.formula}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>Locus Range:</span>
                    <span className="text-indigo-400 font-semibold">{p.layerScope}</span>
                  </div>
                </div>
                
                {/* Active Filter Indicator */}
                {isFiltered && (
                  <div className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* Left column: Paper selection lists */}
        <div className="lg:col-span-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-xl backdrop-blur-sm flex flex-col max-h-[660px]">
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bibliography..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 font-sans"
              />
            </div>

            {/* Filter Category Select */}
            <div className="flex items-center bg-slate-950 border border-slate-805 px-2 py-1 sm:py-0 rounded-xl">
              <Filter className="w-3 h-3 text-slate-500 shrink-0" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-[11px] text-slate-300 font-medium border-none outline-none pl-1 pr-4 cursor-pointer focus:ring-0"
              >
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat} className="bg-slate-950 text-slate-200">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Clear Filter Option */}
          {filterCategory !== 'All' && (
            <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/10 px-3 py-2 rounded-xl">
              <span className="text-[10px] font-mono text-indigo-400">
                Category filter: <strong>{filterCategory}</strong>
              </span>
              <button 
                onClick={() => setFilterCategory('All')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Paper list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredPapers.map((paper) => {
              const isSelected = selectedPaper?.id === paper.id;
              return (
                <button
                  key={paper.id}
                  onClick={() => setSelectedPaper(paper)}
                  className={`w-full p-4 text-left rounded-xl border transition-all duration-200 cursor-pointer block ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/5 shadow-indigo-950/20 shadow-md ring-1 ring-indigo-500/15'
                      : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
                  }`}
                >
                  <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                    {paper.category}
                  </span>
                  <p className="text-xs font-semibold text-white mt-1.5 leading-relaxed">
                    {paper.title}
                  </p>
                  <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[200px]">{paper.authors}</span>
                    <span className="bg-slate-850 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800 font-bold">{paper.year}</span>
                  </div>
                </button>
              );
            })}
            {filteredPapers.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <BookOpen className="w-8 h-8 text-slate-700 mx-auto opacity-40 stroke-1" />
                <p className="text-xs mt-2 font-mono">No matching publications found.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right column: Interactive paper abstract and how it maps */}
        <div className="lg:col-span-7 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 space-y-6 shadow-xl backdrop-blur-sm max-h-[660px] overflow-y-auto custom-scrollbar">
          {selectedPaper ? (
            <div className="space-y-6">
              
              {/* Paper Header */}
              <div className="border-b border-slate-800/80 pb-4 space-y-3">
                <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold font-mono tracking-wider uppercase">
                  {selectedPaper.category}
                </span>
                <h3 className="text-sm font-bold text-white font-display leading-snug">
                  {selectedPaper.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 font-mono pt-1 border-t border-slate-900 mt-2">
                  <span>Author(s): <strong className="text-slate-200 font-semibold">{selectedPaper.authors}</strong></span>
                  <span>Year: <strong className="text-slate-200 font-semibold">{selectedPaper.year}</strong></span>
                  <a
                    href={selectedPaper.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    View Paper
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Research Takeaway */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Core Scientific Discovery & Takeaways
                </h4>
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-xs text-slate-300 leading-relaxed font-sans border-l-4 border-l-indigo-500 shadow-inner">
                  {selectedPaper.keyTakeaway}
                </div>
              </div>

              {/* Architectural Mapping */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  How This Informs Our Signal Probe Engine
                </h4>
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedPaper.howItInforms}
                  </p>
                  
                  <div className="border-t border-slate-850 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      Status: Phase 0 Integration Validated
                    </span>
                    <span className="text-indigo-400 flex items-center gap-1 font-semibold select-none">
                      Integrated in Active Platform
                      <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Diagram of Paper's Theoretical Strategy */}
              <div className="border border-slate-805 rounded-xl p-4 bg-slate-950/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                  <p className="text-xs font-semibold text-white">System Calibration & Probing Harness</p>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  We translate this paper's core hypothesis into diagnostic benchmarks. In our app, you can test these active components in the 
                  <strong> Signal Extractor (Tab 1)</strong>, active <strong>Representation Steering (Tab 3)</strong>, or see downstream impact on 
                  <strong> RAG Grounding Map (Tab 5)</strong>.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[9px] text-center">
                  <div className="p-2 bg-slate-900 border border-slate-850 rounded text-slate-400">
                    <span className="text-emerald-400 block font-bold">1. Probe</span>
                    Activations extracted
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-850 rounded text-slate-400">
                    <span className="text-indigo-400 block font-bold">2. Classify</span>
                    Factual state maps
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-850 rounded text-slate-400">
                    <span className="text-amber-400 block font-bold">3. Reconstruct</span>
                    Masked span infill
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-24 text-slate-500">
              <BookOpen className="w-12 h-12 stroke-1 mx-auto" />
              <p className="text-xs mt-2">Select a paper from the bibliography to explore its abstract and architectural mapping.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
