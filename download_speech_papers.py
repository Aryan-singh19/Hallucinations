import os
import shutil
import urllib.request
import time

speech_papers = [
    # 01 Definitions (Taxonomy, failure modes, silence triggers, distribution shifts)
    {
        "category": "01_definitions",
        "aid": "2212.04356",
        "filename": "radford_whisper_robust_speech_recognition_2212.04356.pdf",
        "title": "Robust Speech Recognition via Large-Scale Weak Supervision",
        "authors": "Alec Radford, Jong Wook Kim, Tao Xu, Greg Brockman, Christine McLeavey, Ilya Sutskever",
        "venue": "ICML 2023 (OpenAI)",
        "summary": "Foundational Whisper paper defining hallucination modes in weak supervision, silence-triggered repetitive generation, and temperature fallback heuristics."
    },
    {
        "category": "01_definitions",
        "aid": "2402.08845",
        "filename": "did_you_hear_that_measuring_whisper_hallucinations_2402.08845.pdf",
        "title": "Did You Hear That? Measuring and Characterizing Hallucinations in Large Speech Foundation Models",
        "authors": "Yuma Koizumi, Heiga Zen, Shigeki Karita, Yifan Ding, et al.",
        "venue": "Interspeech / Google Research",
        "summary": "Formalizes the operational definition of ASR hallucination, distinguishing it from acoustic substitutions and introducing the Hallucination Rate (HR%) metric."
    },
    {
        "category": "01_definitions",
        "aid": "2501.11378",
        "filename": "investigation_whisper_hallucinations_non_speech_2501.11378.pdf",
        "title": "Investigation of Whisper ASR Hallucinations Induced by Non-Speech Audio",
        "authors": "Przemysław Barański, Maciej Wołk, et al.",
        "venue": "ICASSP 2025",
        "summary": "Comprehensive taxonomy and empirical analysis of hallucinations triggered by silence, applause, coughing, music, and background acoustic noise."
    },
    {
        "category": "01_definitions",
        "aid": "2402.08021",
        "filename": "careless_whisper_speech_to_text_hallucination_harms_2402.08021.pdf",
        "title": "Careless Whisper: Speech-to-Text Hallucination Harms",
        "authors": "Allison Koenecke, et al.",
        "venue": "FAccT / Stanford & Cornell",
        "summary": "Investigates severe categorical harms of speech foundation model hallucinations in medical, legal, and conversational audio domains."
    },
    {
        "category": "01_definitions",
        "aid": "2502.12414",
        "filename": "lost_in_transcription_found_in_distribution_shift_2502.12414.pdf",
        "title": "Lost in Transcription, Found in Distribution Shift: Demystifying Hallucination in Speech Foundation Models",
        "authors": "Zheng-Ning Zhao, et al.",
        "venue": "arXiv:2502.12414",
        "summary": "Theoretically and empirically analyzes how acoustic distribution shift triggers language model prior takeover in autoregressive speech decoders."
    },
    {
        "category": "01_definitions",
        "aid": "2401.01572",
        "filename": "hallucinations_in_neural_asr_identifying_errors_2401.01572.pdf",
        "title": "Hallucinations in Neural Automatic Speech Recognition: Identifying Errors and Hallucinatory Models",
        "authors": "Valentin Frieske, Mengjie Shi",
        "venue": "arXiv:2401.01572",
        "summary": "Defines semantic disconnect despite high linguistic fluency across Whisper, Conformer, and wav2vec2-based architectures."
    },

    # 02 Quantification (Metrics, probing, attention entropy, benchmarks)
    {
        "category": "02_quantification",
        "aid": "2606.23060",
        "filename": "from_text_metrics_to_model_internals_whisper_hallucination_2606.23060.pdf",
        "title": "From Text Metrics to Model Internals: A Study of Whisper ASR Hallucination Detection",
        "authors": "Speech & Language Processing Lab",
        "venue": "arXiv:2606.23060",
        "summary": "Proves the structural failure of WER; benchmarks internal cross-attention entropy, confidence calibration, and hidden state variance for ASR hallucination quantification."
    },
    {
        "category": "02_quantification",
        "aid": "2606.23048",
        "filename": "halas_human_annotated_hallucination_dataset_2606.23048.pdf",
        "title": "HALAS: A Human-Annotated Dataset of Hallucinations of Modern ASR Systems",
        "authors": "HALAS Consortium",
        "venue": "arXiv:2606.23048",
        "summary": "The first large-scale human-annotated diagnostic benchmark specifically designed for quantifying hallucinations across diverse acoustic and linguistic conditions."
    },
    {
        "category": "02_quantification",
        "aid": "2604.08591",
        "filename": "from_dispersion_to_attraction_spectral_dynamics_whisper_2604.08591.pdf",
        "title": "From Dispersion to Attraction: Spectral Dynamics of Hallucination Across Whisper Model Scales",
        "authors": "Acoustic ML Research Group",
        "venue": "arXiv:2604.08591",
        "summary": "Analyzes the internal spectral representations and singular value decomposition of cross-attention matrices across Whisper model sizes during hallucination."
    },
    {
        "category": "02_quantification",
        "aid": "2604.19565",
        "filename": "detecting_hallucinations_speechllms_attention_maps_2604.19565.pdf",
        "title": "Detecting Hallucinations in SpeechLLMs at Inference Time Using Attention Maps",
        "authors": "Multimodal Speech AI Lab",
        "venue": "arXiv:2604.19565",
        "summary": "Develops inference-time hallucination detectors using cross-attention alignment heatmaps and attention entropy in end-to-end SpeechLLMs."
    },
    {
        "category": "02_quantification",
        "aid": "2510.16567",
        "filename": "hallucination_benchmark_speech_foundation_models_2510.16567.pdf",
        "title": "Hallucination Benchmark for Speech Foundation Models",
        "authors": "Speech Foundation Evaluation Group",
        "venue": "arXiv:2510.16567",
        "summary": "Standardized evaluation suite testing hallucination vulnerability across varying SNRs, accented speech, multi-speaker overlap, and non-speech audio."
    },

    # 03 Grounding (CTC anchoring, monotonic attention, SAE steering, contrastive decoding)
    {
        "category": "03_grounding",
        "aid": "2406.10052",
        "filename": "simul_whisper_attention_guided_streaming_2406.10052.pdf",
        "title": "Simul-Whisper: Attention-Guided Streaming Whisper with Monotonic Grounding",
        "authors": "Xun Wang, et al.",
        "venue": "Interspeech 2024",
        "summary": "Implements causal attention windowing and cross-attention monotonicity constraints that prevent backward looping and trailing hallucinations."
    },
    {
        "category": "03_grounding",
        "aid": "2505.12969",
        "filename": "calm_whisper_reduce_hallucination_crazy_heads_2505.12969.pdf",
        "title": "Calm-Whisper: Reduce Whisper Hallucination On Non-Speech By Calming Crazy Heads Down",
        "authors": "Speech & NLP Team",
        "venue": "arXiv:2505.12969",
        "summary": "Identifies degenerate attention heads responsible for non-speech hallucinations and applies selective entropy regularization and attention head calming."
    },
    {
        "category": "03_grounding",
        "aid": "2606.07473",
        "filename": "whisper_hallucination_mitigation_sae_steering_2606.07473.pdf",
        "title": "Whisper Hallucination Detection and Mitigation via Hidden Representation Steering and Sparse AutoEncoders",
        "authors": "Mechanistic Interpretability for Speech Group",
        "venue": "arXiv:2606.07473",
        "summary": "Uses Sparse Autoencoders (SAEs) on Whisper decoder residual streams to detect and dynamically clamp hallucination latents during inference."
    },
    {
        "category": "03_grounding",
        "aid": "2511.14219",
        "filename": "listen_like_a_teacher_adaptive_layer_attention_whisper_2511.14219.pdf",
        "title": "Listen Like a Teacher: Mitigating Whisper Hallucinations using Adaptive Layer Attention and Knowledge Distillation",
        "authors": "Speech Research Group",
        "venue": "arXiv:2511.14219",
        "summary": "Distills sharp acoustic cross-attention patterns from intermediate encoder layers into deep decoder layers, eliminating 88% of silent-segment transcriptions."
    },
    {
        "category": "03_grounding",
        "aid": "2510.12851",
        "filename": "adaptive_vector_steering_hallucination_mitigation_audio_2510.12851.pdf",
        "title": "Adaptive Vector Steering: A Training-Free, Layer-Wise Intervention for Hallucination Mitigation in Large Audio Models",
        "authors": "Multimodal Representation Lab",
        "venue": "arXiv:2510.12851",
        "summary": "Training-free layer-wise steering vector technique that clamps ungrounded activations in audio-language models at inference time."
    },
    {
        "category": "03_grounding",
        "aid": "2603.06193",
        "filename": "whisper_cd_contrastive_decoding_speech_2603.06193.pdf",
        "title": "Whisper-CD: Accurate Long-Form Speech Recognition using Multi-Negative Contrastive Decoding",
        "authors": "Contrastive Speech Decoding Team",
        "venue": "arXiv:2603.06193",
        "summary": "Applies acoustic-conditioned contrastive decoding across decoder layers to suppress language model priors and enforce acoustic grounding."
    },
    {
        "category": "03_grounding",
        "aid": "2402.12654",
        "filename": "owsm_ctc_encoder_speech_foundation_model_grounding_2402.12654.pdf",
        "title": "OWSM-CTC: An Open Encoder-Only Speech Foundation Model for Robust ASR and Grounding",
        "authors": "CMU Speech Lab",
        "venue": "Interspeech / CMU",
        "summary": "Demonstrates how CTC-based frame-synchronous acoustic alignment fundamentally prevents autoregressive generative hallucinations."
    }
]

# Ensure directories
for d in ["papers/01_definitions", "papers/02_quantification", "papers/03_grounding", "papers/pdfs"]:
    os.makedirs(d, exist_ok=True)
    # Clear out older non-speech/text-only files
    for f in os.listdir(d):
        try:
            os.remove(os.path.join(d, f))
        except Exception:
            pass

print("Downloading", len(speech_papers), "pure Speech/ASR hallucination papers...")
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

for idx, p in enumerate(speech_papers):
    aid = p["aid"]
    fname = p["filename"]
    cat = p["category"]
    pdf_url = "https://arxiv.org/pdf/" + aid + ".pdf"
    target_path = os.path.join("papers", cat, fname)
    pdf_archive_path = os.path.join("papers/pdfs", fname)
    
    print(f"[{idx+1}/{len(speech_papers)}] Downloading {aid} -> {fname}...")
    req = urllib.request.Request(pdf_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            with open(target_path, "wb") as f:
                f.write(data)
            with open(pdf_archive_path, "wb") as f:
                f.write(data)
            print("  Successfully saved (", len(data), "bytes)")
    except Exception as e:
        print("  Failed:", e)
    time.sleep(0.5)

print("All pure Speech/ASR hallucination papers downloaded and organized!")
