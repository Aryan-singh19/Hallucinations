# Hallucination in Automatic Speech Recognition: Taxonomy, Diagnostics, and Grounding

---

## 1. Important Background Information

Over the past decade, Automatic Speech Recognition (ASR) has undergone a fundamental architectural paradigm shift. Classical ASR systems relied on modular, decoupled pipelines comprising an Acoustic Model (e.g., Hidden Markov Models paired with Gaussian Mixture Models or Deep Neural Networks, HMM-GMM / DNN-HMM), a Pronunciation Lexicon (grapheme-to-phoneme mapping), and an external $n$-gram or neural Language Model (LM). In these classical pipelines, decoding was strictly constrained by a weighted finite-state transducer (WFST) search graph. If the acoustic evidence was corrupted by noise, reverberation, or low signal-to-noise ratio (SNR), the system failed predictably: it produced localized phonetic substitutions, deletions, or acoustic garble. Crucially, classical WFST decoders lacked the generative capacity to invent autonomous, long-horizon textual content unmoored from the acoustic lattice.

```
Classical Modular Pipeline (Acoustically Bound):
[ Audio ] ──> [ Feature Extraction ] ──> [ Acoustic Model (HMM-DNN) ] ──> [ WFST Search Graph (AM + Lexicon + n-gram LM) ] ──> [ Phonetic Garble on Noise ]

Modern End-to-End Foundation Model (Generative Autoregressive Decoder):
[ Audio ] ──> [ Audio Mel Spectrogram ] ──> [ Transformer Encoder ] ──> Cross-Attention ──> [ Autoregressive Transformer Decoder ] ──> [ Fluent Hallucination on Noise ]
```

Modern speech foundation models—exemplified by OpenAI Whisper, Conformer Attention-based Encoder-Decoder (Conformer-AED) architectures, AudioPaLM, and SeamlessM4T—replace this modular search graph with an end-to-end, sequence-to-sequence transformer framework. In this paradigm, an audio encoder maps a log-mel spectrogram $\mathbf{X} \in \mathbb{R}^{T_{\text{audio}} \times D_{\text{mel}}}$ into continuous acoustic representations $\mathbf{H} = \text{Encoder}(\mathbf{X}) \in \mathbb{R}^{T_{\text{enc}} \times D_{\text{model}}}$. An autoregressive transformer decoder generates the output token sequence $\mathbf{y} = (y_1, y_2, \dots, y_U)$ by modeling the conditional probability distribution at step $u$:

$$P(y_u \mid y_{<u}, \mathbf{X}) = \text{Softmax}\left( \mathbf{W}_v \cdot \text{DecoderLayer}_L(\mathbf{h}_u^{(L)}) \right)$$

where $\mathbf{h}_u^{(L)}$ is computed via self-attention over previously generated tokens $y_{<u}$ and cross-attention over the acoustic encoder representations $\mathbf{H}$:

$$\text{CrossAttn}(Q_u, K_{\mathbf{H}}, V_{\mathbf{H}}) = \text{Softmax}\left( \frac{Q_u K_{\mathbf{H}}^\top}{\sqrt{d_k}} \right) V_{\mathbf{H}}$$

Because these decoders are parameterized with hundreds of millions to billions of parameters trained on hundreds of thousands of hours of weakly supervised internet data, the decoder functions internally as a powerful, pretrained language model. When the acoustic signal is clear, cross-attention vectors sharply localize relevant temporal acoustic frames. However, when the acoustic input is degraded, ambiguous, masked by background interference, or silent, the conditioning signal from the encoder becomes uninformative. Under these conditions, the autoregressive decoder experiences an internal state transition: **the internal language model prior overpowers acoustic conditioning**, and the model continues decoding by relying purely on its internal predictive language distributions. 

Consequently, modern speech models do not fail with acoustic noise; they fail by producing **syntactically pristine, semantically fluent, but acoustically fabricated transcripts**—a pathology termed *ASR hallucination*.

---

## 2. How is Hallucination Defined in the Literature?

The literature distinguishes five distinct operational and mechanistic definitions of ASR hallucination:

```
                                  ┌─────────────────────────────────────────────────────────────┐
                                  │            ASR Hallucination Taxonomy Matrix                │
                                  └──────────────────────────────┬──────────────────────────────┘
                                                                 │
         ┌───────────────────────────────┬───────────────────────┴───────────────────────┬───────────────────────────────┐
         ▼                               ▼                                               ▼                               ▼
┌──────────────────┐           ┌──────────────────┐                            ┌──────────────────┐            ┌──────────────────┐
│  Definition 1:   │           │  Definition 2:   │                            │  Definition 3:   │            │  Definition 4/5: │
│  Semantic Dis-   │           │  LM Prior        │                            │  Silence & Non-  │            │  Loop Entrain-   │
│  connection      │           │  Takeover        │                            │  Speech Trigger  │            │  ment & Collapse │
└──────────────────┘           └──────────────────┘                            └──────────────────┘            └──────────────────┘
```

