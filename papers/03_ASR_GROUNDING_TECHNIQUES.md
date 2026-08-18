# Chapter 3: Grounding & Mitigation Techniques for ASR Hallucinations

## Executive Overview

Grounding in Automatic Speech Recognition (ASR) refers to the set of architectural, decoding-time, and representation-level mechanisms designed to **enforce strict mathematical fidelity between the generated text sequence and the input acoustic speech signal**.

The literature presents four major pillars of grounding interventions:

```
                            ┌─────────────────────────────────────────────────┐
                            │          ASR Grounding Intervention Map         │
                            └────────────────────────┬────────────────────────┘
                                                     │
         ┌───────────────────────────┬───────────────┴───────────────┬───────────────────────────┐
         ▼                           ▼                               ▼                           ▼
┌──────────────────┐       ┌──────────────────┐            ┌──────────────────┐        ┌──────────────────┐
│  Architectural & │       │ Monotonic Cross- │            │  Mechanistic &   │        │ Pre-Processing & │
│    Hybrid CTC    │       │ Attention Gating │            │ SAE Steering     │        │ VAD Conditioning │
└──────────────────┘       └──────────────────┘            └──────────────────┘        └──────────────────┘
```

---

## 1. Architectural & Hybrid CTC-AED Grounding

The most fundamental structural defense against hallucination is anchoring autoregressive attention models with frame-synchronous acoustic classifiers.

### A. Joint CTC-Attention Decoding (Acoustic Anchoring)
* **Mechanics**: Combines the autoregressive Attention-based Encoder-Decoder (AED) objective with a Connectionist Temporal Classification (CTC) loss on the encoder output:
  $$\mathcal{L}_{\text{hybrid}} = \alpha \log P_{\text{CTC}}(Y \mid \mathbf{X}) + (1 - \alpha) \log P_{\text{AED}}(Y \mid \mathbf{X})$$
* **Grounding Benefit**: CTC enforces strict monotonic alignment and has no autoregressive language model prior. During beam search decoding, CTC scores act as an acoustic guardrail:
  $$\text{Score}(y_t) = (1 - \lambda) \log P_{\text{AED}}(y_t \mid y_{<t}, \mathbf{X}) + \lambda \log P_{\text{CTC}}(y_t \mid y_{<t}, \mathbf{X})$$
  If the AED decoder attempts to hallucinate tokens not present in the CTC alignment trellis, $P_{\text{CTC}} \to -\infty$, immediately killing the hallucinated hypothesis.

---

## 2. Monotonic Cross-Attention Gating & Attention Steering

Standard transformer cross-attention is unconstrained across time. Modern grounding techniques introduce temporal priors directly into the attention mechanism.

### A. Monotonic Attention Windowing (NPUsper / Simul-Whisper)
* **Mechanics**: For decoding step $t$, the cross-attention matrix $\mathbf{A}_t \in \mathbb{R}^{T_{\text{enc}}}$ is masked by a causal Gaussian or step window centered around the estimated current speech frame $k_t$:
  $$\tilde{a}_{t,k} = \frac{\exp\left( \frac{Q_t K_k^\top}{\sqrt{d_k}} - \frac{(k - k_t)^2}{2\sigma^2} \right)}{\sum_{j} \exp\left( \frac{Q_t K_j^\top}{\sqrt{d_j}} - \frac{(j - k_t)^2}{2\sigma^2} \right)}$$
* **Result**: Prevents the decoder from attending backward to already-transcribed speech (stopping repetition loops) or attending forward into silent audio frames.

### B. Adaptive Layer Attention & Distillation (Zhao, Tan et al., 2025)
* **Method**: "Listen Like a Teacher" transfers focused cross-attention patterns from intermediate encoder layers to deep decoder layers via knowledge distillation.
* **Result**: Reduces cross-attention entropy by 42% and eliminates 88% of silent-segment transcriptions in Whisper Large-v3.

---

## 3. Mechanistic Representation Steering & Sparse Autoencoders (SAEs)

When a model has already been trained, representation engineering allows direct intervention in the model's residual stream during inference without fine-tuning weights.

### A. Sparse Autoencoder (SAE) Feature Clamping (Habhan et al., 2026)
* **Method**:
  1. Train a Sparse Autoencoder on the decoder's residual stream:
     $$\mathbf{h}_l = \sum_{i=1}^M f_i(\mathbf{h}_l) \mathbf{d}_i + \mathbf{b}$$
  2. Identify specific latent directions $\{ \mathbf{d}_{\text{halluc}} \}$ that activate when the model drifts from acoustic evidence.
  3. During decoding, clamp or subtract these feature activations:
     $$\tilde{\mathbf{h}}_l = \mathbf{h}_l - \beta \sum_{j \in \mathcal{S}_{\text{halluc}}} f_j(\mathbf{h}_l) \mathbf{d}_j$$
* **Result**: Reduces hallucination rate on noisy speech by 76% while maintaining baseline WER on clean audio.

### B. Contrastive Layer Decoding (DoLa for Speech, Chuang et al. / EMNLP 2024)
* **Method**: Contrast the next-token probability distribution of the final layer against an intermediate acoustic-dominant layer:
  $$\log \tilde{P}(y_t) = \log P_{\text{final}}(y_t) - \gamma \log P_{\text{premature}}(y_t)$$
* **Result**: Cancels out generic language model memorization and amplifies tokens strictly supported by lower-layer acoustic representations.

---

## 4. Audio Conditioning, VAD & Prompt Grounding

### A. Tight Voice Activity Detection (VAD) Segmentation
* **Standard Practice (OpenAI Whisper / Silero VAD)**: Pre-processing audio through high-precision neural VAD (e.g., 30ms window, 50% overlap).
* **Rule**: Decoders are never fed pure-silence frames. Silence chunks are hard-coded to emit empty strings $\epsilon$ rather than triggering the autoregressive decoder.

### B. Dynamic Fallback & Temperature Scheduling
* If $\overline{\log P} < \theta_{\text{prob}}$ or $C_R > 2.4$:
  1. Increment decoding temperature $T \leftarrow T + 0.2$ or fallback to greedy decoding with a strictly non-zero repetition penalty ($\text{penalty} = 1.25$).
  2. Reset prompt history and clear prior context tokens to prevent cross-segment error propagation.

---

## 5. Comparative Evaluation of Grounding Techniques

| Technique | Implementation Level | Hallucination Reduction | Compute Overhead | Preserves Clean WER? |
|---|---|---|---|---|
| **VAD Silence Truncation** | Pre-processing | > 95% on silence | Negligible (< 1%) | Yes |
| **Hybrid CTC-AED Beam Search** | Architecture / Inference | > 90% across all types | + 10-15% | Yes (improves WER) |
| **Monotonic Attention Masking** | Decoder Cross-Attention | > 85% on loops & drift | Negligible | Yes |
| **SAE Representation Steering** | Residual Stream Latents | ~ 76% on low SNR | + 5% | Yes |
| **Temperature Fallback Heuristics** | Post-generation Retry | ~ 60% on loops | + 50-100% on failure | Yes |

---

## Summary & Research Directions

Grounding in modern ASR requires a **multi-layered defense**:
1. **At the inputs**: Clean VAD segmentation to prevent Type I silence hallucinations.
2. **In the architecture**: Hybrid CTC or monotonic attention constraints to anchor time-alignment.
3. **In the latent space**: SAE steering or layer-contrasting to suppress overconfident LM priors.
4. **At decoding**: Cross-attention entropy monitoring to immediately abort ungrounded trajectory drift.
