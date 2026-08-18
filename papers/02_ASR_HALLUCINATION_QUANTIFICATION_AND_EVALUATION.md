# Chapter 2: Hallucination Quantification & Evaluation in ASR

## Executive Overview

Quantifying hallucinations in Automatic Speech Recognition (ASR) presents unique challenges because standard **Word Error Rate (WER)** conflates ordinary phonetic substitution errors with catastrophic, non-grounded generations. 

The literature has converged on a tripartite evaluation hierarchy:
1. **Text-Level & Alignment Metrics** (Behavioral measurement)
2. **Specialized Diagnostic Test Suites & Stress Benchmarks** (Dataset perturbation)
3. **Internal Mechanistic & Probing Metrics** (White-box acoustic signals)

---

## 1. Mathematical Metrics for ASR Hallucination

```
                                  ┌───────────────────────────────────────────────┐
                                  │       ASR Hallucination Metric Hierarchy      │
                                  └──────────────────────┬────────────────────────┘
                                                         │
               ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
               ▼                                         ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐                 ┌───────────────────────┐
   │   Textual & Lexical   │                 │   Acoustic-Temporal   │                 │  Internal Mechanistic │
   │  - Hallucination Rate │                 │  - Insertion Rate     │                 │  - Cross-Attn Entropy │
   │  - Compression Ratio  │                 │  - Silence CER/WER    │                 │  - Monotonicity Index │
   │  - Semantic Proximity │                 │  - Alignment Drift    │                 │  - SAE Feature Probing│
   └───────────────────────┘                 └───────────────────────┘                 └───────────────────────┘
```

### A. Hallucination Rate (HR) and Insertion Dominance
Standard Word Error Rate is computed as:
$$\text{WER} = \frac{S + D + I}{N} = \frac{\text{Substitutions} + \text{Deletions} + \text{Insertions}}{\text{Reference Words}}$$

In hallucinated transcripts, the **Insertion Rate (IR)** diverges dramatically:
$$\text{IR} = \frac{I}{N}$$

* **Koizumi et al. (2024)** defines the utterance-level **Binary Hallucination Indicator** $\mathcal{H}(y, y^*)$:
  $$\mathcal{H}(y, y^*) = \mathbb{I}\left( \frac{\text{Length}(y)}{\text{Length}(y^*)} > 2.0 \quad \lor \quad \text{BERTScore}(y, y^*) < 0.35 \right)$$
  The dataset-wide **Hallucination Rate (HR%)** is:
  $$\text{HR} = \frac{1}{|D|} \sum_{i=1}^{|D|} \mathcal{H}(y_i, y_i^*) \times 100\%$$

### B. Compression Ratio & Repetition Index ($C_R$)
To detect Type III (Repetition Loop) hallucinations without reference transcripts:
$$C_R(y) = \frac{\text{ByteLength}(y)}{\text{ByteLength}(\text{zlib\_compress}(y))}$$
* When $C_R(y) > 2.4$, the sequence contains high-frequency cyclic n-gram repetitions with $>99.2\%$ precision.

### C. Average Token Log-Probability ($\overline{\log P}$) vs. No-Speech Probability ($P_{\text{nospeech}}$)
* **Radford et al. (OpenAI Whisper)** uses two token-level thresholds:
  1. **Mean Token Log-Probability**:
     $$\overline{\log P} = \frac{1}{T} \sum_{t=1}^T \log P(y_t \mid y_{<t}, \mathbf{X}_{\text{audio}})$$
     If $\overline{\log P} < -1.0$, the decoding hypothesis is flagged as low-confidence/hallucinated.
  2. **No-Speech Probability Threshold**: If $P_{\text{nospeech}} > 0.6$ and $\overline{\log P} < -0.5$, suppress generation completely.

---

## 2. Internal Model & Mechanistic Metrics

Recent breakthroughs (2024–2026) move beyond black-box output text to measure internal transformer representations during decoding.