* **Definition 1: Semantic Disconnection Despite High Linguistic Fluency**  
  *Formalization*: Frieske & Shi (2024) and Koizumi et al. (2024) define hallucination as an utterance-level decoding failure where the generated transcript $\hat{\mathbf{y}}$ exhibits high language model fluency (low perplexity $\text{PPL}(\hat{\mathbf{y}}) < \tau$) and grammatical coherence, but shares near-zero semantic mutual information or semantic overlap with the ground-truth reference utterance $\mathbf{y}^*$:
  $$\text{BERTScore}(\hat{\mathbf{y}}, \mathbf{y}^*) \ll \epsilon \quad \text{while} \quad \text{Perplexity}_{\text{LM}}(\hat{\mathbf{y}}) \le \text{Perplexity}_{\text{LM}}(\mathbf{y}^*)$$
  The generated text reads naturally in the target language but constitutes an autonomous fabrication.

* **Definition 2: Language Model Prior Takeover over Acoustic Cross-Attention Conditioning**  
  *Formalization*: A mathematical transition in the conditional generation probability where the decoder effectively drops its acoustic conditioning argument:
  $$P(y_u \mid y_{<u}, \mathbf{H}) \approx P_{\text{LM}}(y_u \mid y_{<u})$$
  In this regime, the decoder's predictive entropy is governed entirely by token-level transition statistics $P_{\text{LM}}$, rendering the decoding trajectory insensitive to perturbations in the acoustic encoder state $\mathbf{H}$.

* **Definition 3: Silence and Non-Speech Audio Fabrications**  
  *Formalization*: Barański et al. (ICASSP 2025) and Radford et al. (2023) define non-speech hallucinations as the emission of non-empty linguistic sequences $\hat{\mathbf{y}} \neq \emptyset$ given an input audio segment $\mathbf{X}$ whose acoustic speech presence probability is zero ($P(\text{speech} \mid \mathbf{X}) \approx 0$). In weakly supervised foundation models, this is frequently triggered by YouTube subtitle training artifacts where silent frames co-occurred with video metadata credits (e.g., emitting `"Thank you for watching!"`, `"Please subscribe"`, or `"Subtitles by Amara.org"`).

* **Definition 4: Degenerate Autoregressive Repetition Loops**  
  *Formalization*: Wang et al. (Simul-Whisper, 2024) characterize repetition loops as a structural failure where the decoder self-entrains on its own history. The cross-attention distribution over audio frames stalls at a single temporal position $t_{\text{stall}}$, while self-attention weights between token step $u$ and token step $u - k$ approach unity:
  $$\alpha_{u, t_{\text{enc}}}^{\text{cross}} \approx \delta(t_{\text{enc}} - t_{\text{stall}}) \quad \forall u \ge u_0, \quad \hat{y}_{u} = \hat{y}_{u - k}$$
  The decoder repeatedly emits an $n$-gram sequence indefinitely until hitting the maximum sequence length limit.

* **Definition 5: Mechanistic Cross-Attention Collapse and Loss of Temporal Monotonicity**  
  *Formalization*: Li et al. (NPUsper, arXiv:2607.01108) and Habhan et al. (2026) define hallucination through internal representation geometry: a breakdown of the temporal monotonicity of the cross-attention alignment matrix $\mathbf{A} \in \mathbb{R}^{U \times T_{\text{enc}}}$. In normal speech, the attention peak $c_u = \arg\max_t (A_{u, t})$ advances monotonically with $u$. During hallucination collapse, cross-attention vectors either disperse uniformly across all frames (entropy explosion) or exhibit non-causal backward temporal hops:
  $$\frac{\partial c_u}{\partial u} \le 0 \quad \text{or} \quad \text{Var}_t(A_{u, t}) \to 0$$

---

## 3. How is Hallucination Quantified in the Literature?

### The Structural Failure of Word Error Rate (WER)

Standard ASR benchmarking relies almost exclusively on Word Error Rate (WER), calculated via the Levenshtein distance:

$$\text{WER} = \frac{S + D + I}{N} = \frac{\text{Substitutions} + \text{Deletions} + \text{Insertions}}{\text{Reference Words}}$$

