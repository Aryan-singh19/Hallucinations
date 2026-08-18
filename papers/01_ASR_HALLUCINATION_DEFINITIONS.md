# Chapter 1: Hallucination Definitions Across the ASR & Speech-LM Literature

## Executive Overview

In Automatic Speech Recognition (ASR) and Speech-to-Text foundation models (such as OpenAI Whisper, SeamlessM4T, AudioPaLM, and Conformer-AED models), **hallucination** is qualitatively distinct from standard acoustic substitution/deletion errors (such as mishearing a single phonetic segment). 

Across peer-reviewed literature and recent preprints (2022–2026), hallucination in ASR is defined as **the autoregressive generation of fluent, syntactically coherent text that has zero or negligible semantic or acoustic correspondence with the input speech signal**.

---

## 1. Taxonomic Classifications of ASR Hallucination

The literature categorizes ASR hallucinations into four primary mechanical archetypes:

```
                          ┌───────────────────────────────────────────────┐
                          │         ASR Hallucination Taxonomy            │
                          └──────────────────────┬────────────────────────┘
                                                 │
         ┌───────────────────────────────┬───────┴───────────────────────────────┬───────────────────────────────┐
         ▼                               ▼                                       ▼                               ▼
┌──────────────────┐           ┌──────────────────┐                    ┌──────────────────┐            ┌──────────────────┐
│  Type I: Silence │           │  Type II: Prior  │                    │ Type III: Loop / │            │ Type IV: Trigger │
│  & Ambient Drift │           │     Takeover     │                    │  Self-Entrainment│            │  Shift Collapse  │
└──────────────────┘           └──────────────────┘                    └──────────────────┘            └──────────────────┘
```

### Type I: Silence & Non-Speech Audio Insertion (Fabrication from Void)
* **Definition**: The model produces long, coherent transcripts during segments of silence, background static, musical intros, breathing, or non-speech ambient audio.
* **Core Papers**: 
  - *Radford et al. (OpenAI Whisper, 2023)*: Notes that Whisper frequently emits transcript snippets (e.g., `"Thank you for watching!"`, `"Subscribe to our channel"`, `"Transcribed by..."`) during silence because its weak-supervision training data scraped from YouTube contained subtitle credits during silent video segments.
  - *Barański et al. (ICASSP 2025)*: Formulates non-speech induced hallucinations as a failure of the acoustic encoder to suppress decoder conditioning when input audio power falls below the speech presence probability threshold.

### Type II: Language Model (LM) Prior Takeover (Acoustic Detachment)
* **Definition**: A phenomenon where the autoregressive decoder's internal language model distribution $P_{\text{LM}}(y_t \mid y_{<t})$ overpowers the acoustic cross-attention conditioning $P(y_t \mid y_{<t}, \mathbf{H}_{\text{audio}})$.
* **Mechanics**:
  $$P(y_t \mid y_{<t}, \mathbf{H}_{\text{audio}}) \approx P_{\text{LM}}(y_t \mid y_{<t})$$
* **Core Papers**:
  - *Koizumi et al. ("Did You Hear That?", 2024)*: Defines ASR hallucination as a catastrophic phase transition where the decoder shifts from **transcription mode** to **free-form text continuation mode**. Once a rare word or acoustic perturbation occurs, the decoder drifts completely from the acoustic timeline.
  - *Tan et al. / Zhao et al. (2025)*: Proves that encoder-decoder attention weights disperse uniformly across the time axis (attention entropy spike) when the LM prior takes over.

### Type III: Repetition Loops & Autoregressive Self-Entrainment
* **Definition**: The generation of repeating phrases, sentences, or n-grams (e.g., `"and they went to the market and they went to the market..."`), where the decoder attends heavily to its own generated past tokens rather than advancing across the acoustic representation.
* **Core Papers**:
  - *Simul-Whisper (Wang et al., 2024)*: Characterizes repetition loops as the failure of the cross-attention alignment diagonal. The attention alignment matrix stalls at a single audio frame index $t_{\text{frame}}$ while token decoding $i$ continues indefinitely.
  - *Radford et al. (2023)*: Uses a temperature fallback heuristic specifically to break autoregressive repetition loops.

### Type IV: Cross-Attention Collapse & Reverse Temporal Shift
* **Definition**: The mechanistic breakdown of cross-attention vectors in the deep layers of the speech decoder, where attention heads attend backwards in time or collapse to uniform probability distributions.
* **Core Papers**:
  - *Li et al. (NPUsper, arXiv:2607.01108)*: Proves that hallucinated segments in Whisper decoders are preceded by **backward temporal shifts** in the final decoder layer's cross-attention map, followed by numerical underflow or near-zero attention variance.
  - *Habhan et al. (2026)*: Demonstrates that the model's intermediate residual stream activates a distinct subnetwork of "speculative latents" when generating ungrounded speech tokens.

---

## 2. Comparative Matrix: Paper-by-Paper Definitions

| Paper | Model Studied | Definition of Hallucination in Text / Formalism | Root Cause Identified |
|---|---|---|---|
| **Radford et al. (2023)** *Whisper* | Whisper (Tiny to Large-v3) | Repetitive output loops, transcriptions emitted on silence, and insertion of web-scraping metadata artifacts. | Web-scale weak supervision artifacts + autoregressive beam search bias. |
| **Koizumi et al. (2024)** *"Did You Hear That?"* | Large Speech Models (Whisper, USM) | Utterances where character insertion rate exceeds 50% relative to acoustic duration, or where semantic similarity to ground truth is $\le 0.2$. | Acoustic under-specification leading to LM unconditional generation. |
| **Barański et al. (2025)** *ICASSP 2025* | Whisper ASR | Transcription of coherent linguistic sequences from non-speech audio inputs (applause, music, noise, coughs). | False acoustic trigger tokens that activate high-probability prefix paths in the decoder. |
| **Li et al. (2026)** *NPUsper* | Whisper-Decoder | A breakdown of the temporal monotonicity of the cross-attention matrix $\mathbf{A} \in \mathbb{R}^{T_{\text{dec}} \times T_{\text{enc}}}$. | Decoder final layer attention collapse into historical or dummy tokens. |
| **Habhan et al. (2026)** *Whisper SAEs* | Whisper Large | Activation of non-grounded Sparse Autoencoder (SAE) feature directions that diverge from acoustic frame embeddings. | Over-parameterized decoder layers possessing ungrounded language knowledge latents. |
| **Wang et al. (2024)** *Simul-Whisper* | Streaming Whisper | Unbounded token generation occurring after acoustic utterance completion (trailing hallucinations). | Inability of chunk-based cross-attention to recognize speech endpoint boundaries. |

---

## 3. Summary of Key Theoretical Insights

1. **ASR Hallucination is Not Gaussian Error**: Unlike classical ASR (HMM-GMM or Kaldi) which produced phonetic gibberish under high noise, modern neural speech models produce **grammatically flawless, highly convincing lies**.
2. **The Tension Between Robustness and Grounding**: Deep transformer decoders trained on internet-scale text/speech develop powerful internal language modeling capabilities. When acoustic signal-to-noise ratio (SNR) drops, the model smoothly substitutes internal predictive priors for missing acoustic evidence.
3. **Phase Transition Behavior**: Hallucination onset is sharp. Once cross-attention fails on 2–3 consecutive tokens, the probability of remaining tokens being hallucinated approaches 1.0 until a segment boundary is reached.
