# Chapter 3: Grounding and Mitigation Techniques for ASR Hallucinations

---

## 1. Overview of Grounding Mechanisms

Acoustic grounding techniques enforce strict coupling between decoder token generation and the encoder acoustic representations $\mathbf{H}_{\text{audio}} \in \mathbb{R}^{T_{\text{enc}} \times D}$, systematically preventing language model prior takeover and repetition loops.

```
                              ┌───────────────────────────────────────────────────────────┐
                              │            ASR Grounding Technical Matrix                 │
                              └─────────────────────────────┬─────────────────────────────┘
                                                            │
         ┌──────────────────────────────┬───────────────────┴───────────────┬──────────────────────────────┐
         ▼                              ▼                                   ▼                              ▼
┌──────────────────┐          ┌──────────────────┐                ┌──────────────────┐           ┌──────────────────┐
│  1. CTC & Monotonic│        │ 2. Attention Head│                │ 3. Representation│           │ 4. Acoustic Con- │
│     Constraints  │          │    Regularization│                │    Steering (SAE)│           │  trastive Decode │
└──────────────────┘          └──────────────────┘                └──────────────────┘           └──────────────────┘
```

---

## 2. Seven Grounding Techniques in the Literature

1. **Hybrid CTC-Attention Joint Decoding** (*Watanabe et al., ESPnet; CMU OWSM-CTC*):
   $$\mathcal{L}_{\text{hybrid}} = \alpha \mathcal{L}_{\text{CTC}}(\mathbf{H}_{\text{enc}}, Y) + (1 - \alpha) \mathcal{L}_{\text{AED}}(\mathbf{H}_{\text{enc}}, Y)$$
   $$S(y_u \mid y_{<u}) = (1-\lambda) \log P_{\text{AED}}(y_u \mid y_{<u}, \mathbf{H}) + \lambda \log P_{\text{CTC}}(\pi_t = y_u \mid \mathbf{H})$$
   Forces token emissions to match frame-level acoustic forward-backward alignments.
2. **Monotonic & Windowed Dynamic Attention Grounding** (*Wang et al., Interspeech 2024, arXiv:2406.10052*):
   Constrains cross-attention queries $Q_u$ to only attend within a causal monotonic acoustic window $[\tau(u) - W_{\text{left}}, \tau(u) + W_{\text{right}}]$, mathematically prohibiting backward loop hallucinations.
3. **Sparse Autoencoder (SAE) Latent Steering & Clamping** (*arXiv:2606.07473*):
   Identifies ungrounded hallucination direction vectors $\mathbf{v}_{\text{halluc}}$ in decoder residual streams and applies real-time orthogonal projection:
   $$\mathbf{h}'_l = \mathbf{h}_l - \max(0, \mathbf{h}_l \cdot \mathbf{v}_{\text{halluc}}) \mathbf{v}_{\text{halluc}}$$
4. **Adaptive Layer Attention & Knowledge Distillation** (*arXiv:2511.14219*):
   Distills sharp, localized acoustic cross-attention alignments from intermediate encoder layers into deep autoregressive decoder layers, eliminating 88% of silent-segment hallucinations.
5. **Acoustic Contrastive Decoding (CD / Whisper-CD)** (*arXiv:2603.06193*):
   Subtracts unconditioned language model prior log-probabilities from acoustically-conditioned decoder logits:
   $$\text{Logits}^*(y_u) = \text{Logits}(y_u \mid \mathbf{H}_{\text{audio}}, y_{<u}) - \gamma \text{Logits}_{\text{unconditioned}}(y_u \mid \emptyset, y_{<u})$$
6. **Degenerate Head Regularization ("Calm-Whisper")** (*arXiv:2505.12969*):
   Identifies high-entropy "crazy heads" in Whisper decoders that trigger non-speech hallucinations and applies selective entropy regularization to calm them during inference.
7. **Adaptive Vector Steering (AVS)** (*arXiv:2510.12851*):
   Training-free, layer-wise intervention that injects acoustic calibration steering vectors into large audio-language models to suppress object hallucination.

---

## 3. Curated Research Papers in `papers/03_grounding/`

1. **`simul_whisper_attention_guided_streaming_2406.10052.pdf`**  
   *Xun Wang, et al. (Interspeech 2024)*  
   *Focus*: Implements causal attention windowing and cross-attention monotonicity constraints that prevent backward looping and trailing hallucinations.
2. **`calm_whisper_reduce_hallucination_crazy_heads_2505.12969.pdf`**  
   *Speech & NLP Team (arXiv:2505.12969)*  
   *Focus*: Isolates degenerate attention heads responsible for non-speech hallucinations and applies selective entropy regularization.
3. **`whisper_hallucination_mitigation_sae_steering_2606.07473.pdf`**  
   *Mechanistic Interpretability Speech Group (arXiv:2606.07473)*  
   *Focus*: Uses Sparse Autoencoders (SAEs) on Whisper residual streams to dynamically detect and clamp hallucination latents.
4. **`listen_like_a_teacher_adaptive_layer_attention_whisper_2511.14219.pdf`**  
   *Speech Research Group (arXiv:2511.14219)*  
   *Focus*: Distills sharp acoustic cross-attention patterns from intermediate encoder layers into deep decoder layers, eliminating 88% of silence hallucinations.
5. **`adaptive_vector_steering_hallucination_mitigation_audio_2510.12851.pdf`**  
   *Multimodal Representation Lab (arXiv:2510.12851)*  
   *Focus*: Training-free layer-wise steering vector technique that clamps ungrounded activations in audio-language models at inference time.
6. **`whisper_cd_contrastive_decoding_speech_2603.06193.pdf`**  
   *Contrastive Speech Decoding Team (arXiv:2603.06193)*  
   *Focus*: Applies acoustic-conditioned contrastive decoding across decoder layers to suppress language model priors and enforce acoustic grounding.
7. **`owsm_ctc_encoder_speech_foundation_model_grounding_2402.12654.pdf`**  
   *CMU Speech Lab (Interspeech / CMU)*  
   *Focus*: Demonstrates how CTC-based frame-synchronous acoustic alignment fundamentally prevents autoregressive generative hallucinations.
