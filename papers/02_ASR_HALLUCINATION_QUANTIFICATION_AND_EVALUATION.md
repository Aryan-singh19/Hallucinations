# Chapter 2: Quantification, Metrics, and Evaluation of ASR Hallucinations

---

## 1. The Structural Failure of Word Error Rate (WER)

Standard Automatic Speech Recognition evaluation relies almost exclusively on Word Error Rate (WER):

$$\text{WER} = \frac{S + D + I}{N} = \frac{\text{Substitutions} + \text{Deletions} + \text{Insertions}}{\text{Reference Length}}$$

WER is fundamentally inadequate for diagnosing hallucinations due to two structural flaws:
1. **Error Conflation**: Treats minor acoustic mishearings ($S=1$, phonetic substitution) identically to ungrounded fabrications ($I=1$).
2. **Accidental Grounding Reward**: If an ungrounded language model prior predicts high-frequency words that happen to coincide with reference text, WER scores them as accurate without verifying acoustic evidence.

---

## 2. Six Quantitative Diagnostic Techniques in the Literature

```
                                  ┌───────────────────────────────────────────────┐
                                  │       ASR Hallucination Metric Hierarchy      │
                                  └──────────────────────┬────────────────────────┘
                                                         │
               ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
               ▼                                         ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐                 ┌───────────────────────┐
   │   1. Textual Metrics  │                 │ 2. Internal Probing   │                 │ 3. Stress Benchmarks  │
   │  - Hallucination Rate │                 │  - Cross-Attn Entropy │                 │  - HALAS Benchmark    │
   │  - Compression Ratio  │                 │  - Monotonicity Index │                 │  - Non-Speech Splits  │
   │  - Insertion Dominance│                 │  - SAE Feature Probes │                 │  - Silence Suites     │
   └───────────────────────┘                 └───────────────────────┘                 └───────────────────────┘
```

1. **Insertion Dominance ($\text{IR} = I/N$) & Hallucination Rate (HR%)** (*Koizumi et al., 2024*):
   $$\mathcal{H}(y, y^*) = \mathbb{I}\left( \frac{\text{Length}(y)}{\text{Length}(y^*)} > 2.0 \quad \lor \quad \text{BERTScore}(y, y^*) < 0.35 \right)$$
   $$\text{HR} = \frac{1}{|D|} \sum_{i=1}^{|D|} \mathcal{H}(y_i, y_i^*) \times 100\%$$
2. **Lossless Compression Ratio ($C_R$)** (*Radford et al., 2023*):
   $$C_R(y) = \frac{\text{ByteLength}(y)}{\text{ByteLength}(\text{zlib}(y))}$$
   Detects repetitive loop hallucinations without ground truth references ($C_R > 2.4$).
3. **Cross-Attention Shannon Entropy ($H_{\text{cross}}$)**:
   $$H_{\text{cross}}(u) = -\sum_{t=1}^{T_{\text{enc}}} A_{u, t} \log (A_{u, t} + \epsilon)$$
   Grounded tokens maintain sharp attention ($1.2–2.8\text{ nats}$); hallucinations trigger entropy spikes ($>5.4\text{ nats}$).
4. **Temporal Monotonicity Index ($\rho_{\text{mono}}$)**:
   $$\rho_{\text{mono}} = 1 - \frac{6 \sum_{u=1}^U (u - \text{rank}(c_u))^2}{U(U^2 - 1)}, \quad c_u = \arg\max_t (A_{u,t})$$
   Monitors Spearman rank correlation between output token step and peak acoustic alignment.
5. **Sparse Autoencoder (SAE) Residual Stream Probing** (*arXiv:2606.07473*):
   Linear probes and Top-$K$ SAEs on decoder residual layers ($L_{12}-L_{24}$) isolate distinct latent directions predicting ungrounded tokens with **AUROC > 0.94** before token emission.
6. **Non-Speech & Acoustic Stress Suites**:
   Evaluating false word insertions per hour of non-speech audio ($N_{\text{ins/hr}}$) across HALAS, NAS, and LibriSpeech-Silence suites.

---

## 3. Curated Research Papers in `papers/02_quantification/`

1. **`from_text_metrics_to_model_internals_whisper_hallucination_2606.23060.pdf`**  
   *Speech & Language Processing Lab (arXiv:2606.23060)*  
   *Focus*: Proves why WER fails for hallucinations; benchmarks cross-attention entropy, confidence calibration, and hidden state variance.
2. **`halas_human_annotated_hallucination_dataset_2606.23048.pdf`**  
   *HALAS Consortium (arXiv:2606.23048)*  
   *Focus*: Curated multi-lingual benchmark specifically annotated for ASR hallucination types under adverse acoustic conditions.
3. **`from_dispersion_to_attraction_spectral_dynamics_whisper_2604.08591.pdf`**  
   *Acoustic ML Research Group (arXiv:2604.08591)*  
   *Focus*: SVD and spectral decomposition of cross-attention matrices across Whisper model sizes (Tiny to Large-v3).
4. **`detecting_hallucinations_speechllms_attention_maps_2604.19565.pdf`**  
   *Multimodal Speech AI Lab (arXiv:2604.19565)*  
   *Focus*: Real-time hallucination detection using cross-attention alignment heatmaps and attention entropy in end-to-end SpeechLLMs.
5. **`hallucination_benchmark_speech_foundation_models_2510.16567.pdf`**  
   *Speech Foundation Evaluation Group (arXiv:2510.16567)*  
   *Focus*: Standardized stress test suite evaluating models across SNRs, accents, multi-speaker overlap, and non-speech clips.
