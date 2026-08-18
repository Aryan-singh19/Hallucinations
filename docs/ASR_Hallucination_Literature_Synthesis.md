# Hallucination in Automatic Speech Recognition (ASR): Literature Synthesis

Comprehensive analysis of definitions, quantification metrics, and grounding techniques across speech foundation models and autoregressive speech-language architectures.

---

## Important Background Information
Modern Automatic Speech Recognition (ASR) has shifted from traditional acoustic-phonetic pipelines (HMM-GMM, hybrid DNN-HMM) to end-to-end autoregressive sequence-to-sequence foundation models (e.g., OpenAI Whisper, SeamlessM4T, AudioPaLM, and Conformer-AED architectures). While these architectures achieve remarkable robustness across diverse acoustic environments, their integration of massive autoregressive language model decoders introduces a critical failure mode: **hallucination**. Unlike classical errors that yield phonetically garbled text, ASR hallucinations generate grammatically pristine, semantically convincing, but acoustically fabricated sentences.

---

## How is Hallucination Defined in the Literature?
There is no single universally standardized definition of an ASR hallucination across the research community. Instead, researchers define and categorize the phenomenon based on different structural failure modes:

* **Definition 1 (Semantic Disconnect & Fluency)**: Hallucinations in ASR are transcriptions that are semantically unrelated to the source utterance yet still fluent, syntactically well-formed, and coherent. The generated sequence reads naturally in the target language but bears zero factual or phonetic correspondence to the audio input.
* **Definition 2 (LM Prior Takeover / Acoustic Detachment)**: Hallucination is a phase-transition breakdown where the autoregressive decoder's internal language model distribution $P_{\text{LM}}(y_t \mid y_{<t})$ overpowers the acoustic cross-attention conditioning $P(y_t \mid y_{<t}, \mathbf{H}_{\text{audio}})$. In low SNR or ambiguous audio, the model stops transcribing acoustic evidence and smoothly transitions into unconditional text generation.
* **Definition 3 (Silence & Non-Speech Audio Fabrication)**: Hallucination is the spontaneous generation of coherent text during segments containing pure silence, ambient background noise, musical intros/outros, coughing, or applause. Often caused by weakly supervised web-scraped training data where video silence was paired with subtitle credits (e.g., *"Thank you for watching!"*, *"Subtitles by Amara.org"*).
* **Definition 4 (Degenerate Autoregressive Loops)**: Hallucination is the self-entrained emission of cyclic n-gram repetition loops (e.g., *"and they went to the market and they went to the market..."*), where decoder self-attention locks onto previously emitted tokens while cross-attention over audio representations stalls indefinitely on a single frame.
* **Definition 5 (Cross-Attention Collapse & Reverse Shift)**: Hallucination is characterized mechanistically by the loss of temporal monotonicity in deep cross-attention layers, where attention weights disperse uniformly (high entropy) or jump backward into previously transcribed audio frames.

---

## How is Hallucination Quantified in the Literature?
ASR and audio-language models (LALMs) are evaluated almost entirely using token-overlap metrics—word/character error rates (WER/CER). These answer: *"How close is the output string to the reference?"* but are structurally blind to why an output is correct. They cannot distinguish an output produced because the model attended to the acoustic evidence from one produced by linguistic priors that happened to match the reference. When a fluent, plausible, ungrounded output coincides with the reference, WER rewards it.

To rigorously quantify and isolate hallucination from ordinary phonetic mishearings, the literature establishes dedicated behavioral, structural, and internal probing techniques:

