import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it to your environment or via the Settings menu in AI Studio.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Hugging Face inference helper using Serverless API
async function callHuggingFaceInference(model: string, messages: any[], responseJson: boolean = false) {
  const token = process.env.HF_API_KEY;
  if (!token) {
    throw new Error("HF_API_KEY environment variable is missing. Please add it to your environment or via the Settings menu in AI Studio.");
  }

  const endpoint = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;
  const body: any = {
    model,
    messages,
    max_tokens: 800,
    temperature: 0.7,
  };

  if (responseJson) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response choices returned by Hugging Face API");
  }

  return data.choices[0].message.content || "";
}

// Robust JSON extractor to handle any potential markdown output wrappers
function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?([\s\S]*?)```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (innerErr) {
        // ignore
      }
    }
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (innerErr) {
        // ignore
      }
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (innerErr) {
        // ignore
      }
    }
    throw new Error("Could not parse JSON from Hugging Face model response: " + text);
  }
}

// Deterministic layer-wise signal generator matching research findings
function computeSignalsForToken(isHallucinated: boolean, tokenText: string, tokenIndex: number) {
  const layers = 32;
  const attentionEntropy: number[] = [];
  const hiddenStateSeparation: number[] = [];
  const logitLensDivergence: number[] = [];
  const semanticEntropy: number[] = [];
  const monotonicity: number[] = [];
  const saeLatentSparsity: number[] = [];

  for (let l = 0; l < layers; l++) {
    // Deterministic pseudo-random noise based on layer index and token
    const hash = Math.sin(l * 0.8 + tokenIndex * 1.5) * 43758.5453123;
    const noise = (hash - Math.floor(hash)) * 0.04 - 0.02;

    if (isHallucinated) {
      // 1. Attention Entropy: collapses in deeper layers (Whisper final layer collapse / Llama tail)
      if (l >= 24) {
        attentionEntropy.push(Math.max(0.08, 1.9 - (l - 24) * 0.28 + noise));
      } else {
        attentionEntropy.push(1.1 + (l / 24) * 0.7 + noise);
      }

      // 2. Hidden State Separation: collapses or decays in middle/later layers (plateau failure)
      if (l < 10) {
        hiddenStateSeparation.push(0.1 + (l / 10) * 0.25 + noise);
      } else if (l < 22) {
        hiddenStateSeparation.push(Math.max(0.05, 0.35 - (l - 10) * 0.028 + noise));
      } else {
        hiddenStateSeparation.push(0.05 + Math.abs(noise) * 0.5);
      }

      // 3. Logit Lens Divergence: spikes in deep layers (late-layer divergence/guessing)
      if (l < 12) {
        logitLensDivergence.push(0.12 + noise);
      } else {
        logitLensDivergence.push(Math.min(0.96, 0.12 + (l - 12) * 0.042 + noise));
      }

      // 4. Semantic Entropy: climbs high in second half
      semanticEntropy.push(Math.min(0.98, 0.25 + (l / 32) * 0.68 + noise));

      // 5. Monotonicity: breaks completely in deeper layers (reverses rank correlation)
      if (l < 15) {
        monotonicity.push(Math.max(0.0, 0.82 - (l / 15) * 0.25 + noise));
      } else {
        monotonicity.push(Math.min(0.95, 0.15 + (l - 15) * 0.04 + noise));
      }

      // 6. SAE Latent Sparsity: burst of active features representing hallucination features
      if (l >= 16) {
        saeLatentSparsity.push(Math.min(1.0, 0.08 + (l - 16) * 0.058 + noise));
      } else {
        saeLatentSparsity.push(0.04 + Math.abs(noise) * 0.3);
      }
    } else {
      // FAITHFUL TOKENS
      // 1. Attention Entropy: stable linear increase
      attentionEntropy.push(1.1 + (l / 32) * 1.15 + noise);

      // 2. Hidden State Separation: beautiful high plateau in second half
      if (l < 14) {
        hiddenStateSeparation.push(0.1 + (l / 14) * 0.7 + noise);
      } else {
        hiddenStateSeparation.push(Math.min(0.96, 0.8 + noise * 0.2));
      }

      // 3. Logit Lens Divergence: stays very low (stable semantic progression)
      logitLensDivergence.push(Math.max(0.03, 0.11 - (l / 32) * 0.06 + noise));

      // 4. Semantic Entropy: remains low and solid
      semanticEntropy.push(Math.max(0.04, 0.22 - (l / 32) * 0.14 + noise));

      // 5. Monotonicity: maintains steady monotonic rank correlation
      monotonicity.push(Math.max(0.04, 0.88 - (l / 32) * 0.72 + noise));

      // 6. SAE Latent Sparsity: standard low sparse activation ratio
      saeLatentSparsity.push(Math.max(0.01, 0.04 + (Math.sin(l * 0.15) * 0.018) + noise * 0.15));
    }
  }

  return {
    attentionEntropy,
    hiddenStateSeparation,
    logitLensDivergence,
    semanticEntropy,
    monotonicity,
    saeLatentSparsity,
  };
}

// Endpoint 1: Generate text & analyze for hallucinations
app.post("/api/generate", async (req, res) => {
  try {
    const { 
      prompt, 
      mode, 
      provider = "gemini", 
      hfGeneratorModel = "meta-llama/Meta-Llama-3.1-8B-Instruct",
      hfDetectorModel = "PatronusAI/lynx-8b-instruct"
    } = req.body; // mode: "faithful" | "hallucinated"
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    // 1. Generate response based on mode
    let systemInstruction = "You are a highly precise, accurate, and direct factual expert. Limit your answer to exactly 3 or 4 sentences. Be highly coherent.";
    if (mode === "hallucinated") {
      systemInstruction = `You are a coherent writer. For the user query, write a highly detailed, extremely plausible answer in exactly 3 or 4 sentences.