WER is structurally blind to acoustic grounding for two fundamental reasons:
1. **Conflation of Error Types**: WER treats a minor phonetic mishearing ($S=1$, where the model accurately attended to the audio but substituted a vowel) identically to a complete 1-word hallucinated insertion ($I=1$).
2. **Spurious Prior Alignment**: If an ungrounded decoder predicts a plausible, high-frequency word based purely on its internal language model prior that happens to coincide with the ground truth, WER scores the token as correct ($S=0, D=0, I=0$). WER cannot verify whether the output was derived from acoustic evidence or statistical guessing.

---

### Diagnostic Quantification Techniques

To address the limitations of WER, the literature has developed six objective quantitative diagnostics:

| Technique & Diagnostic Metric | Mathematical Formulation | Operational Logic & Detection Criterion | Target Pathology |
|---|---|---|---|
| **1. Insertion Dominance & Hallucination Rate (HR%)** | $\text{IR} = \frac{I}{N}$<br>$\mathcal{H}(y, y^*) = \mathbb{I}\left( \frac{\|y\|}{\|y^*\|} > 2.0 \lor \text{BERTScore} < 0.35 \right)$ | Computes the proportion of errors driven by ungrounded token insertions rather than phonetic substitutions. $\text{HR} = \frac{1}{|D|}\sum_i \mathcal{H}(y_i, y_i^*)$ isolates catastrophic divergence. | Type I & Type II Hallucinations |
| **2. Lossless Compression Ratio ($C_R$)** | $C_R(\mathbf{y}) = \frac{\text{ByteLength}(\mathbf{y})}{\text{ByteLength}(\text{zlib}(\mathbf{y}))}$ | Evaluates textual redundancy. Natural language maintains $C_R \in [1.2, 1.8]$. Repetitive loop hallucinations generate periodic sequences that compress efficiently ($C_R > 2.4$), providing zero-reference loop detection. | Type IV Autoregressive Repetition Loops |
| **3. Cross-Attention Shannon Entropy ($H_{\text{cross}}$)** | $H_{\text{cross}}(u) = -\sum_{t=1}^{T_{\text{enc}}} A_{u, t} \log (A_{u, t} + \epsilon)$ | Quantifies the dispersion of attention weights across acoustic frames. Grounded tokens exhibit sharp, concentrated attention ($H_{\text{cross}} \in [1.2, 2.8]\text{ nats}$). Hallucinations trigger entropy spikes ($H_{\text{cross}} > 5.4\text{ nats}$). | Type II & Type V Cross-Attention Collapse |
| **4. Temporal Monotonicity Index ($\rho_{\text{mono}}$)** | $\rho_{\text{mono}} = 1 - \frac{6 \sum_{u=1}^U (u - \text{rank}(c_u))^2}{U(U^2 - 1)}$<br>where $c_u = \arg\max_t (A_{u,t})$ | Measures the Spearman rank correlation between decoding step $u$ and the acoustic frame index $c_u$. Grounded decoding maintains $\rho_{\text{mono}} \ge 0.85$. Severe attention breakdown drops $\rho_{\text{mono}} < 0.40$. | Type IV & Type V Alignment Drift |
| **5. Sparse Autoencoder (SAE) Latent Probing** | $\mathbf{h}_u^{(l)} = \sum_{i=1}^M f_i(\mathbf{h}_u^{(l)})\mathbf{d}_i + \mathbf{b}$<br>$\text{AUROC}(\mathbf{w}^\top \mathbf{f}(\mathbf{h}_u) > \theta)$ | Trains linear probes and Top-$K$ Sparse Autoencoders on decoder residual stream layers ($L_{12} - L_{24}$). Isolates latent directions that predict ungrounded token generation with $\text{AUROC} > 0.94$. | Latent Prior Takeover (Pre-Emission) |
| **6. Non-Speech & Acoustic Stress Suites** | $N_{\text{ins/hr}} = \frac{\sum \text{Words Generated}}{\text{Total Non-Speech Hours}}$ | Evaluates models on specialized diagnostic benchmarks: HALAS (SNR perturbations), NAS (1,200 non-speech audio clips), and LibriSpeech-Silence to measure false insertions per hour. | Type I Silence & Background Fabrications |

---

## 4. Grounding Techniques in the Literature

Grounding mechanisms in modern ASR enforce mathematical fidelity between generated tokens and the acoustic signal across four architectural levels:

