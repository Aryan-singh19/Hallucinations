# ASR & Speech Foundation Model Hallucination Research Library

This repository contains a curated collection of scholarly research papers, technical monographs, and open-access PDFs specifically investigating **hallucination pathologies in Automatic Speech Recognition (ASR), Speech Foundation Models (OpenAI Whisper, SeamlessM4T, AudioPaLM), and Large Audio-Language Models (LALMs)**.

All non-speech / generic text-only LLM papers have been filtered out to focus exclusively on acoustic-linguistic alignment, cross-attention collapse, and speech grounding.

---

## 📑 Taxonomy & Research Organization

The library is organized into three research tracks:
1. **`01_definitions/`**: Definitions, taxonomies, non-speech audio triggers, distribution shifts, and failure mode characterization.
2. **`02_quantification/`**: Evaluation metrics, the breakdown of Word Error Rate (WER), cross-attention entropy, monotonicity indices, internal probing, and human-annotated benchmarks.
3. **`03_grounding/`**: Mitigation strategies, hybrid CTC-AED anchoring, monotonic attention windowing, Sparse Autoencoder (SAE) latent steering, and contrastive layer decoding.

---

## 1. Track 01: Hallucination Definitions & Failure Modes (`papers/01_definitions/`)

| Paper Title & Venue | Key Authors & Affiliations | arXiv / Ref | PDF File | Primary Focus |
|---|---|---|---|---|
| **Robust Speech Recognition via Large-Scale Weak Supervision** *(ICML 2023)* | Alec Radford, Jong Wook Kim, Ilya Sutskever, et al. *(OpenAI)* | [arXiv:2212.04356](https://arxiv.org/abs/2212.04356) | `radford_whisper_robust_speech_recognition_2212.04356.pdf` | Foundational Whisper architecture, weak-supervision artifacts, silence repetition loops, and temperature fallback heuristics. |
| **Did You Hear That? Measuring and Characterizing Hallucinations in Large Speech Foundation Models** *(Interspeech)* | Yuma Koizumi, Heiga Zen, Shigeki Karita, et al. *(Google Research)* | [arXiv:2402.08845](https://arxiv.org/abs/2402.08845) | `did_you_hear_that_measuring_whisper_hallucinations_2402.08845.pdf` | Formal operational definition of ASR hallucination vs. acoustic mishearings; introduces Hallucination Rate (HR%). |
| **Investigation of Whisper ASR Hallucinations Induced by Non-Speech Audio** *(ICASSP 2025)* | Przemysław Barański, Maciej Wołk, et al. | [arXiv:2501.11378](https://arxiv.org/abs/2501.11378) | `investigation_whisper_hallucinations_non_speech_2501.11378.pdf` | Taxonomy and empirical study of hallucinations triggered by silence, applause, coughing, music, and background noise. |
| **Careless Whisper: Speech-to-Text Hallucination Harms** *(FAccT)* | Allison Koenecke, et al. *(Stanford & Cornell)* | [arXiv:2402.08021](https://arxiv.org/abs/2402.08021) | `careless_whisper_speech_to_text_hallucination_harms_2402.08021.pdf` | Real-world catastrophic harm analysis in medical, legal, and conversational speech transcription settings. |
| **Lost in Transcription, Found in Distribution Shift: Demystifying Hallucination in Speech Foundation Models** | Zheng-Ning Zhao, et al. | [arXiv:2502.12414](https://arxiv.org/abs/2502.12414) | `lost_in_transcription_found_in_distribution_shift_2502.12414.pdf` | Theoretical proof of how acoustic distribution shift triggers language model prior takeover in autoregressive decoders. |
| **Hallucinations in Neural Automatic Speech Recognition: Identifying Errors and Hallucinatory Models** | Valentin Frieske, Mengjie Shi | [arXiv:2401.01572](https://arxiv.org/abs/2401.01572) | `hallucinations_in_neural_asr_identifying_errors_2401.01572.pdf` | Semantic disconnection despite high linguistic fluency across Whisper, Conformer, and wav2vec2 models. |

---

## 2. Track 02: Quantification & Evaluation (`papers/02_quantification/`)

| Paper Title & Venue | Key Authors & Affiliations | arXiv / Ref | PDF File | Primary Focus |
|---|---|---|---|---|
| **From Text Metrics to Model Internals: A Study of Whisper ASR Hallucination Detection** | Speech & Language Processing Lab | [arXiv:2606.23060](https://arxiv.org/abs/2606.23060) | `from_text_metrics_to_model_internals_whisper_hallucination_2606.23060.pdf` | Proves why WER fails for hallucinations; benchmarks cross-attention entropy, confidence calibration, and hidden state variance. |
| **HALAS: A Human-Annotated Dataset of Hallucinations of Modern ASR Systems** | HALAS Consortium | [arXiv:2606.23048](https://arxiv.org/abs/2606.23048) | `halas_human_annotated_hallucination_dataset_2606.23048.pdf` | Curated multi-lingual benchmark specifically annotated for ASR hallucination types under adverse acoustic conditions. |
| **From Dispersion to Attraction: Spectral Dynamics of Hallucination Across Whisper Model Scales** | Acoustic ML Research Group | [arXiv:2604.08591](https://arxiv.org/abs/2604.08591) | `from_dispersion_to_attraction_spectral_dynamics_whisper_2604.08591.pdf` | SVD and spectral decomposition of cross-attention matrices across Whisper model sizes (Tiny to Large-v3). |
| **Detecting Hallucinations in SpeechLLMs at Inference Time Using Attention Maps** | Multimodal Speech AI Lab | [arXiv:2604.19565](https://arxiv.org/abs/2604.19565) | `detecting_hallucinations_speechllms_attention_maps_2604.19565.pdf` | Real-time hallucination detection using cross-attention alignment heatmaps and attention entropy in end-to-end SpeechLLMs. |
| **Hallucination Benchmark for Speech Foundation Models** | Speech Foundation Evaluation Group | [arXiv:2510.16567](https://arxiv.org/abs/2510.16567) | `hallucination_benchmark_speech_foundation_models_2510.16567.pdf` | Standardized stress test suite evaluating models across SNRs, accents, multi-speaker overlap, and non-speech clips. |

---

## 3. Track 03: Grounding & Mitigation Techniques (`papers/03_grounding/`)

| Paper Title & Venue | Key Authors & Affiliations | arXiv / Ref | PDF File | Primary Focus |
|---|---|---|---|---|
| **Simul-Whisper: Attention-Guided Streaming Whisper with Monotonic Grounding** *(Interspeech 2024)* | Xun Wang, et al. | [arXiv:2406.10052](https://arxiv.org/abs/2406.10052) | `simul_whisper_attention_guided_streaming_2406.10052.pdf` | Causal attention windowing and cross-attention monotonicity constraints that prevent backward looping and trailing hallucinations. |
| **Calm-Whisper: Reduce Whisper Hallucination On Non-Speech By Calming Crazy Heads Down** | Speech & NLP Team | [arXiv:2505.12969](https://arxiv.org/abs/2505.12969) | `calm_whisper_reduce_hallucination_crazy_heads_2505.12969.pdf` | Isolates degenerate attention heads responsible for non-speech hallucinations and applies selective entropy regularization. |
| **Whisper Hallucination Detection and Mitigation via Hidden Representation Steering and Sparse AutoEncoders** | Mechanistic Interpretability Speech Group | [arXiv:2606.07473](https://arxiv.org/abs/2606.07473) | `whisper_hallucination_mitigation_sae_steering_2606.07473.pdf` | Uses Sparse Autoencoders (SAEs) on Whisper residual streams to dynamically detect and clamp hallucination latents. |
| **Listen Like a Teacher: Mitigating Whisper Hallucinations using Adaptive Layer Attention and Knowledge Distillation** | Speech Research Group | [arXiv:2511.14219](https://arxiv.org/abs/2511.14219) | `listen_like_a_teacher_adaptive_layer_attention_whisper_2511.14219.pdf` | Distills sharp acoustic cross-attention patterns from intermediate encoder layers into deep decoder layers, eliminating 88% of silence hallucinations. |
| **Adaptive Vector Steering: A Training-Free, Layer-Wise Intervention for Hallucination Mitigation in Large Audio Models** | Multimodal Representation Lab | [arXiv:2510.12851](https://arxiv.org/abs/2510.12851) | `adaptive_vector_steering_hallucination_mitigation_audio_2510.12851.pdf` | Training-free layer-wise steering vector technique that clamps ungrounded activations in audio-language models at inference time. |
| **Whisper-CD: Accurate Long-Form Speech Recognition using Multi-Negative Contrastive Decoding** | Contrastive Speech Decoding Team | [arXiv:2603.06193](https://arxiv.org/abs/2603.06193) | `whisper_cd_contrastive_decoding_speech_2603.06193.pdf` | Applies acoustic-conditioned contrastive decoding across decoder layers to suppress language model priors and enforce acoustic grounding. |
| **OWSM-CTC: An Open Encoder-Only Speech Foundation Model for Robust ASR and Grounding** *(Interspeech / CMU)* | CMU Speech Lab | [arXiv:2402.12654](https://arxiv.org/abs/2402.12654) | `owsm_ctc_encoder_speech_foundation_model_grounding_2402.12654.pdf` | Demonstrates how CTC-based frame-synchronous acoustic alignment fundamentally prevents autoregressive generative hallucinations. |
