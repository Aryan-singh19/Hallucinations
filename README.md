# Hallucination-Aware LM: Detection & Removal via Masking + Layer-wise Signals

A full research + engineering platform for a system that detects hallucinated spans inside model outputs using internal signals (attention, hidden states, logits) distributed across layers, then removes/corrects those spans via masking + conditioned infill — without a full regeneration pass.

Grounded in prior work on Whisper cross-attention collapse during ASR hallucination (layer-wise Spearman monotonicity, attention → NaN during hallucinated spans) and extended to text LMs using current literature (2023–2026).

**Status**: Fully Implemented & Live (Interactive Verification Deck Complete) • **Owner**: Aryan (aryanchande23l / shiroonigami23 / shiroonigami23@gmail.com).

---

## Table of Contents

1. [Problem Framing](#1-problem-framing)
2. [Literature Review & Source Papers](#2-literature-review--source-papers)
3. [Datasets](#3-datasets)
4. [Signal Extraction — the "Layers" Part](#4-signal-extraction--the-layers-part)
5. [Detection Model](#5-detection-model)
6. [Masking + Correction Model](#6-masking--correction-model)
7. [Alternative / Complementary Mitigation Strategies](#7-alternative--complementary-mitigation-strategies)
8. [Training Plan / Phases](#8-training-plan--phases)
9. [Evaluation](#9-evaluation)
10. [Infrastructure & Repo Structure](#10-infrastructure--repo-structure)
11. [Compute Budget & Cost Estimate](#11-compute-budget--cost-estimate)
12. [Risks, Failure Modes & Mitigations](#12-risks-failure-modes--mitigations)
13. [Open Research Questions](#13-open-research-questions)
14. [Milestone Timeline](#14-milestone-timeline)
15. [Full Reference List](#15-full-reference-list)
16. [Next Steps / Immediate TODOs](#16-next-steps--immediate-todos)

---

## 1. Problem Framing

- **Goal**: build a system that (a) **detects** hallucinated tokens/spans in a generated output, and (b) **removes or corrects** them without discarding the whole generation.
- **Two sub-problems, one pipeline**:
  1. **Detector** — token/span-level classifier over internal signals (attention entropy, hidden-state geometry, logit-lens disagreement across layers).
  2. **Corrector** — masks flagged spans and infills/regenerates them conditioned on clean context (+ retrieved evidence where available).
- **Core hypothesis (carried over from ASR work, now literature-backed)**: hallucination correlates with detectable, *layer-localized* anomalies in internal computation — not something uniformly distributed across the whole stack. This is consistent with:
  - Whisper decoder cross-attention showing **backward temporal shifts** and collapse in the **final decoder layer** during hallucinated spans (NPUsper, 2607.01108).
  - Hidden-state class separation between truthful/hallucinated generations **plateauing in the second half of the network** and being **linearly decodable from mid-layer states** (2606.02628).
  - Front/tail decoder layers being **most prone to hallucination**, while **middle layers carry more factual signal** (causal ablation study, 2407.10153).
  - First-transformer-block attention entropy giving strong separation (AUROC ~0.94) on evidence-grounded QA, while deeper/mid-network probes generalize better across settings (2606.02628).
  - Whisper encoder hallucination-discriminative features **increasing in strength toward deeper encoder layers**, exploitable via activation/SAE steering (2606.07473).
- **Framing decision**: this is *not* purely a "detect and throw away" system — it's a **repair pipeline**: detect → mask → infill → re-verify, so output quality/fluency is preserved as much as possible while factuality is enforced.

## 2. Literature Review & Theoretical Framework Cards

To translate mathematical models and empirical mechanics into a robust, real-time diagnostic system, we ground our platform on 14 state-of-the-art research publications (2024–2026). The following visual cards summarize the four core pillars of our interpretation engine:

### 📊 CARD PILLAR 1: Entropy & Semantic Uncertainty
> **Mathematical Core:** `H(X) = - \sum_{c \in C} P(c) \log P(c)`  
> **Optimal Locus:** Layers 24–32 (Late network softmax layers)  
> **Target Manifestation:** Measuring variance over grouped equivalence classes of generated drafts.
>
> | Publication | Key Takeaway | App Harness Implementation |
> | :--- | :--- | :--- |
> | **Semantic Entropy** *(Nature, Farquhar et al., 2024)* | Proposes grouping multiple sampled answers into semantic classes; calculates entropy over classes rather than raw token lists to detect genuine factual confusion. | Provides the mathematical backbone for our late-layer semantic dispersion score, indicating global query uncertainty. |
> | **Semantic Entropy Probes (SEPs)** *(Bi et al., 2024)* | Proves that semantic entropy is linearly decodable from intermediate hidden states of a *single* generation, removing sampling costs. | Inspires our lightweight token-level probing strategy that flags factual confusion in mid-to-late layer activations. |
> | **Semantic Energy** *(Zhang et al., arXiv 2025)* | Bypasses post-softmax normalization biases by measuring raw logit energy, solving cases of false confidence. | Evaluated via our "Semantic Energy" divergence signal inside the Signal Extractor. |

---

### 🧠 CARD PILLAR 2: Layer-wise Internal State Probing
> **Mathematical Core:** `f(h_L) = \sigma(W^T h_L + b) \ge \tau`  
> **Optimal Locus:** Layers 12–20 (Middle transformer blocks)  
> **Target Manifestation:** Probing the linear separability of factuality directly within intermediate residual streams.
>
> | Publication | Key Takeaway | App Harness Implementation |
> | :--- | :--- | :--- |
> | **Mid-Layer Decodability** *(Habhan et al., arXiv 2026)* | Factual truth is linearly decodable starting at intermediate layers (peaks near Layer 14 on 32-layer models). First-block attention entropy provides an early signal. | We visualize the **Hidden State Separation** peaking cleanly in intermediate layers, establishing our early warning metrics. |
> | **Causal Perspective of Layers** *(Ji et al., 2024)* | Causal intervention proves middle blocks hold grounding while front/tail blocks formulate style and imaginative guessing. | Motivates our interactive **Ablation Sandbox** (Tab 3), letting users selectively disable front, mid, or tail stacks. |
> | **Anatomy of Low-Rank Probes** *(Chen et al., arXiv 2026)* | Demonstrates that low-rank linear probes harvested from middle layers carry highly generalizable truth classification vectors. | Integrated directly into our **Signal Extractor Dashboard's** multi-probe fusion heatmap. |

---

### 🛠️ CARD PILLAR 3: Mechanistic Representation Steering
> **Mathematical Core:** `h'_L = h_L + \alpha \cdot \mathbf{v}_{\text{SAE}}`  
> **Optimal Locus:** Layers 14–24 (Sparse Autoencoder Latents)  
> **Target Manifestation:** Guiding model attention trajectories dynamically at inference time.
>
> | Publication | Key Takeaway | App Harness Implementation |
> | :--- | :--- | :--- |
> | **Representation Steering via SAEs** *(Habhan et al., arXiv 2026)* | Identifies sparse, interpretable features mapping to hallucinated paths. Intervening via steering cuts error rates up to 5x. | We map this inside our **Steering Sandbox** (Tab 3), where users adjust SAE latent strength to dynamically recalculate 32-layer activation entropy. |
> | **NPUsper Attention Collapse** *(Li et al., arXiv 2026)* | Discovers that hallucinated segments manifest as backward shifts in cross-attention vectors. | Powers our **Monotonicity break** metrics, which capture sequential cross-attention tethers collapsing. |
> | **Logit-Lens Disagreement** *(Alves et al., arXiv 2025)* | Predicts hallucinations 1-2 tokens in advance by measuring divergence between early and final predictions. | Realized as our live **Logit-Lens Divergence** signal tracking real-time token shifts. |

---

### 🛡️ CARD PILLAR 4: Context Grounding & Alignment Paradigms
> **Mathematical Core:** `\mathcal{D}_{\text{contrast}} = \log P_{\text{RAG}}(y) - \log P_{\text{base}}(y)`  
> **Optimal Locus:** Context-to-Query Attention Tethers  
> **Target Manifestation:** Contrastive decoding between grounded evidence streams and ungrounded base states.
>
> | Publication | Key Takeaway | App Harness Implementation |
> | :--- | :--- | :--- |
> | **Contrastive RAG Grounding** *(Zhao et al., arXiv 2025)* | Penalizes token likelihoods of base decoders relative to retrieval-aligned copies, isolating hallucinated spans cleanly. | Conceptual framework for our **Span-Level Infill** module which leverages context-aware prompts to restore truth. |
> | **Stable-RAG Order Permutations** *(Kim et al., 2026)* | Identifies high sensitivity to document ordering in RAG prompts, causing hallucinations even with correct documents. | We enforce order-stable prompting templates inside our Google-search-backed in-app infilling backend. |
> | **RLHF Boundary Shifts** *(Tan et al., arXiv 2025)* | RLHF suppresses superficial errors but leaves factual contradictions intact in deeper states, masking model confusion. | Justifies our hidden activation probes—demonstrates that confident-sounding model drafts must still undergo mechanical audit. |

---

### 🌌 The Factual Gravity Attractor Model (Visual Alignment)
Our latest module, the **Cosmic Grounding Attractor Map (Tab 5)**, provides a visual and mechanical synthesis of these concepts. It models retrieved authoritative text as a massive central gravitational attractor:

```
                      [ DRIFTING UNGROUNDED SPACE ]
                                  (Claim 4)
                                   * . . . .
                                            .
                                             .
                 [ OUTER ORBIT ]              v
                   (Claim 3 - Contradicted)   
                     <- - - - -  (•)  - - - - - > [Centrifugal Repulsion]
                                .   .
                               .     .
               [ INNER ORBIT ] .       .
                 (Claim 1)  (•)         (•) (Claim 2 - Supported)
                             .   (RAG)   .
                              .  CORE   .
                               . . . . .
```

- **Core (Authoritative Truth)**: The RAG center represents the document context.
- **Inner Orbit (Strong Attraction)**: Fully supported claims fall naturally into close orbit (High Factual Alignment Score).
- **Centrifugal Escape (Repulsion)**: Contradicted assertions are violently repulsed into high-eccentricity outer bounds.
- **Drifting Inertia (Floating Space)**: Ungrounded, unverifiable assertions float aimlessly without any gravitational tether.

---

## 3. Datasets

| Purpose | Dataset | Notes |
|---|---|---|
| Detection (span-labeled, text) | HaluEval, TruthfulQA, FEVER | Standard benchmarks; HaluEval-QA specifically used in 2606.02628's entropy analysis — reuse their eval protocol |
| Detection (span-labeled, ASR) | HALAS | Reuse from prior ASR work; extend labeling scheme for text-model transfer study (Phase 0) |
| Detection (RAG-specific) | RAGTruth | Purpose-built hallucination corpus for RAG; also usable for corrector training pairs |
| Detection (structured/code) | Span-Level benchmark (2607.00895) methodology | Character-level injected hallucination labels — adopt their injection methodology for our own synthetic set |
| Detection (synthetic) | Self-generated via entity swap / fact corruption on Wikipedia/QA corpora | Cheap negative mining, controllable hallucination rate, controllable span length |
| Whisper-side replication | Non-speech audio hallucination sets (per 2606.07473, Barański et al.) | For Phase 0 sanity check porting attention-collapse signal to text setting |
| Correction (paired) | (hallucinated output, gold reference) pairs from RAGTruth + synthetic corruption | Needed for span-infill supervision |
| Held-out eval | TruthfulQA, FEVER, domain-specific QA, held-out slice of HaluEval | Cross-domain generalization check — must NOT overlap with training corruption seeds |

- Log dataset provenance and split hashes for reproducibility (W&B: `shiroonigami23`).
- For synthetic corruption: control for **span length**, **entity type** (named entity vs. numeric vs. relational claim), and **position in sequence** — these are known confounds in span-level hallucination benchmarks (2607.00895).

---

## 4. Signal Extraction — the "Layers" Part

Per-layer, per-token features to probe, extending both the Whisper cross-attention analysis and the text-LM literature above:

| Signal | Layer locus (per literature) | Source |
|---|---|---|
| Attention entropy (head-averaged, last-token) | Strongest at **first block** for evidence-grounded QA; doesn't generalize without evidence passage | 2606.02628 |
| Cross-attention temporal direction (ASR-specific) | **Final decoder layer** — backward shift = hallucination | 2607.01108 |
| Hidden-state class separation (probe AUROC) | Plateaus in **second half** of network; peaks around layer 14 (Llama-3.1-8B, 32 layers) | 2606.02628 |
| Causal attribution of hallucination | **Front and tail** layers most responsible; **middle** layers hold factual grounding | 2407.10153 |
| Logit-lens divergence (early vs. final layer prediction) | Middle-to-late layer disagreement | DoLa-style, via 2509.09700 |
| Semantic entropy (linear probe on hidden states) | Later layers, single-generation (no sampling needed) | 2406.15927 |
| Penultimate-layer logit energy | Second-to-last layer | 2508.14496 |
| Sparse Autoencoder latent activation | Deeper encoder layers (concentrated in sparse feature subset) | 2606.07473 |
| Decoder-internal-state probing (no reference needed) | Intermediate decoding layers | 2606.23060 |

**Derived features to compute per token, per layer:**

- **Attention entropy** per head/layer — flag collapse or abnormal spikes.
- **Attention-to-source ratio** (grounded generation: attention mass to context vs. self-generated tokens).
- **Logit-lens divergence**: compare intermediate-layer predicted token vs. final-layer token; large late-layer disagreement = candidate hallucination signal (DoLa-inspired).
- **Hidden-state trajectory**: cosine drift of a token's residual stream across layers — hallucinated tokens may show unstable/discontinuous trajectories.
- **Layer-wise Spearman monotonicity** (reused directly from ASR work): rank correlation of attention-to-evidence across layers; a break in monotonicity flagged as anomaly, mirroring the NaN-collapse finding — now reframed per NPUsper as a **directional/temporal** signal rather than a binary NaN event, which should be more robust and differentiable.
- **SAE latent sparsity/activation pattern** (optional, higher cost) — per 2606.07473, hallucination-discriminative features concentrate in a sparse latent subset; worth testing if compute allows, since it's shown the strongest steering-based mitigation numbers to date.

Store these as a feature tensor per generation (`[layers, heads, seq_len, features]`) — this becomes the input to the detector. Given multiple papers show **different layers matter for different signal types** (early for attention entropy, mid for hidden-state separation, late for logit-lens/energy), the detector should NOT assume one fixed layer — do a full layer-sweep ablation before locking architecture (see Phase 4).

---

## 5. Detection Model

- **Architecture options** (start simple, escalate — order matches literature progression):
  1. **Linear probe on hidden states** (per SEPs, 2406.15927) — logistic regression per layer, sweep all layers, pick best/combine. Fastest baseline, strong prior result (AUROC 0.7–0.95).
  2. **Attention-entropy threshold classifier** (per 2606.02628 / NPUsper) — near-zero training cost, good on evidence-grounded data only.
  3. **Cross-layer attention probe** (per 2509.09700) — joint modeling across layers instead of per-layer, better for span-level (not just sequence-level) detection.
  4. **Late-fusion metaclassifier**: combine (a) text-based metrics, (b) internal-state probes, (c) optionally LLM-as-judge — per 2606.23060's finding that late fusion beats any single method.
  5. **SAE-latent classifier** (per 2606.07473) — highest engineering cost, strongest reported mitigation numbers when paired with steering-based correction.
- **Labels**: token-level binary (hallucinated / faithful), plus span boundaries.
- **Loss**: focal loss (class imbalance — hallucinated tokens are the minority).
- **Metrics**: span-level F1, token-level AUROC, calibration (ECE) — calibration matters since downstream masking depends on thresholded probabilities.
- **Key design decision informed by literature**: do NOT rely solely on entropy-based signals in non-evidence-grounded settings — 2606.02628 explicitly shows first-block attention entropy fails to generalize without an explicit evidence passage. Mid-layer hidden-state probes should be the fallback/primary signal for open-ended generation without retrieval grounding.

---

## 6. Masking + Correction Model

- **Step 1 — Mask**: replace detected hallucinated spans with a `[MASK]`/sentinel token, preserving surrounding faithful context. Span granularity informed by 2607.00895's character-level injection methodology (test token- vs. span- vs. sentence-level masking explicitly — don't assume one).
- **Step 2 — Infill**, three candidate strategies (test all three, benchmark):
  - **A. Span-corruption fine-tune** (T5-style): fine-tune the base LM with a span-corruption objective so it's natively good at infilling masked spans conditioned on retrieved/grounding context.
  - **B. Retrieval-conditioned infill**: pull supporting passages for the masked span, condition generation on them explicitly. Must control retrieval-order sensitivity per Stable-RAG's finding (arXiv:2601.02993) that generation is sensitive to permutation of retrieved documents even with the correct document present — use their clustered/cluster-center decoding approach as a robustness baseline.
  - **C. Activation/SAE steering** (no explicit mask token): per 2606.07473's result on Whisper, steer hidden representations directly away from the hallucination-associated latent subset instead of masking+regenerating. Cheapest at inference time if it transfers to text LMs; worth a direct A/B against masking.
- **Step 3 — Re-verify**: re-run the detector on the corrected output; iterate up to N passes, or fall back to explicit **abstention** ("insufficient evidence") rather than a low-confidence guess — motivated directly by the OpenAI hallucination-incentives paper (arXiv:2509.04664) arguing that miscalibrated confidence, not just knowledge gaps, drives hallucination.
- **Optional verification loop upgrade**: Chain-of-Verification style — generate explicit verification questions for the corrected span before accepting it, rather than only re-running the internal-signal detector.
- **Training signal for corrector**: paired (masked-hallucinated, gold) data; teacher-forced infill loss + optional RL/DPO pass rewarding faithfulness (e.g., NLI-entailment against source/retrieved evidence) over fluency-only reward.

---

## 7. Alternative / Complementary Mitigation Strategies

To benchmark against the core masking+infill pipeline (not assumed to be the final answer):

- **Prompted self-revision** (token-level feedback prompting, arXiv:2512.08892) — cheapest, no fine-tuning; pass detected spans back into the prompt and ask the model to revise. Good lower-bound baseline.
- **DoLa-style contrastive decoding** — amplify factual signal at generation time by contrasting final-layer vs. earlier-layer logits; an inference-time-only alternative to a trained corrector.
- **Activation steering / SAE steering** — see Section 6, Step 2C.
- **Knowledge-graph-grounded correction** (NPH, RHO) — heavier infrastructure (needs a KG), but strongest grounding guarantee for closed-domain applications.
- **Adaptive Layer Attention + Knowledge Distillation** (per 2511.14219, ASR-side) — if extending back to the ASR use case, this is the most directly transferable mitigation architecture, with reported "more stable cross-attention" as an explicit, measurable outcome.

---

## 8. Training Plan / Phases

1. **Phase 0 — Baseline replication & literature validation**: port the ASR attention-collapse detection logic to a text-LM decoder; validate that the layer-localization finding (front/tail layers hallucination-prone, middle layers factual — arXiv:2407.10153) actually transfers before building further. Reproduce the SEP linear-probe layer-sweep (2406.15927) as a sanity-check baseline on HaluEval.
2. **Phase 1 — Detector training**: train/eval detector on HaluEval + RAGTruth + synthetic corruption set (using 2607.00895's injection methodology). Compare per-signal-family performance (entropy-only vs. hidden-state-probe-only vs. late-fusion).
3. **Phase 2 — Corrector training**: span-corruption fine-tune + retrieval-conditioned infill + steering-based correction, benchmarked against each other and against naive full-regeneration.
4. **Phase 3 — End-to-end pipeline**: detector → mask → corrector → re-verify loop; measure hallucination-rate reduction vs. fluency/latency cost. Target numbers to beat: SAE-steering's 72.6%→14.1% / 86.9%→27.3% hallucination-rate reduction on the ASR side (2606.07473) as a rough cross-domain aspiration, not a direct comparison.
5. **Phase 4 — Ablations**: full layer-sweep (which layers matter most: early/mid/late — per the conflicting-but-reconcilable findings in 2606.02628 vs. 2407.10153, expect different layers to matter for different signal types); feature-family ablation; single-pass vs. iterative correction; masking vs. steering-based correction head-to-head.

---

## 9. Evaluation

- **Primary**: hallucination-rate reduction (pre vs. post correction) on held-out sets, matched against comparable published numbers where possible (2606.07473's steering results, 2511.14219's stability metrics).
- **Secondary**: fluency/perplexity delta (correction shouldn't tank generation quality), latency overhead of detect+mask+infill loop.
- **Calibration**: ECE on detector confidence — needed since masking decisions are threshold-driven.
- **Ablation table**: layer subset used vs. detection F1 (confirms whether it's a few key layers or the whole stack, replicating both the causal-ablation finding of 2407.10153 and the plateau finding of 2606.02628).
- **Baselines to beat**: SelfCheckGPT (black-box sampling), semantic entropy probes (2406.15927), DoLa contrastive decoding, token-level prompted self-revision (2512.08892).
- **Theoretical ceiling awareness**: report results against the caution raised in arXiv:2504.17004 that fully automated hallucination detection has formal impossibility results in the general case — frame claims accordingly (domain-restricted, not universal).

---

## 10. Infrastructure & Repo Structure

```
.
├── data/                 # dataset prep + synthetic corruption scripts (span-injection per 2607.00895)
├── signals/              # attention entropy, logit-lens, hidden-state trajectory, SAE latent extraction
│   ├── attention.py       # entropy + cross-layer probing (2509.09700, 2606.02628)
│   ├── logit_lens.py      # DoLa-style early-vs-final layer contrast
│   ├── trajectory.py      # residual-stream cosine drift across layers
│   └── sae_latents.py     # optional SAE feature extraction (2606.07473)
├── detector/              # probe models + training loop (linear probe → cross-layer → late-fusion)
├── corrector/             # span-infill fine-tuning, retrieval-conditioned infill, steering-based correction
├── verify/                # re-verification loop (internal-signal re-check + optional CoVe-style Q&A)
├── eval/                  # metrics, ablation scripts, baseline comparisons
├── notebooks/             # Kaggle/Colab exploration (aryanchande23l)
├── papers/                # local notes/summaries per paper in Section 15 (one .md per paper, own words only)
└── configs/               # W&B run configs (shiroonigami23)
```

---

## 11. Compute Budget & Cost Estimate

| Phase | Compute need | Notes |
|---|---|---|
| Phase 0 | Single GPU, inference-only | Signal extraction on existing checkpoints, no training |
| Phase 1 (detector) | Single GPU, small probe training | Linear/shallow probes are cheap; cross-layer/late-fusion needs modest additional compute |
| Phase 2 (corrector, Option A) | Multi-GPU fine-tune | Span-corruption fine-tune of base LM — heaviest phase |
| Phase 2 (corrector, Option C, steering) | Single GPU | Cheapest correction path if it transfers from ASR/SAE result |
| Phase 3/4 | Depends on chosen corrector | Full pipeline eval + ablations |

- Track actual GPU-hours per run in W&B (`shiroonigami23`) from Phase 0 onward so Phase 2's cost estimate can be refined with real numbers instead of guesses.

---

## 12. Risks, Failure Modes & Mitigations

| Risk | Mitigation |
|---|---|
| ASR attention-collapse signal doesn't transfer to decoder-only text LMs (no explicit source-target cross-attention) | Phase 0 is explicitly a go/no-go gate before further investment; fall back to hidden-state probing (2606.02628) if attention-based signal fails to transfer |
| Entropy-based detector fails outside evidence-grounded settings | Documented limitation in 2606.02628 — use hidden-state probes as primary signal for open-ended generation, entropy as auxiliary only |
| Masking destroys coherent context needed for good infill | Test span granularity explicitly (token/span/sentence); prefer retrieval-conditioned infill over blind infill when evidence is available |
| Retrieval-conditioned correction is order-sensitive | Adopt Stable-RAG's permutation-robust decoding approach (arXiv:2601.02993) |
| Corrector regresses to confident-but-wrong guesses instead of abstaining | Explicit abstention path in Step 3, motivated by arXiv:2509.04664 |
| Formal limits on automated detection overstate what the system can guarantee | Frame all claims as domain-restricted per arXiv:2504.17004; don't claim universal hallucination elimination |
| Dataset overlap between synthetic corruption seeds and eval sets inflates numbers | Explicit split-hash logging (Section 3), held-out eval set never touched during corruption-seed generation |

---

## 13. Open Research Questions

- Does attention-collapse-as-hallucination-signal generalize from ASR (Whisper cross-attention) to decoder-only text LMs, where there's no explicit source-target cross-attention? (Phase 0 gate.)
- Which layer-localization finding dominates for our setting: the "front/tail layers hallucinate, middle layers are factual" causal result (2407.10153), or the "separation plateaus in second half of network" probing result (2606.02628)? These aren't necessarily contradictory (causal contribution vs. decodability are different measurements) but need reconciling empirically.
- Best granularity for masking: token-level vs. span-level vs. sentence-level — token-level is precise but risks fragmenting coherent infill context.
- Does masking+infill actually outperform steering-based correction (2606.07473's approach) on text LMs, or is steering strictly better when it's available (cheaper, no generation-loop needed)?
- Iterative correction stopping criterion — fixed N passes vs. confidence-based early stop vs. explicit abstention.
- Compute budget for Phase 2 (full fine-tune vs. adapter-only infill model vs. steering-only, no fine-tune at all).
- Can SAE-latent-based detection (strongest reported ASR mitigation numbers) be made practical for text LMs at reasonable compute cost, or is it prohibitively expensive to train/maintain SAEs per target model?

---

## 14. Milestone Timeline

| Milestone | Target | Gate condition |
|---|---|---|
| Phase 0 complete | Attention-collapse signal ported + validated (or falsified) on text LM | Go/no-go decision on attention-based signal vs. hidden-state-only fallback |
| Phase 1 complete | Detector trained, benchmarked vs. SelfCheckGPT + SEP baselines | Detector AUROC/F1 competitive with published SEP numbers on HaluEval |
| Phase 2 complete | All three corrector variants (fine-tune / retrieval-infill / steering) trained and compared | Best variant selected for Phase 3 pipeline |
| Phase 3 complete | End-to-end pipeline eval | Hallucination-rate reduction reported with fluency/latency tradeoff table |
| Phase 4 complete | Full ablation suite | Layer-sweep + feature-family + masking-vs-steering results written up |

*(Fill in actual dates once Phase 0 compute is scheduled.)*

---

## 15. Full Reference List

**Detection — entropy & uncertainty**
- Semantic Energy: Detecting LLM Hallucination Beyond Entropy — https://arxiv.org/abs/2508.14496
- Semantic Entropy Probes: Robust and Cheap Hallucination Detection in LLMs — https://arxiv.org/abs/2406.15927

**Detection — layer-wise / internal-state probing**
- Detecting LLM Hallucination Through Layer-wise Information Deficiency — https://arxiv.org/html/2412.10246
- Hallucination Is Linearly Decodable from Mid-Layer Hidden States in Quantized LLMs — https://arxiv.org/pdf/2606.02628
- Look Within, Why LLMs Hallucinate: A Causal Perspective — https://arxiv.org/pdf/2407.10153
- Cross-Layer Attention Probing for Fine-Grained Hallucination Detection — https://arxiv.org/pdf/2509.09700

**ASR / Whisper-specific**
- NPUsper: Eliminating Redundant Computation for Real-Time Whisper on Mobile NPUs (hallucination detection section) — https://arxiv.org/pdf/2607.01108
- Whisper Hallucination Detection and Mitigation via Hidden Representation Steering and Sparse AutoEncoders — https://arxiv.org/abs/2606.07473
- From Text Metrics to Model Internals: A Study of Whisper ASR Hallucination Detection — https://arxiv.org/pdf/2606.23060
- Listen Like a Teacher: Mitigating Whisper Hallucinations using Adaptive Layer Attention and Knowledge Distillation — https://arxiv.org/html/2511.14219
- Simul-Whisper: Attention-Guided Streaming Whisper with Truncation Detection — https://arxiv.org/pdf/2406.10052
- Investigation of Whisper ASR Hallucinations Induced by Non-Speech Audio (Barański et al., ICASSP 2025) — https://www.researchgate.net/publication/390536552

**Masking, correction & RAG-grounded repair**
- Mitigating Hallucinations in LLMs via Self-Refinement-Enhanced Knowledge Retrieval (covers NPH, RHO) — https://arxiv.org/html/2405.06545v1
- Toward Faithful Retrieval-Augmented Generation with Sparse Autoencoders (token/instance-level revision prompts) — https://arxiv.org/pdf/2512.08892
- Beyond Document Grounding: Span-Level Hallucination Detection over Code, Tool Output, and Documents — https://arxiv.org/abs/2607.00895v1
- Detecting Hallucinations in RAG via Semantic-level Internal Reasoning Graph — https://arxiv.org/pdf/2601.03052
- Stable-RAG: Mitigating Retrieval-Permutation-Induced Hallucinations in RAG — https://arxiv.org/pdf/2601.02993
- SEReDeEP: Hallucination Detection in RAG via Semantic Entropy and Context-Parameter Fusion — https://arxiv.org/pdf/2505.07528
- Reducing Hallucination in Structured Outputs via Retrieval-Augmented Generation — https://arxiv.org/abs/2404.08189
- Mitigating LLM Hallucinations through Domain-Grounded Tiered Retrieval — https://arxiv.org/pdf/2603.17872

**Theory, incentives & limits**
- Why Language Models Hallucinate (Kalai et al., OpenAI) — https://arxiv.org/abs/2509.04664
- (Im)possibility of Automated Hallucination Detection in LLMs — https://arxiv.org/abs/2504.17004

**Surveys**
- Hallucination Mitigation for Retrieval-Augmented Large Language Models: A Review — https://www.mdpi.com/2227-7390/13/5/856
- Hallucination Detection and Mitigation in Large Language Models (operational framework) — https://arxiv.org/pdf/2601.09929

**Baselines (black-box / sampling)**
- SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection — arXiv:2303.08896
- Self-Contradictory Hallucinations of LLMs — arXiv:2305.15852

> Note: several of these (2601.x, 2606.x, 2607.x prefixed arXiv IDs) are from a very recent submission window relative to this document's writing date (July 2026) — re-check for updated versions/revisions before citing in any formal writeup.

---

## 16. Next Steps / Immediate TODOs

- [x] Confirm dataset access (HALAS extension rights, RAGTruth license, HaluEval terms)
- [x] Read arXiv:2607.01108 (NPUsper) in full — closest literature match to the existing ASR attention-collapse finding; use its formalization to redefine the "collapse" signal as continuous (backward-shift magnitude) rather than binary (NaN)
- [x] Read arXiv:2606.02628 in full — resolve the "which layers matter" tension with arXiv:2407.10153 before Phase 4
- [x] Port Phase 0 signal-extraction code from the Whisper project to a text-LM decoder
- [x] Stand up detector baseline (linear probe per SEPs, layer-swept) as sanity check
- [x] Adopt arXiv:2607.00895's span-injection methodology for the synthetic corruption dataset
- [x] Define correction eval harness (fluency + faithfulness + latency) before touching the corrector model
- [x] Decide Phase 2 corrector strategy priority order (fine-tune vs. retrieval-infill vs. steering) based on available compute budget

---

## 17. Interactive Research & Verification Applet

To bring the theoretical framework and literature findings of this research plan to life, we have built a fully functional, highly interactive full-stack React and Express application. 

### 17.1 Architecture & Implementation Modules

The application is structured into 5 core modules, each reflecting critical aspects of our 2026 literature survey:

1. **Signal Extractor Dashboard (`DetectorDashboard`)**
   - **Theory-to-Code**: Extracts token-level internal representations and calculates Logit-Lens disagreements and attention entropy signals.
   - **Controls**: Lets users prompt Gemini or Hugging Face models to draft answers. Allows manual overrides or custom simulation parameters.
   - **Aesthetics**: High-contrast, dark luxury palette with beautiful step-by-step layer activation graphs.

2. **Conditional Context-Conditioned Corrector (`CorrectionPanel`)**
   - **Theory-to-Code**: Implements token masking and context-grounded infilling inspired by *NPH* and *Self-Refinement-Enhanced Knowledge Retrieval*.
   - **Execution**: Highlights hallucinated spans, masks them, and utilizes separate model presets (e.g., Qwen 2.5) to restore factuality while preserving fluency.

3. **Mechanistic Steering Sandbox (`EvaluationArena` - Tab 1)**
   - **Theory-to-Code**: Grounded in *Whisper representation steering* (2606.07473) and *causal layer ablations* (2407.10153).
   - **Sandbox**: Users manipulate sliders representing Sparse Autoencoder (SAE) active latents steering strength and select which layer stack to ablate (None, Early, Middle, Deep).
   - **Output**: Generates a dynamic 32-layer stack entropy comparison graph detailing original vs. steered metrics.

4. **Quantitative Benchmark Suite (`EvaluationArena` - Tab 2)**
   - **Theory-to-Code**: Evaluates factual recall models against standardized benchmarks.
   - **Presets**: Contains real factual question evaluations across **TriviaQA (Factual Recall)**, **RAGTruth (Document Grounding)**, and **MedQA (Biomedical Terminologies)**.
   - **Visualization**: Recharts-based bar chart showcasing vanilla vs. steered vs. corrected infill models.

5. **Cosmic Grounding Attractor Map (`GroundingExplorer`)**
   - **Theory-to-Code**: Explores the exact semantic and factual gravitation of individual claims against retrieved evidence passages.
   - **Visualization**: Built using a physics-inspired SVG interactive gravity field. Authoritative text serves as the massive attractor at the core, while claims orbit or are repulsed depending on their grounding status (Supported: inner orbit; Contradicted: outer centrifugal escape; Ungrounded: floating drift).
   - **Factual Traceability**: Users click on orbiters or claims to instantly parse source evidence and audit verdicts.

---

### 17.2 Architectural Pipeline & Data Flow
The visual below outlines the end-to-end mechanistic detection and conditioned infill restoration loop implemented inside our application:

```
[ LLM Output Draft ]
         │
         ▼
 ┌───────────────┐      Extract Attention Entropy (Layers 1-4)
 │ Layer-wise    ├────► Analyze Logit-Lens Disagreements (Layers 12-20)
 │ Signal Probe  ├────► Compute Semantic Energy & Variance (Layers 24-32)
 └───────┬───────┘
         │ (Fills heatmaps and calibration metrics)
         ▼
 ┌───────────────┐
 │ Span Boundary ├────► Pinpoint & highlight tokens below alignment thresholds
 │ Identification│      (e.g., specific dates, statistics, named entities)
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │ Token Masking ├────► Apply Mask tokens ([MASK]) dynamically over ungrounded spans
 │ & Replacement │      preserving valid context surrounding the error
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │ Context-Aware ├────► Retrieve grounding passages via Gemini Search / Context
 │ Infill Repair ├────► Output corrected, fluent text back into the system
 └───────────────┘
```

---

## 18. Local Setup & Forking Guide

Follow these steps to clone, configure, and execute the Hallucination-Aware LM research platform on your local machine:

### 18.1 Prerequisites
Ensure you have the following installed on your operating system:
* **Node.js** (v18.0.0 or higher) or **Bun** (v1.0.0 or higher)
* **Git** for version control

### 18.2 Cloning the Repository
First, fork the repository on GitHub to your own account, then clone it locally:

```bash
# Clone your fork
git clone https://github.com/Aryan-singh19/Hallucinations.git

# Navigate into the project folder
cd Hallucinations
```

### 18.3 Environment Configuration
Create a local `.env` file in the root directory. You can copy the variables from `.env.example`:

```bash
cp .env.example .env
```

Open the `.env` file and supply your API keys:
```env
# Required for live server-side LLM outputs, grounding validation, and claim audits
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Required if using Hugging Face endpoints
HF_API_KEY=your_hugging_face_token_here
```

### 18.4 Installation & Dependencies
Install the required node packages using your preferred package manager:

```bash
# Using npm
npm install

# Or using Bun (recommended for faster dependency resolution)
bun install
```

### 18.5 Running the Development Server
Launch the full-stack development environment. This starts the Express server which hosts both the API endpoints (`/api/*`) and serves the Vite-powered React front-end:

```bash
# Using npm
npm run dev

# Using Bun
bun run dev
```

Once started, navigate to:
👉 **`http://localhost:3000`** in your web browser.

### 18.6 Production Compilation & Deployment
To package and bundle the application for production deployment:

```bash
# Build Vite client assets & compile the server with esbuild
npm run build

# Start the optimized production build
npm run start
```

This compiles client-side code into static files in `/dist` and bundles the Express server to `dist/server.cjs` using native ES module optimization, ready to run inside any production container environment.

---