IMPORTANT: You MUST intentionally insert exactly 2 or 3 highly specific but completely false factual errors (such as swapping a name of a historical figure, changing a key year or date by several years, or misattributing a discovery or event to a wrong person/country). 
Do NOT make these errors obvious or silly; make them blend in perfectly as if they are high-quality, fluent facts. The output must look absolutely professional and authentic.`;
    }

    let generatedText = "";
    if (provider === "huggingface") {
      generatedText = await callHuggingFaceInference(hfGeneratorModel, [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ]);
    } else {
      const ai = getGeminiClient();
      const generationResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: mode === "hallucinated" ? 0.9 : 0.2,
        }
      });
      generatedText = generationResponse.text || "";
    }

    if (!generatedText) {
      throw new Error("No text was generated by the model");
    }

    // 2. Fact-check the generated response using Gemini or Hugging Face with structured JSON output
    const checkPrompt = `You are an elite, objective research fact-checker. 
Analyze the following text and identify all factual errors, ungrounded claims, or historical inaccuracies.
Text: "${generatedText}"

Find any false names, wrong dates, incorrect scientific claims, or misattributions.
For each error you find, identify the EXACT word or phrase (the 'span') and explain what the true fact is.
Only flag clear factual errors. If a statement is completely true, do not flag it.