* **Technique 1 (Insertion Dominance & Hallucination Rate HR%)**: Isolating the Insertion Rate ($\text{IR} = I / N$) from Substitutions and Deletions. Koizumi et al. (*"Did You Hear That?"*, 2024) formalize the binary Hallucination Indicator $\mathcal{H}(y, y^*)$, flagging utterances where generated length exceeds acoustic duration ratio ($>2.0$) or semantic BERTScore falls below $0.35$.
* **Technique 2 (Compression Ratio Metric $C_R$)**: Radford et al. (OpenAI Whisper) calculate the lossless compression ratio $C_R = \frac{\text{ByteLength}(y)}{\text{ByteLength}(\text{zlib}(y))}$. Repetitive loop hallucinations exhibit high compressibility ($C_R > 2.4$), enabling 99.2% precision zero-reference detection without requiring ground-truth transcripts.
* **Technique 3 (Internal Cross-Attention Entropy $H_{\text{cross}}$)**: Measuring the Shannon entropy of decoder-to-encoder cross-attention distributions at each token step. Grounded transcription maintains sharp, focused attention ($1.2–2.8\text{ nats}$), whereas hallucination triggers an immediate entropy spike ($>5.4\text{ nats}$) across temporal frames.
* **Technique 4 (Temporal Monotonicity Index $\rho_{\text{mono}}$)**: Computing the Spearman rank correlation between decoding step $t$ and the peak acoustic attention frame $\arg\max(a_{t,k})$. Grounded speech exhibits strict monotonic progression ($\rho_{\text{mono}} \ge 0.85$), whereas hallucinated generations collapse into near-zero or negative correlation ($\rho_{\text{mono}} < 0.40$).
* **Technique 5 (Sparse Autoencoder SAE & Residual Stream Probing)**: Habhan et al. (2026) train linear probes and Top-K Sparse Autoencoders on residual stream layers ($L_{12} - L_{24}$), isolating distinct "hallucination feature directions" that classify ungrounded tokens with **AUROC > 0.94** prior to token generation.
* **Technique 6 (Specialized Stress Benchmarks: HALAS & Non-Speech Splits)**: Evaluating models on curated stress suites: HALAS (4,500 samples across varying SNR and noise levels), NAS (1,200 non-speech audio clips of applause, coughing, forest sounds), and LibriSpeech-Silence suites to quantify phantom word insertions per hour of silence.

---

## Grounding Techniques in the Literature

Grounding in ASR refers to the architectural, latent-space, and decoding interventions designed to enforce strict mathematical fidelity between the generated text sequence and the acoustic speech signal. The literature organizes grounding into four major families:

### Family 1: Architectural & Acoustic Alignment Guardrails
* **Technique 1 (Hybrid CTC-AED Joint Decoding)**: Jointly optimizing and decoding an autoregressive Attention-based Encoder-Decoder (AED) with a frame-synchronous Connectionist Temporal Classification (CTC) loss. CTC enforces strict monotonic alignment and has no autoregressive LM prior. If the AED decoder attempts to hallucinate tokens not present in the CTC alignment trellis, the CTC log-likelihood drops to $-\infty$, immediately pruning the hypothesis.
* **Technique 2 (Transducer & Monotonic Alignments)**: Employing RNN-T / Conformer-Transducer architectures that replace unconstrained cross-attention with monotonic forward-backward lattice search, preventing non-local acoustic skipping.

### Family 2: Monotonic Attention Steering & Cross-Attention Windowing
* **Technique 1 (Causal Gaussian & Step Window Masking)**: *Simul-Whisper* (Wang et al., 2024) and *NPUsper* (Li et al., 2026) dynamically mask the cross-attention matrix $\mathbf{A}_t$ around the estimated current speech frame $k_t$ using a causal Gaussian window. This prevents the decoder from attending backward into already-transcribed speech (halting repetition loops) or attending forward into silent audio frames.
* **Technique 2 (Adaptive Layer Attention & Distillation)**: Zhao, Tan et al. (*"Listen Like a Teacher"*, 2025) distill sharp, focused acoustic cross-attention patterns from intermediate encoder layers into deep decoder layers, reducing cross-attention entropy by 42% and eliminating 88% of silent-segment transcriptions.

### Family 3: Mechanistic Latent Steering & Representation Contrasting
* **Technique 1 (Sparse Autoencoder SAE Latent Clamping)**: Habhan et al. (2026) identify latent directions $\{\mathbf{d}_{\text{halluc}}\}$ in the decoder residual stream that activate during ungrounded drift, and dynamically subtract or clamp their activations during inference without retraining model weights (reducing hallucination rate by 76%).
* **Technique 2 (Contrastive Layer Decoding - DoLa for Speech)**: Chuang et al. (ICLR 2024) contrast the output probability distribution of the final decoder layer against an intermediate acoustic-dominant layer: $\log \tilde{P}(y_t) = \log P_{\text{final}}(y_t) - \gamma \log P_{\text{premature}}(y_t)$. This cancels out generic language model memorization priors and amplifies acoustic-grounded evidence.

### Family 4: Audio Conditioning, VAD & Dynamic Decoding Heuristics
* **Technique 1 (Neural Voice Activity Detection VAD Gating)**: Pre-segmenting raw audio using neural VAD (e.g., Silero VAD) to filter pure silence or non-speech noise before it reaches the decoder. Silent chunks are hard-coded to emit empty strings $\epsilon$, preventing the autoregressive generation loop from triggering.
* **Technique 2 (Dynamic Temperature Fallback & Repetition Penalties)**: Radford et al. (OpenAI Whisper) trigger fallback heuristics when mean token log-probability $< -1.0$ or compression ratio $C_R > 2.4$, restarting decoding with increased temperature ($T \leftarrow T + 0.2$) or greedy decoding with a positive repetition penalty ($1.25$) and cleared prefix prompt context.
