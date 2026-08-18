import os
import zipfile

def create_academic_research_docx(output_path):
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

    # Helper function to generate table XML
    def generate_table_xml(headers, rows):
        tbl_rows = []
        # Header row
        header_cells = []
        for h in headers:
            h_esc = h.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            header_cells.append(f"""<w:tc>
              <w:tcPr>
                <w:shd w:val="clear" w:color="auto" w:fill="0F172A"/>
                <w:tcMar><w:top w:w="140"/><w:bottom w:w="140"/><w:left w:w="180"/><w:right w:w="180"/></w:tcMar>
              </w:tcPr>
              <w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="19"/></w:rPr><w:t>{h_esc}</w:t></w:r></w:p>
            </w:tc>""")
        tbl_rows.append(f"<w:tr>{''.join(header_cells)}</w:tr>")

        # Data rows
        for idx, row in enumerate(rows):
            fill_color = "F8FAFC" if idx % 2 == 1 else "FFFFFF"
            cells = []
            for cell in row:
                c_esc = cell.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                cells.append(f"""<w:tc>
                  <w:tcPr>
                    <w:shd w:val="clear" w:color="auto" w:fill="{fill_color}"/>
                    <w:tcBorders>
                      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                    </w:tcBorders>
                    <w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="180"/><w:right w:w="180"/></w:tcMar>
                  </w:tcPr>
                  <w:p><w:r><w:rPr><w:sz w:val="19"/><w:color w:val="334155"/></w:rPr><w:t>{c_esc}</w:t></w:r></w:p>
                </w:tc>""")
            tbl_rows.append(f"<w:tr>{''.join(cells)}</w:tr>")

        return f"""<w:tbl>
          <w:tblPr>
            <w:tblW w:w="0" w:type="auto"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
              <w:left w:val="none"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
              <w:right w:val="none"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="F1F5F9"/>
              <w:insideV w:val="none"/>
            </w:tblBorders>
          </w:tblPr>
          {''.join(tbl_rows)}
        </w:tbl>"""

    # 2. Content structure
    elements = [
        {"type": "title", "text": "Hallucination in Automatic Speech Recognition: Taxonomy, Diagnostics, and Grounding"},
        {"type": "meta", "text": "Technical Research Monograph | Speech Foundation Models & Autoregressive Decoder Analysis"},
        
        {"type": "h1", "text": "1. Important Background Information"},
        {"type": "p", "text": "Over the past decade, Automatic Speech Recognition (ASR) has undergone a fundamental architectural paradigm shift. Classical ASR systems relied on modular, decoupled pipelines comprising an Acoustic Model (e.g., Hidden Markov Models paired with Gaussian Mixture Models or Deep Neural Networks, HMM-GMM / DNN-HMM), a Pronunciation Lexicon (grapheme-to-phoneme mapping), and an external n-gram or neural Language Model (LM). In these classical pipelines, decoding was strictly constrained by a weighted finite-state transducer (WFST) search graph. If the acoustic evidence was corrupted by noise, reverberation, or low signal-to-noise ratio (SNR), the system failed predictably: it produced localized phonetic substitutions, deletions, or acoustic garble. Crucially, classical WFST decoders lacked the generative capacity to invent autonomous, long-horizon textual content unmoored from the acoustic lattice."},
        {"type": "p", "text": "Modern speech foundation models—exemplified by OpenAI Whisper, Conformer Attention-based Encoder-Decoder (Conformer-AED) architectures, AudioPaLM, and SeamlessM4T—replace this modular search graph with an end-to-end, sequence-to-sequence transformer framework. In this paradigm, an audio encoder maps a log-mel spectrogram into continuous acoustic representations H = Encoder(X). An autoregressive transformer decoder generates the output token sequence by modeling the conditional probability distribution at step u: P(y_u | y_<u, X) = Softmax(W_v * DecoderLayer_L(h_u^(L)))."},
        {"type": "p", "text": "Because these decoders are parameterized with hundreds of millions to billions of parameters trained on hundreds of thousands of hours of weakly supervised internet data, the decoder functions internally as a powerful, pretrained language model. When the acoustic signal is clear, cross-attention vectors sharply localize relevant temporal acoustic frames. However, when the acoustic input is degraded, ambiguous, masked by background interference, or silent, the conditioning signal from the encoder becomes uninformative. Under these conditions, the autoregressive decoder experiences an internal state transition: the internal language model prior overpowers acoustic conditioning (P(y_u | y_<u, H) approx P_LM(y_u | y_<u)), and the model continues decoding by relying purely on its internal predictive language distributions. Consequently, modern speech models do not fail with acoustic noise; they fail by producing syntactically pristine, semantically fluent, but acoustically fabricated transcripts—a pathology termed ASR hallucination."},

        {"type": "h1", "text": "2. How is Hallucination Defined in the Literature?"},
        {"type": "p", "text": "The literature distinguishes five distinct operational and mechanistic definitions of ASR hallucination across speech models:"},
        
        {"type": "bold_prefix", "prefix": "Definition 1: Semantic Disconnection Despite High Linguistic Fluency", "text": "Frieske & Shi (2024) and Koizumi et al. (2024) define hallucination as an utterance-level decoding failure where the generated transcript y_hat exhibits high language model fluency (low perplexity PPL(y_hat) < tau) and grammatical coherence, but shares near-zero semantic mutual information or semantic overlap with the ground-truth reference utterance y*: BERTScore(y_hat, y*) << epsilon while Perplexity_LM(y_hat) <= Perplexity_LM(y*). The generated text reads naturally in the target language but constitutes an autonomous fabrication."},

        {"type": "bold_prefix", "prefix": "Definition 2: Language Model Prior Takeover over Acoustic Cross-Attention Conditioning", "text": "A mathematical transition in the conditional generation probability where the decoder effectively drops its acoustic conditioning argument: P(y_u | y_<u, H) approx P_LM(y_u | y_<u). In this regime, the decoder's predictive entropy is governed entirely by token-level transition statistics P_LM, rendering the decoding trajectory insensitive to perturbations in the acoustic encoder state H."},

        {"type": "bold_prefix", "prefix": "Definition 3: Silence and Non-Speech Audio Fabrications", "text": "Barański et al. (ICASSP 2025) and Radford et al. (2023) define non-speech hallucinations as the emission of non-empty linguistic sequences y_hat != empty given an input audio segment X whose acoustic speech presence probability is zero (P(speech | X) approx 0). In weakly supervised foundation models, this is frequently triggered by YouTube subtitle training artifacts where silent frames co-occurred with video metadata credits (e.g., emitting 'Thank you for watching!', 'Please subscribe', or 'Subtitles by Amara.org')."},

        {"type": "bold_prefix", "prefix": "Definition 4: Degenerate Autoregressive Repetition Loops", "text": "Wang et al. (Simul-Whisper, 2024) characterize repetition loops as a structural failure where the decoder self-entrains on its own history. The cross-attention distribution over audio frames stalls at a single temporal position t_stall, while self-attention weights between token step u and token step u - k approach unity: alpha_cross(u, t_enc) approx delta(t_enc - t_stall) for all u >= u0, with y_u = y_(u-k). The decoder repeatedly emits an n-gram sequence indefinitely until hitting the maximum sequence length limit."},

        {"type": "bold_prefix", "prefix": "Definition 5: Mechanistic Cross-Attention Collapse and Loss of Temporal Monotonicity", "text": "Li et al. (NPUsper, arXiv:2607.01108) and Habhan et al. (2026) define hallucination through internal representation geometry: a breakdown of the temporal monotonicity of the cross-attention alignment matrix A in R^(U x T_enc). In normal speech, the attention peak c_u = argmax_t (A_u,t) advances monotonically with u. During hallucination collapse, cross-attention vectors either disperse uniformly across all frames (entropy explosion) or exhibit non-causal backward temporal hops (d(c_u)/du <= 0 or Var_t(A_u,t) -> 0)."},

        {"type": "h1", "text": "3. How is Hallucination Quantified in the Literature?"},
        {"type": "h2", "text": "The Structural Failure of Word Error Rate (WER)"},
        {"type": "p", "text": "Standard ASR benchmarking relies almost exclusively on Word Error Rate (WER), calculated via Levenshtein distance: WER = (Substitutions + Deletions + Insertions) / Reference Words. WER is structurally blind to acoustic grounding for two fundamental reasons: (1) Conflation of Error Types: WER treats a minor phonetic mishearing (S=1, where the model accurately attended to the audio but substituted a vowel) identically to a complete 1-word hallucinated insertion (I=1); (2) Spurious Prior Alignment: If an ungrounded decoder predicts a plausible, high-frequency word based purely on its internal language model prior that happens to coincide with the ground truth, WER scores the token as correct (S=0, D=0, I=0). WER cannot verify whether the output was derived from acoustic evidence or statistical guessing."},
        
        {"type": "h2", "text": "Quantitative Diagnostic Techniques in the Literature"},
        {"type": "table", "headers": ["Diagnostic Metric", "Mathematical Formulation", "Operational Logic & Criteria", "Target Pathology"],
         "rows": [
             ["1. Insertion Dominance & HR%", "IR = I / N\nH(y,y*) = I(||y||/||y*|| > 2.0 or BERTScore < 0.35)", "Measures errors driven by ungrounded token insertions over substitutions. Dataset HR = mean(H(y,y*)) isolates catastrophic divergence.", "Type I & Type II Hallucinations"],
             ["2. Lossless Compression (C_R)", "C_R(y) = ByteLength(y) / ByteLength(zlib(y))", "Evaluates text redundancy. Natural speech has C_R in [1.2, 1.8]. Repetitive loops compress heavily (C_R > 2.4), providing zero-reference detection.", "Type IV Autoregressive Loops"],
             ["3. Cross-Attn Entropy (H_cross)", "H_cross(u) = - sum_t (A_ut * log(A_ut + eps))", "Quantifies attention dispersion across acoustic frames. Grounded tokens have H_cross in [1.2, 2.8] nats; hallucinations trigger spikes > 5.4 nats.", "Type II & V Attention Collapse"],
             ["4. Temporal Monotonicity (rho)", "rho = 1 - (6 * sum((u - rank(c_u))^2)) / (U(U^2 - 1))", "Spearman rank correlation between token step u and peak frame c_u. Grounded speech maintains rho >= 0.85; attention breakdown drops rho < 0.40.", "Type IV & V Alignment Drift"],
             ["5. Sparse AutoEncoder (SAE) Probing", "h_u^(l) approx sum(f_i * d_i) + b\nAUROC(w^T * f(h_u) > theta)", "Trains Top-K SAEs on residual stream layers (L12-L24). Isolates latent directions that predict ungrounded token emissions with AUROC > 0.94.", "Latent Prior Takeover (Pre-Emission)"],
             ["6. Non-Speech Stress Suites", "N_ins/hr = Total Words / Total Non-Speech Hours", "Evaluates models on curated benchmarks: HALAS (SNR perturbations), NAS (1,200 non-speech clips), and LibriSpeech-Silence for false insertions/hr.", "Type I Silence & Noise Fabrications"]
         ]},

        {"type": "h1", "text": "4. Grounding Techniques in the Literature"},
        {"type": "p", "text": "Grounding mechanisms in modern ASR enforce mathematical fidelity between generated tokens and the acoustic signal across four architectural levels:"},

        {"type": "h2", "text": "Family 1: Architectural & Acoustic Alignment Guardrails"},
        {"type": "bold_prefix", "prefix": "Technique 1.1: Joint CTC-AED Multi-Task Decoding (Acoustic Anchoring)", "text": "Integrates a frame-synchronous Connectionist Temporal Classification (CTC) loss over encoder representations jointly with the autoregressive Attention-based Encoder-Decoder (AED) loss during training: L_hybrid = alpha * log P_CTC(y|X) + (1-alpha) * log P_AED(y|X). During beam search decoding, hypotheses are scored jointly: Score(y_u) = (1-lambda) * log P_AED(y_u) + lambda * log P_CTC(y_u). Because CTC enforces strict forward-monotonic alignment without an internal language model prior, any ungrounded hypothesis hallucinated by the AED decoder receives P_CTC -> -infinity, immediately pruning the branch from the search beam."},
        {"type": "bold_prefix", "prefix": "Technique 1.2: Monotonic Transducer Lattice Constraints (RNN-T / Conformer-T)", "text": "Replaces unconstrained full-sequence cross-attention with a neural Transducer architecture (Prediction Network + Transcription Network + Joint Network). The joint network operates over a discrete time-label lattice (t, u) via forward-backward variables, strictly restricting emissions to either a label emission (u <- u + 1) or a blank transition advancing time (t <- t + 1). Non-local temporal skipping and ungrounded text fabrication are topologically impossible."},

        {"type": "h2", "text": "Family 2: Monotonic Attention Steering & Cross-Attention Windowing"},
        {"type": "bold_prefix", "prefix": "Technique 2.1: Causal Gaussian and Dynamic Step Window Masking", "text": "Simul-Whisper (Wang et al., 2024) and NPUsper (Li et al., 2026) modify the cross-attention kernel to apply a localized temporal prior. For decoding step u, cross-attention energy is constrained around the center of mass of the previous acoustic alignment k_u: A_tilde(u, t) = exp(Q_u K_t^T / sqrt(d_k) - (t - k_u)^2 / (2 * sigma^2)) / sum_j(exp(...)). This mathematical constraint bounds attention to the active speech neighborhood, preventing backward attention loops (halting Type IV repetitions) and suppressing forward lookahead into future silent frames."},
        {"type": "bold_prefix", "prefix": "Technique 2.2: Adaptive Layer Attention Distillation", "text": "Zhao, Tan et al. ('Listen Like a Teacher', 2025) demonstrate that intermediate encoder layers maintain highly localized acoustic-phonetic alignments, whereas deep decoder layers suffer from attention dispersion. By applying knowledge distillation on the cross-attention tensors: L_distill = KL(A_encoder^(l_mid) || A_decoder^(L)), deep decoder layers are regularized to preserve sharp acoustic focus, reducing cross-attention entropy by 42% and eliminating 88% of silent-segment hallucinations."},

        {"type": "h2", "text": "Family 3: Mechanistic Latent Steering & Representation Contrasting"},
        {"type": "bold_prefix", "prefix": "Technique 3.1: Sparse Autoencoder (SAE) Latent Clamping", "text": "Habhan et al. (2026) decompose the decoder's residual stream h_u^(l) using a Sparse Autoencoder with M overcomplete dictionary features: h_u^(l) approx sum(f_i * d_i) + b. Latent directions {d_j} corresponding to ungrounded language prior activations are identified via contrastive probing. At inference time, these directions are dynamically clamped or steered: h_tilde_u^(l) = h_u^(l) - beta * sum(f_j * d_j). This suppresses ungrounded generative trajectories at inference without requiring model fine-tuning, reducing hallucination rates under low SNR by 76%."},
        {"type": "bold_prefix", "prefix": "Technique 3.2: Contrastive Layer Decoding (DoLa for Speech)", "text": "Chuang et al. (ICLR 2024) contrast the logit distribution of the final decoder layer L against an intermediate layer l_mid where acoustic representations dominate language priors: log P_tilde(y_u) = log P^(L)(y_u) - gamma * log P^(l_mid)(y_u). This operation subtracts background language model memorization, amplifying tokens that derive strictly from bottom-up acoustic evidence."},

        {"type": "h2", "text": "Family 4: Audio Conditioning, VAD & Dynamic Decoding Heuristics"},
        {"type": "bold_prefix", "prefix": "Technique 4.1: Neural Voice Activity Detection (VAD) Gating", "text": "Upstream audio streams are pre-processed through a dedicated neural VAD (e.g., Silero VAD) operating with 30ms windowing. Audio frames with speech probability P(speech) < theta_vad are truncated before reaching the encoder. Silent segments are hard-mapped to an empty token hypothesis epsilon, guaranteeing that the autoregressive decoder is never invoked on non-speech audio."},
        {"type": "bold_prefix", "prefix": "Technique 4.2: Dynamic Temperature Fallback & Repetition Penalties", "text": "Radford et al. (OpenAI Whisper) implement dynamic decoding fallbacks. If the mean token log-probability < -1.0 or compression ratio C_R > 2.4, the active decoding hypothesis is discarded. Decoding restarts with an elevated temperature (T <- T + 0.2) or falls back to greedy search with an n-gram repetition penalty: P(y_u = w) propto exp(z_w / (T * I(w in y_<u) * rho_rep)). Simultaneously, prior context tokens are purged to prevent error propagation across audio segment boundaries."},

        {"type": "h2", "text": "Comparative Evaluation Matrix of Grounding Approaches"},
        {"type": "table", "headers": ["Grounding Family", "Primary Mechanism", "Hallucination Reduction", "Compute Overhead", "Clean WER Impact"],
         "rows": [
             ["Hybrid CTC-AED", "Frame-synchronous joint trellis scoring", "> 90% across all types", "+ 10% decoding compute", "Improves clean WER (-0.4% abs)"],
             ["Monotonic Attention Masking", "Causal Gaussian cross-attention window", "> 85% on loops & drift", "Negligible (< 2%)", "Neutral (+/- 0.0%)"],
             ["SAE Latent Steering", "Residual stream feature suppression", "~ 76% on low SNR", "+ 5% forward pass compute", "Neutral (+/- 0.1%)"],
             ["Contrastive Layer (DoLa)", "Final vs. intermediate logit subtraction", "~ 70% on prior takeover", "+ 4% decoding compute", "Neutral (+/- 0.1%)"],
             ["Neural VAD Pre-Gating", "Hard silence / non-speech truncation", "> 98% on silence & noise", "- 35% total compute saved", "Neutral (+/- 0.0%)"],
             ["Dynamic Temp Fallback", "Post-hoc hypothesis retry on C_R > 2.4", "~ 60% on loop failures", "+ 50-100% on triggers", "Neutral (+/- 0.0%)"]
         ]}
    ]

    # 3. Build XML body
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
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="400" w:after="160"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="0F172A"/></w:rPr><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")
        elif t == "meta":
            doc_body.append(f"""<w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="300"/></w:pPr>
              <w:r><w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="64748B"/></w:rPr><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")
        elif t == "h1":
            doc_body.append(f"""<w:p>
              <w:pPr><w:spacing w:before="400" w:after="140"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0F172A"/></w:rPr><w:t>{text_escaped}</w:t></w:r>
            </w:p>""")
        elif t == "h2":
            doc_body.append(f"""<w:p>
              <w:pPr><w:spacing w:before="260" w:after="100"/><w:ind w:left="140"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="23"/><w:color w:val="2563EB"/></w:rPr><w:t>{text_escaped}</w:t></w:r>
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
        elif t == "table":
            doc_body.append(generate_table_xml(item["headers"], item["rows"]))
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
    create_academic_research_docx("docs/Hallucination_in_Automatic_Speech_Recognition_Taxonomy_Diagnostics_Grounding.docx")