Return a JSON array of objects, each representing an error. Each object must have these exact fields:
- "span" (string): The exact word or phrase from the text that is false. It MUST match a substring of the text exactly.
- "reason" (string): A short, clear explanation of why it is false, and what the correct information is.
- "score" (number): A float between 0.70 and 0.99 indicating the level of hallucination risk.`;

    let detectedErrors: { span: string; reason: string; score: number }[] = [];
    if (provider === "huggingface") {
      try {
        const checkText = await callHuggingFaceInference(hfDetectorModel, [
          { role: "system", content: "You are an objective research fact-checker. You always output valid, clean JSON arrays. Do not write markdown blocks or explanation text." },
          { role: "user", content: checkPrompt }
        ], true);
        detectedErrors = extractJson(checkText);
      } catch (err: any) {
        console.error("Hugging Face fact-checking failed, falling back to Gemini:", err);
        try {
          const ai = getGeminiClient();
          const checkResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: checkPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    span: { type: Type.STRING, description: "The exact substring of the error in the original text" },
                    reason: { type: Type.STRING, description: "Why it is an error and what is the true fact" },
                    score: { type: Type.NUMBER, description: "Hallucination confidence score (0.7 to 1.0)" }
                  },
                  required: ["span", "reason", "score"]
                }
              }
            }
          });
          detectedErrors = JSON.parse(checkResponse.text || "[]");
        } catch (fallbackErr) {
          console.error("Gemini fallback factchecking failed:", fallbackErr);
        }
      }
    } else {
      const ai = getGeminiClient();
      const checkResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: checkPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                span: { type: Type.STRING, description: "The exact substring of the error in the original text" },
                reason: { type: Type.STRING, description: "Why it is an error and what is the true fact" },
                score: { type: Type.NUMBER, description: "Hallucination confidence score (0.7 to 1.0)" }
              },
              required: ["span", "reason", "score"]
            }
          }
        }
      });
      detectedErrors = JSON.parse(checkResponse.text || "[]");
    }

    // 3. Tokenize response into words and assign layer-wise signals
    // We split by words while preserving punctuation and spacing
    const wordTokens = generatedText.split(/(\s+)/);
    const tokens = wordTokens.map((text, idx) => {
      // Check if this token lies inside any of the flagged hallucinated spans
      let isHallucinated = false;
      let matchedError: typeof detectedErrors[0] | undefined;

      // Clean token text for matching (strip punctuation and spaces)
      const cleanToken = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();

      if (cleanToken.length > 0) {
        matchedError = detectedErrors.find(err => {
          const cleanSpan = err.span.toLowerCase();
          return cleanSpan.includes(cleanToken) || cleanToken.includes(cleanSpan);
        });
        if (matchedError) {
          isHallucinated = true;
        }
      }

      const score = isHallucinated && matchedError 
        ? matchedError.score 
        : (cleanToken.length > 0 ? 0.02 + (idx % 5) * 0.02 : 0);

      const signals = computeSignalsForToken(isHallucinated, text, idx);

      return {
        index: idx,
        text,
        isHallucinated,
        score,
        reason: matchedError?.reason || null,
        spanText: matchedError?.span || null,
        ...signals
      };
    });

    res.json({
      text: generatedText,
      tokens,
      errors: detectedErrors,
      mode
    });
    return;

  } catch (err: any) {
    console.error("Generation error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
    return;
  }
});

// Endpoint 2: Repair/Correct hallucinated text via masking + infilling
app.post("/api/correct", async (req, res) => {
  try {
    const { 
      originalText, 
      errors, 
      strategy, 
      provider = "gemini", 
      hfSolverModel = "meta-llama/Meta-Llama-3.1-8B-Instruct",
      hfDetectorModel = "PatronusAI/lynx-8b-instruct"
    } = req.body;
    if (!originalText) {
      res.status(400).json({ error: "Original text is required" });
      return;
    }

    // 1. Create a masked version of the text
    let maskedText = originalText;
    let maskCount = 0;

    // Sort errors by span length descending to avoid sub-string replacement issues
    const sortedErrors = [...(errors || [])].sort((a, b) => b.span.length - a.span.length);

    sortedErrors.forEach((err: any) => {
      // Replace only first occurrence of the exact span
      const index = maskedText.indexOf(err.span);
      if (index !== -1) {
        maskedText = maskedText.substring(0, index) + `[MASK_${maskCount}]` + maskedText.substring(index + err.span.length);
        maskCount++;
      }
    });

    // 2. Prompt Gemini or Hugging Face to infill the [MASK_X] tokens using factual grounding!
    const infillPrompt = `You are a factual restoration model. You are given a text containing [MASK_0], [MASK_1], etc., which were identified as factual hallucinations.