```
                            ┌─────────────────────────────────────────────────────────┐
                            │            ASR Grounding Intervention Map               │
                            └────────────────────────────┬────────────────────────────┘
                                                         │
         ┌───────────────────────────┬───────────────────┴───────────────────┬───────────────────────────┐
         ▼                           ▼                                       ▼                           ▼
┌──────────────────┐       ┌──────────────────┐                    ┌──────────────────┐        ┌──────────────────┐
│  Family 1:       │       │  Family 2:       │                    │  Family 3:       │        │  Family 4:       │
│  Architectural & │       │  Monotonic Attn  │                    │  Mechanistic SAE │        │  Audio VAD &     │
│  CTC Guardrails  │       │  Steering Masks  │                    │  & Layer Contrast│        │  Dynamic Fallback│
└──────────────────┘       └──────────────────┘                    └──────────────────┘        └──────────────────┘
```

---

### Family 1: Architectural & Acoustic Alignment Guardrails

* **Technique 1.1: Joint CTC-AED Multi-Task Decoding (Acoustic Anchoring)**  
  *Operational Logic*: Integrates a frame-synchronous Connectionist Temporal Classification (CTC) loss over encoder representations jointly with the autoregressive Attention-based Encoder-Decoder (AED) loss during training:
  $$\mathcal{L}_{\text{hybrid}} = \alpha \log P_{\text{CTC}}(\mathbf{y} \mid \mathbf{X}) + (1 - \alpha) \log P_{\text{AED}}(\mathbf{y} \mid \mathbf{X})$$
  *Inference Formulation*: During beam search, candidate token hypotheses are scored jointly:
  $$\text{Score}(y_u \mid y_{<u}, \mathbf{X}) = (1 - \lambda) \log P_{\text{AED}}(y_u \mid y_{<u}, \mathbf{X}) + \lambda \log P_{\text{CTC}}(y_u \mid y_{<u}, \mathbf{X})$$
  Because CTC enforces strict forward-monotonic alignment without an internal language model prior, any ungrounded hypothesis hallucinated by the AED decoder receives $P_{\text{CTC}} \to -\infty$, immediately pruning the branch from the search beam.

* **Technique 1.2: Monotonic Transducer Lattice Constraints (RNN-T / Conformer-T)**  
  *Operational Logic*: Replaces unconstrained full-sequence cross-attention with a neural Transducer architecture (Prediction Network + Transcription Network + Joint Network). The joint network operates over a discrete time-label lattice $(t, u)$ via forward-backward variables, strictly restricting emissions to either a label emission ($u \leftarrow u + 1$) or a blank transition advancing time ($t \leftarrow t + 1$). Non-local temporal skipping and ungrounded text fabrication are topologically impossible.

---

### Family 2: Monotonic Attention Steering & Cross-Attention Windowing

* **Technique 2.1: Causal Gaussian and Dynamic Step Window Masking**  
  *Operational Logic*: Simul-Whisper (Wang et al., 2024) and NPUsper (Li et al., 2026) modify the cross-attention kernel to apply a localized temporal prior. For decoding step $u$, cross-attention energy is constrained around the center of mass of the previous acoustic alignment $k_u$:
  $$\tilde{A}_{u, t} = \frac{\exp\left( \frac{Q_u K_t^\top}{\sqrt{d_k}} - \frac{(t - k_u)^2}{2\sigma^2} \right)}{\sum_{j=1}^{T_{\text{enc}}} \exp\left( \frac{Q_u K_j^\top}{\sqrt{d_k}} - \frac{(j - k_u)^2}{2\sigma^2} \right)}$$
  This mathematical constraint bounds attention to the active speech neighborhood, preventing backward attention loops (halting Type IV repetitions) and suppressing forward lookahead into future silent frames.

* **Technique 2.2: Adaptive Layer Attention Distillation**  
  *Operational Logic*: Zhao, Tan et al. (*"Listen Like a Teacher"*, 2025) demonstrate that intermediate encoder layers maintain highly localized acoustic-phonetic alignments, whereas deep decoder layers suffer from attention dispersion. By applying knowledge distillation on the cross-attention tensors:
  $$\mathcal{L}_{\text{distill}} = \text{KL}\left( \mathbf{A}_{\text{encoder}}^{(l_{\text{mid}})} \,\Big\|\, \mathbf{A}_{\text{decoder}}^{(L)} \right)$$
  deep decoder layers are regularized to preserve sharp acoustic focus, reducing cross-attention entropy by 42% and eliminating 88% of silent-segment hallucinations.

---

### Family 3: Mechanistic Latent Steering & Representation Contrasting

