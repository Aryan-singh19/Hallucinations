# Chapter 1: Definitions and Taxonomy of Hallucinations in Automatic Speech Recognition (ASR)

---

## 1. Executive Summary & Problem Formulation

In Automatic Speech Recognition (ASR) and Speech Foundation Models (e.g., OpenAI Whisper, SeamlessM4T, AudioPaLM, Conformer-AED), **hallucination** is fundamentally distinct from classical acoustic misrecognitions (such as localized phonetic substitutions or word deletions).

Across the speech processing and deep learning literature, an ASR hallucination is defined as:
> **The autoregressive generation of fluent, grammatically sound linguistic sequences that exhibit zero or negligible semantic or acoustic correspondence with the input speech signal.**

```
                          ┌───────────────────────────────────────────────────────────┐
                          │            ASR Hallucination Taxonomy Matrix              │
                          └─────────────────────────────┬─────────────────────────────┘
                                                        │
         ┌──────────────────────────────┬───────────────┴───────────────┬──────────────────────────────┐
         ▼                              ▼                               ▼                              ▼
┌──────────────────┐          ┌──────────────────┐            ┌──────────────────┐           ┌──────────────────┐
│  Type I: Silence │          │  Type II: Prior  │            │ Type III: Loop / │           │ Type IV: Shift   │
│  & Ambient Drift │          │     Takeover     │            │  Self-Entrainment│           │  & Attn Collapse │
└──────────────────┘          └──────────────────┘            └──────────────────┘           └──────────────────┘
```

---

## 2. Four Structural Archetypes of ASR Hallucination

### Type I: Silence & Non-Speech Audio Fabrication
* **Definition**: Spontaneous emission of natural-sounding transcripts during audio segments containing pure digital silence, ambient background noise, music, breathing, coughing, or applause.
* **Root Cause**: Weakly supervised training data (e.g., YouTube videos) where video intros/outros or silence coincided with creator subtitles (e.g., emitting `"Thank you for watching!"`, `"Subtitles by Amara.org"`, `"Please subscribe"`).
* **Key Literature**: *Barański et al. (ICASSP 2025, arXiv:2501.11378)*, *Radford et al. (OpenAI Whisper, 2023, arXiv:2212.04356)*.

### Type II: Language Model (LM) Prior Takeover
* **Definition**: A state transition where the autoregressive decoder's internal language model prior $P_{\text{LM}}(y_t \mid y_{<t})$ overpowers the acoustic cross-attention conditioning $P(y_t \mid y_{<t}, \mathbf{H}_{\text{audio}})$.
* **Mechanics**:
  $$P(y_t \mid y_{<t}, \mathbf{H}_{\text{audio}}) \approx P_{\text{LM}}(y_t \mid y_{<t})$$
  When acoustic signals are corrupted by low SNR, heavy reverberation, or speaker overlap, the model transitions from transcription to free-form generative text completion.
* **Key Literature**: *Frieske & Shi (arXiv:2401.01572)*, *Zhao et al. (arXiv:2502.12414)*, *Koizumi et al. (Interspeech, arXiv:2402.08845)*.

### Type III: Repetition Loops & Autoregressive Self-Entrainment
* **Definition**: The decoder gets trapped in a self-reinforcing state where it attends heavily to its own previously emitted tokens rather than advancing across acoustic representations, outputting identical $n$-grams indefinitely.
* **Key Literature**: *Wang et al. (Simul-Whisper, Interspeech 2024, arXiv:2406.10052)*, *Radford et al. (2023)*.

### Type IV: Cross-Attention Collapse & Reverse Temporal Shift
* **Definition**: Temporal collapse of cross-attention heads in deep decoder layers, where attention weights disperse uniformly across all audio frames or jump backward into historical speech frames.
* **Key Literature**: *Li et al. (arXiv:2607.01108)*, *Mechanistic Interpretability Speech Group (arXiv:2606.07473)*.

---

## 3. Curated Research Papers in `papers/01_definitions/`

1. **`radford_whisper_robust_speech_recognition_2212.04356.pdf`**  
   *Alec Radford, Jong Wook Kim, et al. (OpenAI, ICML 2023)*  
   *Focus*: Introduces the Whisper architecture, weak-supervision artifacts, silence repetition loops, and temperature fallback heuristics.
2. **`did_you_hear_that_measuring_whisper_hallucinations_2402.08845.pdf`**  
   *Yuma Koizumi, Heiga Zen, Shigeki Karita, et al. (Google Research, Interspeech)*  
   *Focus*: Formalizes the operational definition of ASR hallucination vs. acoustic mishearings; introduces Hallucination Rate (HR%).
3. **`investigation_whisper_hallucinations_non_speech_2501.11378.pdf`**  
   *Przemysław Barański, Maciej Wołk, et al. (ICASSP 2025)*  
   *Focus*: Comprehensive taxonomy and empirical analysis of hallucinations triggered by silence, applause, coughing, music, and background noise.
4. **`careless_whisper_speech_to_text_hallucination_harms_2402.08021.pdf`**  
   *Allison Koenecke, et al. (Stanford & Cornell, FAccT)*  
   *Focus*: Real-world categorical harms of speech foundation model hallucinations in medical, legal, and conversational speech transcription settings.
5. **`lost_in_transcription_found_in_distribution_shift_2502.12414.pdf`**  
   *Zheng-Ning Zhao, et al. (arXiv:2502.12414)*  
   *Focus*: Explains how acoustic distribution shifts trigger language model prior takeover in autoregressive speech decoders.
6. **`hallucinations_in_neural_asr_identifying_errors_2401.01572.pdf`**  
   *Valentin Frieske, Mengjie Shi (arXiv:2401.01572)*  
   *Focus*: Defines semantic disconnect despite high linguistic fluency across Whisper, Conformer, and wav2vec2 models.
