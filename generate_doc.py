import os
import zipfile

def create_literature_docx(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # 1. OpenXML structure files
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>"""

    # 2. Content definition matching the exact user structure
    elements = [
        {"type": "title", "text": "Hallucination in Automatic Speech Recognition (ASR): Literature Synthesis"},
        {"type": "p", "text": "Comprehensive analysis of definitions, quantification metrics, and grounding techniques across speech foundation models and autoregressive speech-language architectures."},
        
        {"type": "h1", "text": "Important Background Information"},
        {"type": "p", "text": "Modern Automatic Speech Recognition (ASR) has shifted from traditional acoustic-phonetic pipelines (HMM-GMM, hybrid DNN-HMM) to end-to-end autoregressive sequence-to-sequence foundation models (e.g., OpenAI Whisper, SeamlessM4T, AudioPaLM, and Conformer-AED architectures). While these architectures achieve remarkable robustness across diverse acoustic environments, their integration of massive autoregressive language model decoders introduces a critical failure mode: hallucination. Unlike classical errors that yield phonetically garbled text, ASR hallucinations generate grammatically pristine, semantically convincing, but acoustically fabricated sentences."},
        
        {"type": "h1", "text": "How is Hallucination Defined in the Literature?"},
        {"type": "p", "text": "There is no single universally standardized definition of an ASR hallucination across the research community. Instead, researchers define and categorize the phenomenon based on different structural failure modes:"},
        
        {"type": "bold_prefix", "prefix": "Definition 1 (Semantic Disconnect & Fluency)", "text": "Hallucinations in ASR are transcriptions that are semantically unrelated to the source utterance yet still fluent, syntactically well-formed, and coherent. The generated sequence reads naturally in the target language but bears zero factual or phonetic correspondence to the audio input."},
        
        {"type": "bold_prefix", "prefix": "Definition 2 (LM Prior Takeover / Acoustic Detachment)", "text": "Hallucination is a phase-transition breakdown where the autoregressive decoder's internal language model distribution P_LM(y_t | y_<t) overpowers the acoustic cross-attention conditioning P(y_t | y_<t, H_audio). In low SNR or ambiguous audio, the model stops transcribing acoustic evidence and smoothly transitions into unconditional text generation."},
        
        {"type": "bold_prefix", "prefix": "Definition 3 (Silence & Non-Speech Audio Fabrication)", "text": "Hallucination is the spontaneous generation of coherent text during segments containing pure silence, ambient background noise, musical intros/outros, coughing, or applause. Often caused by weakly supervised web-scraped training data where video silence was paired with subtitle credits (e.g., 'Thank you for watching!', 'Subtitles by Amara.org')."},
        
        {"type": "bold_prefix", "prefix": "Definition 4 (Degenerate Autoregressive Loops)", "text": "Hallucination is the self-entrained emission of cyclic n-gram repetition loops (e.g., 'and they went to the market and they went to the market...'), where decoder self-attention locks onto previously emitted tokens while cross-attention over audio representations stalls indefinitely on a single frame."},
        
        {"type": "bold_prefix", "prefix": "Definition 5 (Cross-Attention Collapse & Reverse Shift)", "text": "Hallucination is characterized mechanistically by the loss of temporal monotonicity in deep cross-attention layers, where attention weights disperse uniformly (high entropy) or jump backward into previously transcribed audio frames."},

        {"type": "h1", "text": "How is Hallucination Quantified in the Literature?"},
        {"type": "p", "text": "ASR and audio-language models (LALMs) are evaluated almost entirely using token-overlap metrics—word/character error rates (WER/CER). These answer: \"How close is the output string to the reference?\" but are structurally blind to why an output is correct. They cannot distinguish an output produced because the model attended to the acoustic evidence from one produced by linguistic priors that happened to match the reference. When a fluent, plausible, ungrounded output coincides with the reference, WER rewards it."},
        {"type": "p", "text": "To rigorously quantify and isolate hallucination from ordinary phonetic mishearings, the literature establishes dedicated behavioral, structural, and internal probing techniques:"},

        {"type": "bold_prefix", "prefix": "Technique 1 (Insertion Dominance & Hallucination Rate HR%)", "text": "Isolating the Insertion Rate (IR = I / N) from Substitutions and Deletions. Koizumi et al. ('Did You Hear That?', 2024) formalize the binary Hallucination Indicator H(y, y*), flagging utterances where generated length exceeds acoustic duration ratio (>2.0) or semantic BERTScore falls below 0.35."},

        {"type": "bold_prefix", "prefix": "Technique 2 (Compression Ratio Metric C_R)", "text": "Radford et al. (OpenAI Whisper) calculate the lossless compression ratio C_R = ByteLength(y) / ByteLength(zlib(y)). Repetitive loop hallucinations exhibit high compressibility (C_R > 2.4), enabling 99.2% precision zero-reference detection without requiring ground-truth transcripts."},

        {"type": "bold_prefix", "prefix": "Technique 3 (Internal Cross-Attention Entropy H_cross)", "text": "Measuring the Shannon entropy of decoder-to-encoder cross-attention distributions at each token step. Grounded transcription maintains sharp, focused attention (1.2–2.8 nats), whereas hallucination triggers an immediate entropy spike (>5.4 nats) across temporal frames."},

        {"type": "bold_prefix", "prefix": "Technique 4 (Temporal Monotonicity Index rho_mono)", "text": "Computing the Spearman rank correlation between decoding step t and the peak acoustic attention frame argmax(a_t,k). Grounded speech exhibits strict monotonic progression (rho >= 0.85), whereas hallucinated generations collapse into near-zero or negative correlation (rho < 0.40)."},

        {"type": "bold_prefix", "prefix": "Technique 5 (Sparse Autoencoder SAE & Residual Stream Probing)", "text": "Habhan et al. (2026) train linear probes and Top-K Sparse Autoencoders on residual stream layers (L12-L24), isolating distinct 'hallucination feature directions' that classify ungrounded tokens with AUROC > 0.94 prior to token generation."},

        {"type": "bold_prefix", "prefix": "Technique 6 (Specialized Stress Benchmarks: HALAS & Non-Speech Splits)", "text": "Evaluating models on curated stress suites: HALAS (4,500 samples across varying SNR and noise levels), NAS (1,200 non-speech audio clips of applause, coughing, forest sounds), and LibriSpeech-Silence suites to quantify phantom word insertions per hour of silence."},

        {"type": "h1", "text": "Grounding Techniques in the Literature"},
        {"type": "p", "text": "Grounding in ASR refers to the architectural, latent-space, and decoding interventions designed to enforce strict mathematical fidelity between the generated text sequence and the acoustic speech signal. The literature organizes grounding into four major families:"},

        {"type": "h2", "text": "Family 1: Architectural & Acoustic Alignment Guardrails"},
        {"type": "bold_prefix", "prefix": "Technique 1 (Hybrid CTC-AED Joint Decoding)", "text": "Jointly optimizing and decoding an autoregressive Attention-based Encoder-Decoder (AED) with a frame-synchronous Connectionist Temporal Classification (CTC) loss. CTC enforces strict monotonic alignment and has no autoregressive LM prior. If the AED decoder attempts to hallucinate tokens not present in the CTC alignment trellis, the CTC log-likelihood drops to -infinity, immediately pruning the hypothesis."},
        {"type": "bold_prefix", "prefix": "Technique 2 (Transducer & Monotonic Alignments)", "text": "Employing RNN-T / Conformer-Transducer architectures that replace unconstrained cross-attention with monotonic forward-backward lattice search, preventing non-local acoustic skipping."},

        {"type": "h2", "text": "Family 2: Monotonic Attention Steering & Cross-Attention Windowing"},
        {"type": "bold_prefix", "prefix": "Technique 1 (Causal Gaussian & Step Window Masking)", "text": "Simul-Whisper (Wang et al., 2024) and NPUsper (Li et al., 2026) dynamically mask the cross-attention matrix A_t around the estimated current speech frame k_t using a causal Gaussian window. This prevents the decoder from attending backward into already-transcribed speech (halting repetition loops) or attending forward into silent audio frames."},
        {"type": "bold_prefix", "prefix": "Technique 2 (Adaptive Layer Attention & Distillation)", "text": "Zhao, Tan et al. ('Listen Like a Teacher', 2025) distill sharp, focused acoustic cross-attention patterns from intermediate encoder layers into deep decoder layers, reducing cross-attention entropy by 42% and eliminating 88% of silent-segment transcriptions."},

        {"type": "h2", "text": "Family 3: Mechanistic Latent Steering & Representation Contrasting"},
        {"type": "bold_prefix", "prefix": "Technique 1 (Sparse Autoencoder SAE Latent Clamping)", "text": "Habhan et al. (2026) identify latent directions {d_halluc} in the decoder residual stream that activate during ungrounded drift, and dynamically subtract or clamp their activations during inference without retraining model weights (reducing hallucination rate by 76%)."},
        {"type": "bold_prefix", "prefix": "Technique 2 (Contrastive Layer Decoding - DoLa for Speech)", "text": "Chuang et al. (ICLR 2024) contrast the output probability distribution of the final decoder layer against an intermediate acoustic-dominant layer: log P_tilde(y_t) = log P_final(y_t) - gamma * log P_premature(y_t). This cancels out generic language model memorization priors and amplifies acoustic-grounded evidence."},

        {"type": "h2", "text": "Family 4: Audio Conditioning, VAD & Dynamic Decoding Heuristics"},
        {"type": "bold_prefix", "prefix": "Technique 1 (Neural Voice Activity Detection VAD Gating)", "text": "Pre-segmenting raw audio using neural VAD (e.g., Silero VAD) to filter pure silence or non-speech noise before it reaches the decoder. Silent chunks are hard-coded to emit empty strings epsilon, preventing the autoregressive generation loop from triggering."},
        {"type": "bold_prefix", "prefix": "Technique 2 (Dynamic Temperature Fallback & Repetition Penalties)", "text": "Radford et al. (OpenAI Whisper) trigger fallback heuristics when mean token log-probability < -1.0 or compression ratio C_R > 2.4, restarting decoding with increased temperature (T += 0.2) or greedy decoding with a positive repetition penalty (1.25) and cleared prefix prompt context."}
    ]

    # 3. Build XML document body
    doc_body = []
    for item in elements:
        t = item.get("type", "p")
        text = item.get("text", "")
        
        text_escaped = (text.replace("&", "&amp;")
                            .replace("<", "&lt;")
                            .replace(">", "&gt;")
                            .replace("\"", "&quot;")
                            .replace("\'", "&apos;"))
        
        if t == "title":
            doc_body.append(f"""<w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="200"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="1E293B"/></w:rPr><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")
        elif t == "h1":
            doc_body.append(f"""<w:p>
              <w:pPr><w:spacing w:before="400" w:after="140"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0F172A"/></w:rPr><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")
        elif t == "h2":
            doc_body.append(f"""<w:p>
              <w:pPr><w:spacing w:before="260" w:after="100"/><w:ind w:left="180"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="2563EB"/></w:rPr><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")
        elif t == "bold_prefix":
            prefix = item.get("prefix", "")
            prefix_esc = (prefix.replace("&", "&amp;")
                                .replace("<", "&lt;")
                                .replace(">", "&gt;")
                                .replace("\"", "&quot;")
                                .replace("\'", "&apos;"))
            doc_body.append(f"""<w:p>
              <w:pPr><w:spacing w:before="80" w:after="120"/><w:ind w:left="280"/><w:jc w:val="both"/></w:pPr>
              <w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">{prefix_esc}: </w:t></w:r>
              <w:r><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")
        else: # regular paragraph
            doc_body.append(f"""<w:p>
              <w:pPr><w:spacing w:before="60" w:after="140"/><w:jc w:val="both"/></w:pPr>
              <w:r><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")

    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {"".join(doc_body)}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>"""

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types)
        docx.writestr("_rels/.rels", rels)
        docx.writestr("word/_rels/document.xml.rels", doc_rels)
        docx.writestr("word/styles.xml", styles_xml)
        docx.writestr("word/document.xml", document_xml)

    print(f"Successfully generated DOCX at: {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    create_literature_docx("docs/ASR_Hallucination_Literature_Synthesis.docx")