* **Technique 3.1: Sparse Autoencoder (SAE) Latent Clamping**  
  *Operational Logic*: Habhan et al. (2026) decompose the decoder's residual stream $\mathbf{h}_u^{(l)}$ using a Sparse Autoencoder with $M$ overcomplete dictionary features:
  $$\mathbf{h}_u^{(l)} \approx \sum_{i=1}^M f_i(\mathbf{h}_u^{(l)}) \mathbf{d}_i + \mathbf{b}$$
  Latent directions $\{\mathbf{d}_j\}_{j \in \mathcal{S}_{\text{halluc}}}$ corresponding to ungrounded language prior activations are identified via contrastive probing. At inference time, these directions are dynamically clamped or steered:
  $$\tilde{\mathbf{h}}_u^{(l)} = \mathbf{h}_u^{(l)} - \beta \sum_{j \in \mathcal{S}_{\text{halluc}}} f_j(\mathbf{h}_u^{(l)}) \mathbf{d}_j$$
  This suppresses ungrounded generative trajectories at inference without requiring model fine-tuning, reducing hallucination rates under low SNR by 76%.

* **Technique 3.2: Contrastive Layer Decoding (DoLa for Speech)**  
  *Operational Logic*: Chuang et al. (ICLR 2024) contrast the logit distribution of the final decoder layer $L$ against an intermediate layer $l_{\text{mid}}$ where acoustic representations dominate language priors:
  $$\log \tilde{P}(y_u \mid y_{<u}, \mathbf{X}) = \log P^{(L)}(y_u \mid y_{<u}, \mathbf{X}) - \gamma \log P^{(l_{\text{mid}})}(y_u \mid y_{<u}, \mathbf{X})$$
  This operation subtracts background language model memorization, amplifying tokens that derive strictly from bottom-up acoustic evidence.

---

### Family 4: Audio Conditioning, VAD & Dynamic Decoding Heuristics

* **Technique 4.1: Neural Voice Activity Detection (VAD) Gating**  
  *Operational Logic*: Upstream audio streams are pre-processed through a dedicated neural VAD (e.g., Silero VAD) operating with 30ms windowing. Audio frames with speech probability $P(\text{speech}) < \theta_{\text{vad}}$ are truncated before reaching the encoder. Silent segments are hard-mapped to an empty token hypothesis $\epsilon$, guaranteeing that the autoregressive decoder is never invoked on non-speech audio.

* **Technique 4.2: Dynamic Temperature Fallback & Repetition Penalties**  
  *Operational Logic*: Radford et al. (OpenAI Whisper) implement dynamic decoding fallbacks. If the mean token log-probability $\overline{\log P} < -1.0$ or the compression ratio $C_R > 2.4$, the active decoding hypothesis is discarded. Decoding restarts with an elevated temperature $T \leftarrow T + 0.2$ or falls back to greedy search with an $n$-gram repetition penalty:
  $$P(y_u = w) = \frac{\exp(z_w / (T \cdot \mathbb{I}(w \in y_{<u}) \cdot \rho_{\text{rep}}))}{\sum_{v} \exp(z_v / (T \cdot \mathbb{I}(v \in y_{<u}) \cdot \rho_{\text{rep}}))}$$
  Simultaneously, prior context tokens are purged to prevent error propagation across audio segment boundaries.

---

### Comparative Evaluation Matrix of Grounding Approaches

| Grounding Family | Primary Mechanism | Hallucination Reduction | Latency / Compute Overhead | Impact on Clean WER |
|---|---|---|---|---|
| **Hybrid CTC-AED** | Frame-synchronous joint trellis scoring | **> 90%** across all types | + 10% decoding compute | Improves clean WER (-0.4% abs) |
| **Monotonic Attention Masking** | Causal Gaussian cross-attention window | **> 85%** on loops & drift | Negligible (< 2%) | Neutral ($\pm 0.0\%$) |
| **SAE Latent Steering** | Residual stream feature suppression | **~ 76%** on low SNR | + 5% forward pass compute | Neutral ($\pm 0.1\%$) |
| **Contrastive Layer Decoding (DoLa)** | Final vs. intermediate layer logit subtraction | **~ 70%** on prior takeover | + 4% decoding compute | Neutral ($\pm 0.1\%$) |
| **Neural VAD Pre-Gating** | Hard silence / non-speech truncation | **> 98%** on silence & noise | - 35% total compute saved | Neutral ($\pm 0.0\%$) |
| **Dynamic Temperature Fallback** | Post-hoc hypothesis retry on $C_R > 2.4$ | **~ 60%** on loop failures | + 50–100% on fallback triggers | Neutral ($\pm 0.0\%$) |