### A. Cross-Attention Entropy ($H_{\text{cross}}$)
For decoder layer $l$, head $h$, at decoding step $t$, the cross-attention distribution over $T_{\text{enc}}$ audio frames is $\mathbf{a}_t^{(l,h)} \in \mathbb{R}^{T_{\text{enc}}}$.
The cross-attention entropy is:
$$H_{\text{cross}}(t) = -\sum_{k=1}^{T_{\text{enc}}} a_{t,k} \log (a_{t,k} + \epsilon)$$

* **Grounded Transcription**: Attention is sharp and focused on the current phoneme/word audio frames ($H_{\text{cross}} \approx 1.2 - 2.8\text{ nats}$).
* **Hallucination State**: Attention disperses uniformly across all audio frames or collapses to a single frame ($H_{\text{cross}} > 5.4\text{ nats}$).

### B. Temporal Monotonicity Index ($\rho_{\text{mono}}$)
Because human speech progresses linearly forward in time, the peak cross-attention index $c_t = \arg\max_k (a_{t,k})$ must increase monotonically with decoding step $t$.
* **Spearman Rank Monotonicity Correlation**:
  $$\rho_{\text{mono}} = 1 - \frac{6 \sum_{t=1}^T (t - \text{rank}(c_t))^2}{T(T^2 - 1)}$$
* **Interpretation**:
  - $\rho_{\text{mono}} \ge 0.85$: Normal, grounded forward speech alignment.
  - $\rho_{\text{mono}} < 0.40$: Severe cross-attention collapse and hallucination.

### C. Sparse Autoencoder (SAE) & Hidden Representation Probes
* **Habhan, Barański et al. (2026)** and **Chen et al. (2026)** train sparse linear probes and Top-K Sparse Autoencoders on residual stream layers $L_{12} - L_{24}$.
* They isolate specific "hallucination direction vectors" $\mathbf{v}_{\text{halluc}} \in \mathbb{R}^{d_{\text{model}}}$ that predict ungrounded tokens with **AUROC > 0.94** before the token is emitted.

---

## 3. Specialized Diagnostic Benchmarks & Stress Suites

| Benchmark Suite | Source / Paper | Composition | Target Hallucination Vulnerability |
|---|---|---|---|
| **HALAS Benchmark** | Koizumi et al. (2024) | 4,500 audio samples across 6 languages with varying SNR, silence padding, and background noise. | LM prior takeover and insertion rate under low SNR. |
| **Non-Speech Audio Split (NAS)** | Barański et al. (ICASSP 2025) | 1,200 non-speech audio clips (applause, coughing, keyboard typing, ringtones, ambient forest noise). | False positive transcriptions generated on non-human audio. |
| **LibriSpeech-Silence Suite** | OpenAI / Community | 10-minute pure digital silence and low-amplitude white/pink noise audio files. | Phantom prompt emissions (`"Thank you for watching"`, `"Amara.org subtitles"`). |
| **CommonVoice Truncated Chunks** | Simul-Whisper (2024) | Utterances cut mid-sentence with variable streaming buffer sizes. | Trailing continuation hallucinations at segment boundaries. |
| **Semantic Entropy Speech Suite** | Bi, Farquhar et al. (Nature 2024 / Oxford) | Multi-sample acoustic perturbations with semantic equivalence clustering. | Unverifiable claims vs. factual phonetic transcriptions. |

---

## 4. Evaluation Checklist for ASR Hallucination Research

When benchmarking a model or mitigation technique, literature standards dictate reporting:
1. **WER & CER** on clean speech (e.g., LibriSpeech test-clean).
2. **Hallucination Rate (HR%)** on noise-perturbed speech (HALAS or SNR $\le 0\text{ dB}$).
3. **Silence Insertion Count ($N_{\text{silence}}$)**: Total words generated across 1 hour of non-speech audio.
4. **Repetition Rate ($R_{\text{loop}}$)**: Percentage of decoded samples with $C_R > 2.4$.
5. **Detection AUROC**: Performance of internal probes ($H_{\text{cross}}$, $\rho_{\text{mono}}$, or SAE logits) in classifying tokens as grounded vs. ungrounded.
