export interface TokenSignal {
  index: number;
  text: string;
  isHallucinated: boolean;
  score: number; // overall hallucination confidence score 0 to 1
  
  // Layer-wise values (array of 32 numbers, one per layer)
  attentionEntropy: number[];
  hiddenStateSeparation: number[];
  logitLensDivergence: number[];
  semanticEntropy: number[];
  monotonicity: number[];
  saeLatentSparsity: number[];
}

export type SignalType = 
  | 'attention_entropy'
  | 'hidden_state_separation'
  | 'logit_lens_divergence'
  | 'semantic_entropy'
  | 'monotonicity'
  | 'sae_latent_sparsity';

export interface SignalMeta {
  id: SignalType;
  name: string;
  description: string;
  sourcePaper: string;
  layerLocus: string;
  normalRange: string;
  anomalyDirection: string;
}

export interface PaperSummary {
  id: string;
  title: string;
  authors: string;
  link: string;
  year: number;
  category: string;
  keyTakeaway: string;
  howItInforms: string;
}

export interface CorrectionResult {
  originalText: string;
  maskedText: string;
  correctedText: string;
  detectedSpansCount: number;
  correctedSpansCount: number;
  originalRiskScore: number;
  correctedRiskScore: number;
  appliedStrategy: string;
  corrections: { original: string; corrected: string; reason: string }[];
}