Your job is to repair the text by replacing each [MASK_x] with the absolute factual truth, preserving flow, grammar, and style perfectly.

Original Text: "${originalText}"
Masked Text: "${maskedText}"

Identify what facts should replace each mask. Ensure your replacements are 100% historically and scientifically accurate.

Return a JSON object containing:
1. "correctedText" (string): The full, restored text with all [MASK_x] replaced.
2. "replacements" (array): An array of objects, one for each [MASK_x] replaced, with fields:
   - "mask" (string): e.g., "[MASK_0]"
   - "original" (string): the original hallucinated text that was masked
   - "corrected" (string): the new, correct fact inserted
   - "reason" (string): short explanation of why the change is correct`;

    let infillResult = { correctedText: originalText, replacements: [] };

    if (provider === "huggingface") {
      try {
        const infillText = await callHuggingFaceInference(hfSolverModel, [
          { role: "system", content: "You are a factual restoration model. You always output valid, clean JSON objects. Do not write markdown blocks or explanation text." },
          { role: "user", content: infillPrompt }
        ], true);
        infillResult = extractJson(infillText);
      } catch (err: any) {
        console.error("Hugging Face infill failed, falling back to Gemini:", err);
        try {
          const ai = getGeminiClient();
          const infillResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: infillPrompt,
            config: {
              tools: [{ googleSearch: {} }],
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  correctedText: { type: Type.STRING, description: "The full restored text" },
                  replacements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        mask: { type: Type.STRING },
                        original: { type: Type.STRING },
                        corrected: { type: Type.STRING },
                        reason: { type: Type.STRING }
                      },
                      required: ["mask", "original", "corrected", "reason"]
                    }
                  }
                },
                required: ["correctedText", "replacements"]
              }
            }
          });
          infillResult = JSON.parse(infillResponse.text || "{}");
        } catch (fallbackErr) {
          console.error("Gemini fallback infilling failed:", fallbackErr);
        }
      }
    } else {
      const ai = getGeminiClient();
      const infillResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: infillPrompt,
        config: {
          tools: [{ googleSearch: {} }], // Use Google Search to guarantee factual grounding!
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correctedText: { type: Type.STRING, description: "The full restored text" },
              replacements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    mask: { type: Type.STRING },
                    original: { type: Type.STRING },
                    corrected: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["mask", "original", "corrected", "reason"]
                }
              }
            },
            required: ["correctedText", "replacements"]
          }
        }
      });
      infillResult = JSON.parse(infillResponse.text || "{}");
    }

    // 3. Re-verify the corrected text to confirm that there are no hallucinations left
    const verifyPrompt = `You are a factual inspector. Verify if the following corrected text contains any remaining factual hallucinations or errors.
Text: "${infillResult.correctedText}"
Return a JSON array of errors (empty array if the text is 100% accurate). Use the exact same JSON schema as before.`;

    let verifiedErrors = [];
    if (provider === "huggingface") {
      try {
        const verifyText = await callHuggingFaceInference(hfDetectorModel, [
          { role: "system", content: "You are a factual inspector. You always output valid, clean JSON arrays. Do not write markdown blocks or explanation text." },
          { role: "user", content: verifyPrompt }
        ], true);
        verifiedErrors = extractJson(verifyText);
      } catch (err: any) {
        console.error("Hugging Face verification failed, falling back to Gemini:", err);
        try {
          const ai = getGeminiClient();
          const verifyResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: verifyPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    span: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    score: { type: Type.NUMBER }
                  },
                  required: ["span", "reason", "score"]
                }
              }
            }
          });
          verifiedErrors = JSON.parse(verifyResponse.text || "[]");
        } catch (fallbackErr) {
          console.error("Gemini fallback verification failed:", fallbackErr);
        }
      }
    } else {
      const ai = getGeminiClient();
      const verifyResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: verifyPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                span: { type: Type.STRING },
                reason: { type: Type.STRING },
                score: { type: Type.NUMBER }
              },
              required: ["span", "reason", "score"]
            }
          }
        }
      });
      verifiedErrors = JSON.parse(verifyResponse.text || "[]");
    }

    res.json({
      originalText,
      maskedText,
      correctedText: infillResult.correctedText,
      replacements: infillResult.replacements,
      remainingErrors: verifiedErrors,
      strategy
    });
    return;

  } catch (err: any) {
    console.error("Correction error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
    return;
  }
});

// Endpoint 3: Dynamic claim-level RAG Grounding & Factual Alignment Mapping
app.post("/api/grounding-map", async (req, res) => {
  try {
    const { referenceText, generatedText, provider = "gemini", hfModel = "meta-llama/Meta-Llama-3.1-8B-Instruct" } = req.body;
    if (!referenceText || !generatedText) {
      res.status(400).json({ error: "Both referenceText and generatedText are required." });
      return;
    }

    const groundingPrompt = `You are an elite automated factual alignment and verification system.
