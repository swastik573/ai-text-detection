require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "demo",
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

// Store uploaded PDF content in memory
let currentPdfContent = "";

// API Routes

// Upload PDF endpoint
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No PDF file uploaded",
      });
    }

    // Parse PDF content
    const pdfData = await pdfParse(req.file.buffer);
    currentPdfContent = pdfData.text;

    res.json({
      success: true,
      message: "PDF uploaded and processed successfully!",
      filename: req.file.originalname,
      contentLength: currentPdfContent.length,
      preview: currentPdfContent.substring(0, 200) + "...",
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).json({
      error: "Failed to process PDF file",
      details: error.message,
    });
  }
});

// Text matching endpoint
app.post("/api/match", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "No text provided for matching",
      });
    }

    if (!currentPdfContent) {
      return res.status(400).json({
        error: "No PDF uploaded yet. Please upload a PDF first.",
      });
    }

    // Calculate confidence using OpenAI or demo mode
    let confidence;
    let processingTime;
    const startTime = Date.now();

    if (process.env.OPENAI_API_KEY) {
      confidence = await calculateOpenAIConfidence(text, currentPdfContent);
    } else {
      return res.status(400).json({
        error:
          "OpenAI API key is not set. Please set the OPENAI_API_KEY environment variable.",
      });
    }

    processingTime = Date.now() - startTime;

    // Determine quality
    let quality = "";
    if (confidence >= 90) quality = "Excellent Match";
    else if (confidence >= 70) quality = "Good Match";
    else if (confidence >= 50) quality = " Moderate Match";
    else if (confidence >= 30) quality = "Weak Match";
    else quality = " No Match";

    res.json({
      success: true,
      confidence: confidence,
      quality: quality,
      processingTime: processingTime,
      inputText: text,
      mode: process.env.OPENAI_API_KEY ? "OpenAI GPT-4o" : "Demo Mode",
    });
  } catch (error) {
    console.error("Text matching error:", error);
    res.status(500).json({
      error: "Failed to process text matching",
      details: error.message,
    });
  }
});

// OpenAI confidence calculation
async function calculateOpenAIConfidence(userInput, pdfContent) {
  try {
    const prompt = `
  You are a text matching expert. Analyze how well the user input matches the document content.
  
  DOCUMENT CONTENT:
  """
  ${pdfContent}
  """
  
  USER INPUT:
  """
  ${userInput}
  """
  
  Calculate a confidence percentage (0-100) for how well the user input matches the document content.
  
  RULES:
  - Return ONLY a number between 0-100 (no percentage symbol, no explanation)
  - 100 = Perfect exact match found in document
  - 90-99 = Very close semantic match or slight variations
  - 70-89 = Good semantic match with related concepts
  - 50-69 = Moderate match with some relevant content
  - 30-49 = Weak match with minimal relevance
  - 0-29 = No meaningful match found
  
  EDGE CASES TO HANDLE:
  1. Exact match but different formatting (case-insensitive, spaces, line breaks)
  2. Punctuation or symbols vs words (e.g., "%" vs "percent")
  3. Synonyms and semantic equivalents (e.g., "staff" vs "employees")
  4. Partial matches (e.g., product name only vs full description)
  5. Multiple mentions / repeated phrases (avoid double counting)
  6. Extra noise words in input (should not inflate score to 100)
  7. Numerical variations (e.g., "$50M" vs "50 million USD")
  8. Abbreviations vs full forms (e.g., "CEO" vs "Chief Executive Officer")
  9. Near-misses / misleading matches (correct field but wrong value → score lower)
  10. Empty or irrelevant input (score 0–29)
  11. Stopwords only (e.g., "and the of a" → score 0)
  12. Substring overlaps that are too generic (e.g., just "mobile" → weak match)
  13. Typo handling:
     - If input is a **close typo** (edit distance 1–2 from a document word) → score 40–60
     - If input is a **recognizable fragment** (truncated but clear root, e.g., "scizze" from "Scizzers") → score 40–50
     - If input is **very short/ambiguous fragment** (e.g., "sci", "sc") → score 0–30 depending on ambiguity
  
  RESPOND WITH ONLY THE NUMBER:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a precise text matching system. Return only numerical confidence scores.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });
    console.log(JSON.stringify(response, null, 2));

    const confidence = parseInt(response.choices[0].message.content.trim());
    return isNaN(confidence) ? 0 : Math.min(100, Math.max(0, confidence));
  } catch (error) {
    console.error("OpenAI API error:", error);
    return 0;
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 10MB." });
    }
  }

  if (error.message === "Only PDF files are allowed!") {
    return res.status(400).json({ error: "Only PDF files are allowed!" });
  }

  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(` PDF Text Matcher Backend running on http://localhost:${PORT}`);
  console.log(
    `🤖 OpenAI Mode: ${
      process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "demo"
        ? "Enabled"
        : "Disabled"
    }`
  );
});