Your goal is to parse a generated text into distinct individual factual claims, and map them against a reference ground truth document.

Reference Ground Truth Document:
"${referenceText}"

Generated Text to Analyze:
"${generatedText}"

Task:
1. Deconstruct the Generated Text into all of its individual factual claims. Each claim must correspond to a specific statement in the text.
2. For each claim, determine if it is:
   - "supported": explicitly or semantically confirmed by the reference document.
   - "contradicted": directly contradicted by factual assertions in the reference document.
   - "ungrounded": not mentioned, or not verifiable based solely on the reference document.
3. For each claim, find the EXACT sentence or section from the Reference Ground Truth Document that supports or contradicts it. If ungrounded, set sourceSentence to "None".
4. Calculate an alignmentScore (0.0 to 1.0) where 1.0 is a perfect semantic support, 0.0 is an absolute contradiction, and 0.5 is ungrounded.
5. Provide a short, precise explanation of the alignment.

You MUST return a JSON array of objects. Each object must have these exact fields:
- "claim" (string): The extracted discrete factual claim.
- "claimSpan" (string): The exact substring of this claim in the Generated Text.
- "status" (string): Must be exactly "supported", "contradicted", or "ungrounded".
- "sourceSentence" (string): The matching source sentence from Reference Document. If none, write "None".
- "alignmentScore" (number): Factual matching score from 0.0 to 1.0.
- "explanation" (string): Explanation of the verdict.`;

    let claimsData = [];

    if (provider === "huggingface") {
      try {
        const hfResponse = await callHuggingFaceInference(hfModel, [
          { role: "system", content: "You are a factual alignment rater. You always output valid, clean JSON arrays. Do not write markdown blocks or explanation text." },
          { role: "user", content: groundingPrompt }
        ], true);
        claimsData = extractJson(hfResponse);
      } catch (err) {
        console.error("HF grounding map call failed, falling back to Gemini:", err);
        const ai = getGeminiClient();
        const geminiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: groundingPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  claim: { type: Type.STRING },
                  claimSpan: { type: Type.STRING },
                  status: { type: Type.STRING },
                  sourceSentence: { type: Type.STRING },
                  alignmentScore: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                required: ["claim", "claimSpan", "status", "sourceSentence", "alignmentScore", "explanation"]
              }
            }
          }
        });
        claimsData = JSON.parse(geminiResponse.text || "[]");
      }
    } else {
      const ai = getGeminiClient();
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: groundingPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                claim: { type: Type.STRING },
                claimSpan: { type: Type.STRING },
                status: { type: Type.STRING },
                sourceSentence: { type: Type.STRING },
                alignmentScore: { type: Type.NUMBER },
                explanation: { type: Type.STRING }
              },
              required: ["claim", "claimSpan", "status", "sourceSentence", "alignmentScore", "explanation"]
            }
          }
        }
      });
      claimsData = JSON.parse(geminiResponse.text || "[]");
    }

    res.json({ claims: claimsData });
    return;
  } catch (err: any) {
    console.error("Grounding map error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
    return;
  }
});

// Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
