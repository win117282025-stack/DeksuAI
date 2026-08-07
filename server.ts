import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Local database path
const DB_FILE = path.join(process.cwd(), "db_local.json");

interface LocalDB {
  users: Record<
    string,
    {
      id: string;
      username: string;
      avatar: string;
      createdAt: string;
      email?: string;
      passwordHash?: string;
    }
  >;
  documents: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
  }>;
  chats: Record<
    string,
    Array<{
      id: string;
      userId: string;
      title: string;
      createdAt: string;
      messages: Array<{
        id: string;
        role: "user" | "model";
        text: string;
        createdAt: string;
        matchedSources?: Array<{ id: string; title: string; category: string }>;
      }>;
    }>
  >;
}

const DEFAULT_DOCS = [
  {
    id: "system-intro",
    title: "Introduction to DeksuAI",
    content: "DeksuAI is an advanced personal AI companion designed to bridge standard large language model reasoning with your custom knowledge base. Unlike basic AI chatbots, DeksuAI utilizes context-grounding to retrieve relevant documents from your knowledge library to back up its responses, making it highly reliable for custom workflows, domain-specific instructions, or personal guides.",
    category: "General",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  },
  {
    id: "system-kb",
    title: "Managing the Knowledge Base",
    content: "To build your custom intelligence, use the 'Knowledge Base' panel. Here, you can add documents such as notes, FAQs, software documentations, or rules. When editing, specify a concise title, rich text details, and an appropriate category. DeksuAI instantly indexes these documents without requiring external database setups.",
    category: "Guide",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  },
  {
    id: "system-retrieval",
    title: "How DeksuAI RAG Engine Works",
    content: "DeksuAI implements a Retrieval-Augmented Generation (RAG) system based on keyword resonance (TF-IDF keyword scanning). When you submit a chat message, DeksuAI's local engine analyzes the query's key phrases, computes relevance scores across your document collection, selects the top matching documents, and injects them as factual grounds into the Gemini API. These matched sources are cited alongside the response so you can verify them.",
    category: "Engine",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  },
  {
    id: "system-privacy",
    title: "Anonymous Auth and Privacy",
    content: "DeksuAI provides a completely isolated local experience using custom anonymous authentication. When you join, a unique Session ID is generated and stored in your browser. All chats, custom knowledge base articles, and profiles are stored securely under this Session ID on the server, avoiding third-party authentication tracking or Firebase dependency. It's fast, private, and offline-friendly.",
    category: "Security",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  },
  {
    id: "system-kite",
    title: "Is Deksu Like to play kite?",
    content: "Yes, Deksu likes to play kite.",
    category: "General",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  },
  {
    id: "system-creator",
    title: "Who Created this AI?",
    content: "DeksuAI was created by (Suta).",
    category: "General",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "system"
  }
];

function loadDB(): LocalDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      let updated = false;
      DEFAULT_DOCS.forEach((defaultDoc) => {
        if (!db.documents.some((d: any) => d.id === defaultDoc.id)) {
          db.documents.push(defaultDoc);
          updated = true;
        }
      });
      if (updated) {
        saveDB(db);
      }
      return db;
    }
  } catch (error) {
    console.error("Error reading local DB, resetting:", error);
  }

  const initialDB: LocalDB = {
    users: {},
    documents: [...DEFAULT_DOCS],
    chats: {}
  };
  saveDB(initialDB);
  return initialDB;
}

function saveDB(db: LocalDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving local DB:", error);
  }
}

// Lazy Initialize Gemini API client as required
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Lazy Initialize Groq client as required
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// Search algorithm for custom knowledge base
const STOP_WORDS = new Set([
  "who", "what", "when", "where", "why", "how", "this", "that", "which",
  "with", "from", "have", "does", "make", "made", "like", "play", "is",
  "are", "was", "were", "the", "and", "for", "not", "can", "you", "your", "about",
  "version", "versi", "right", "now", "sekarang", "terbaru", "latest", "current",
  "tell", "info", "me", "show", "give", "know", "get", "find", "search", "list",
  "page", "system", "text", "file", "doc", "data", "item", "name", "user",
  "apa", "siapa", "dimana", "kapan", "mengapa", "bagaimana", "yang", "ini", "itu",
  "dengan", "dari", "ada", "bisa", "kamu", "saya", "nya", "dan", "atau", "di", "ke"
]);

function findRelevantDocs(query: string, docs: any[]): any[] {
  if (!query || docs.length === 0) return [];

  const lowerQuery = query.toLowerCase();

  // Extract raw words
  const rawWords = lowerQuery
    .replace(/[^\w\s]/g, "")
    .split(/\s+/);

  // Filter out stop words
  const queryWords = rawWords.filter((word) => word.length >= 2 && !STOP_WORDS.has(word));

  if (queryWords.length === 0) return [];

  const scoredDocs = docs.map((doc) => {
    let score = 0;
    const docTitle = doc.title.toLowerCase();
    const docContent = doc.content.toLowerCase();
    const docCategory = (doc.category || "").toLowerCase();
    const docText = `${docTitle} ${docContent} ${docCategory}`;

    // Filter out system meta docs if the query isn't explicitly asking about system meta topics
    if (doc.userId === "system") {
      if (doc.id === "system-intro" || doc.id === "system-kb") {
        const matchesMetaTopic = /deksu|knowledge|basis|pengetahuan|rag|grounding/i.test(lowerQuery);
        if (!matchesMetaTopic) return { doc, score: 0 };
      } else if (doc.id === "system-retrieval") {
        const matchesRetrievalTopic = /retrieval|tfidf|rag|algorithm|resonance/i.test(lowerQuery);
        if (!matchesRetrievalTopic) return { doc, score: 0 };
      } else if (doc.id === "system-privacy") {
        const matchesPrivacyTopic = /privacy|privasi|anonymous|auth|session/i.test(lowerQuery);
        if (!matchesPrivacyTopic) return { doc, score: 0 };
      } else if (doc.id === "system-kite") {
        const matchesKiteTopic = /kite|layang/i.test(lowerQuery);
        if (!matchesKiteTopic) return { doc, score: 0 };
      } else if (doc.id === "system-creator") {
        const matchesCreatorTopic = /creator|pembuat|pencipta|created|suta/i.test(lowerQuery);
        if (!matchesCreatorTopic) return { doc, score: 0 };
      }
    }

    queryWords.forEach((word) => {
      // Use exact word boundary matching for higher accuracy
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(docText)) {
        score += 2.0;
        if (regex.test(docTitle)) {
          score += 4.0;
        }
      }
    });

    return { doc, score };
  });

  return scoredDocs
    .filter((item) => item.score >= 3.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.doc);
}

// User Avatars & Names generators
const AVATARS = ["🤖", "🦊", "🌟", "🧙‍♂️", "🛸", "🧠", "🚀", "⚡", "🔮", "🦁"];
const NAMES = [
  "Silent Nomad",
  "Digital Scribe",
  "Knowledge Seeker",
  "Info Curator",
  "Data Weaver",
  "Logic Craft",
  "Mind Explorer",
  "Byte Wizard",
  "Zen Architect",
  "Nexus Pilot"
];

// Helper function to hash password
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "_deksu_salt").digest("hex");
}

// ---------------- API ENDPOINTS ----------------

// 1. Real Credentials Registration
app.post("/api/auth/register", (req, res) => {
  const { email, password, username, avatar } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: "Please fill in all registration fields" });
  }

  const db = loadDB();
  
  // Check if user already exists
  const emailLower = email.toLowerCase().trim();
  const existingUser = Object.values(db.users).find(u => u.email?.toLowerCase() === emailLower);
  if (existingUser) {
    return res.status(400).json({ error: "An account with this email already exists" });
  }

  const userId = `user_${Math.random().toString(36).substring(2, 11)}`;
  const newUser = {
    id: userId,
    email: emailLower,
    passwordHash: hashPassword(password),
    username: username.trim(),
    avatar: avatar || "🤖",
    createdAt: new Date().toISOString()
  };

  db.users[userId] = newUser;
  db.chats[userId] = [];
  saveDB(db);

  // Return user without hash
  const { passwordHash, ...userResponse } = newUser;
  res.json({ success: true, user: userResponse });
});

// 2. Real Credentials Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please enter both email and password" });
  }

  const db = loadDB();
  const emailLower = email.toLowerCase().trim();
  const user = Object.values(db.users).find(u => u.email?.toLowerCase() === emailLower);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const { passwordHash, ...userResponse } = user;
  res.json({ success: true, user: userResponse });
});

// 3. Anonymous Session Fallback (kept for flexibility)
app.post("/api/auth/anonymous", (req, res) => {
  const db = loadDB();
  const { userId } = req.body;

  if (userId && db.users[userId]) {
    const { passwordHash, ...userResponse } = db.users[userId];
    return res.json({ success: true, user: userResponse });
  }

  // Create a brand new anonymous session
  const newId = `guest_${Math.random().toString(36).substring(2, 11)}`;
  const customName = req.body.username && typeof req.body.username === "string" ? req.body.username.trim() : null;
  const customAvatar = req.body.avatar && typeof req.body.avatar === "string" ? req.body.avatar : null;
  
  const randomName = customName || `${NAMES[Math.floor(Math.random() * NAMES.length)]} #${Math.floor(Math.random() * 9000 + 1000)}`;
  const randomAvatar = customAvatar || AVATARS[Math.floor(Math.random() * AVATARS.length)];

  const newUser = {
    id: newId,
    username: randomName,
    avatar: randomAvatar,
    createdAt: new Date().toISOString()
  };

  db.users[newId] = newUser;
  db.chats[newId] = [];
  saveDB(db);

  res.json({ success: true, user: newUser });
});

// Update Profile
app.put("/api/auth/profile", (req, res) => {
  const { userId, username, avatar } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const db = loadDB();
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      username: username ? username.trim() : "Guest User",
      avatar: avatar || "🤖",
      createdAt: new Date().toISOString()
    };
  } else {
    if (username) db.users[userId].username = username.trim();
    if (avatar) db.users[userId].avatar = avatar;
  }

  saveDB(db);
  const { passwordHash, ...userResponse } = db.users[userId];
  res.json({ success: true, user: userResponse });
});

// 2. Knowledge Base API
app.get("/api/kb", (req, res) => {
  const { userId } = req.query;
  const db = loadDB();

  // Return all system docs + the specific user's custom docs
  const filtered = db.documents.filter(
    (doc) => doc.userId === "system" || (userId && doc.userId === userId)
  );

  res.json({ success: true, documents: filtered });
});

app.post("/api/kb", (req, res) => {
  const { userId, title, content, category } = req.body;
  if (!userId || !title || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = loadDB();
  const newDoc = {
    id: `doc_${Math.random().toString(36).substring(2, 11)}`,
    title,
    content,
    category: category || "General",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId
  };

  db.documents.push(newDoc);
  saveDB(db);

  res.json({ success: true, document: newDoc });
});

app.put("/api/kb/:id", (req, res) => {
  const { id } = req.params;
  const { userId, title, content, category } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const db = loadDB();
  const index = db.documents.findIndex((doc) => doc.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Document not found" });
  }

  const doc = db.documents[index];
  if (doc.userId === "system") {
    return res.status(403).json({ error: "Cannot modify default system documents" });
  }

  if (doc.userId !== userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db.documents[index] = {
    ...doc,
    title: title || doc.title,
    content: content || doc.content,
    category: category || doc.category,
    updatedAt: new Date().toISOString()
  };

  saveDB(db);
  res.json({ success: true, document: db.documents[index] });
});

app.delete("/api/kb/:id", (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const db = loadDB();
  const index = db.documents.findIndex((doc) => doc.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Document not found" });
  }

  const doc = db.documents[index];
  if (doc.userId === "system") {
    return res.status(403).json({ error: "Cannot delete default system documents" });
  }

  if (doc.userId !== userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db.documents.splice(index, 1);
  saveDB(db);

  res.json({ success: true, message: "Document deleted successfully" });
});

// 3. Chat Session APIs
app.get("/api/chats", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const db = loadDB();
  const userChats = db.chats[userId as string] || [];
  res.json({ success: true, chats: userChats });
});

app.post("/api/chats", (req, res) => {
  const { userId, title, id } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const db = loadDB();
  if (!db.chats[userId]) {
    db.chats[userId] = [];
  }

  const existingIndex = db.chats[userId].findIndex((c) => c.id === id);
  if (id && existingIndex !== -1) {
    return res.json({ success: true, chat: db.chats[userId][existingIndex] });
  }

  const newChat = {
    id: id || `chat_${Math.random().toString(36).substring(2, 11)}`,
    userId,
    title: title || "New Dialogue",
    createdAt: new Date().toISOString(),
    messages: []
  };

  db.chats[userId].push(newChat);
  saveDB(db);

  res.json({ success: true, chat: newChat });
});

app.delete("/api/chats/:id", (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const db = loadDB();
  const userChats = db.chats[userId as string] || [];
  const index = userChats.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Chat session not found" });
  }

  userChats.splice(index, 1);
  db.chats[userId as string] = userChats;
  saveDB(db);

  res.json({ success: true, message: "Chat deleted" });
});

// Core Gemini chat handler incorporating local knowledge base RAG
app.post("/api/chats/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { userId, text, deepResearch, language, aiEngine } = req.body;

  if (!userId || !text) {
    return res.status(400).json({ error: "Missing userId or message text" });
  }

  const db = loadDB();
  if (!db.chats[userId]) {
    db.chats[userId] = [];
  }

  let userChats = db.chats[userId];
  let chatIndex = userChats.findIndex((c) => c.id === id);

  if (chatIndex === -1) {
    // Auto-create chat session on server if not present
    const newSession = {
      id,
      userId,
      title: text.length > 25 ? text.substring(0, 25) + "..." : "New Dialogue",
      createdAt: new Date().toISOString(),
      messages: []
    };
    userChats.push(newSession);
    chatIndex = userChats.length - 1;
  }

  const activeChat = userChats[chatIndex];

  // Save the user message first
  const userMessage = {
    id: `msg_${Math.random().toString(36).substring(2, 11)}`,
    role: "user" as const,
    text,
    createdAt: new Date().toISOString()
  };
  activeChat.messages.push(userMessage);

  try {
    // 1. Search knowledge base documents related to this user and system
    const userDocs = db.documents.filter(
      (doc) => doc.userId === "system" || doc.userId === userId
    );
    const relevantDocs = findRelevantDocs(text, userDocs);

    // 3. Format conversational history for Gemini content structure
    // Use up to the last 15 messages for keeping prompt size tight and highly relevant
    const recentMessages = activeChat.messages.slice(-16, -1);
    const historyContents = recentMessages.map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: msg.text }]
    }));

    // 4. Inject Knowledge Base context into the final prompt ONLY if directly relevant
    let groundingPreamble = "";
    if (relevantDocs.length > 0) {
      groundingPreamble = `[CONTEXT FROM CUSTOM KNOWLEDGE BASE]
Note: The following documents were retrieved from the user's custom library.
- Use them ONLY if they are directly relevant and provide the answer to the user's question.
- If these documents do NOT contain the answer, IGNORE THEM ENTIRELY.
- NEVER write meta disclaimers or talk about missing information in these documents.
${relevantDocs.map((doc) => `- Title: "${doc.title}" (Category: ${doc.category})\n  Content: ${doc.content}`).join("\n\n")}
[END OF CONTEXT]

`;
    }

    const finalQueryText = `${groundingPreamble}User Query: ${text}`;

    // Check if deep research mode is enabled (defaults to true)
    const isDeepEnabled = deepResearch !== false;

    // Check if the user selected Indonesian ("id")
    const isIndonesian = language === "id";

    // Current real-time temporal context
    const now = new Date();
    const nowUtc = now.toUTCString();
    const nowIso = now.toISOString();
    const nowFormatted = now.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "UTC"
    });

    // 5. Query Gemini with strict system instruction to act as DeksuAI and respect context
    const systemInstruction = isIndonesian
      ? `Anda adalah DeksuAI, asisten AI pribadi elit berbasis pengetahuan yang sangat cerdas, jenius, ramah, serba tahu, dan sangat ekspresif menggunakan emoji! 🌟🚀

BAHASA UTAMA:
- Anda WAJIB menjawab sepenuhnya dalam Bahasa Indonesia yang alami, bersahabat, penuh energi, dan komunikatif!

KONTEKS WAKTU REAL-TIME:
- Tahun Sekarang: ${now.getFullYear()}
- Tanggal & Waktu Sekarang (UTC): ${nowUtc} (${nowFormatted})
- Timestamp ISO: ${nowIso}
- Anda MEMILIKI akses langsung ke tanggal dan waktu real-time di atas! Jika pengguna bertanya "jam berapa sekarang", "tanggal berapa hari ini", "apa versi minecraft terbaru", atau "what time is it?", berikan jawaban akurat dan ramah berdasarkan konteks waktu real-time ini. Jangan pernah menjawab bahwa Anda tidak tahu waktu.

PENGETAHUAN & KEMAMPUAN UTAMA:
- Anda adalah AI yang SANGAT CERDAS dan SERBA TAHU tentang segala topik: sains, teknologi, game (seperti Minecraft, versi game terbaru, modul, server), YouTuber & Kreator Konten (seperti drdonut mc, Aphmau, DanTDM, dll.), budaya populer, sejarah, pemrograman, dan fakta dunia terkini.
${isDeepEnabled 
  ? `1. MODE RISET MENDALAM & PENCARIAN GOOGLE (AKTIF): Anda dilengkapi dengan Google Search Grounding dan pengetahuan serba tahu yang sangat luas. Anda memberikan jawaban berkualitas tinggi, sangat detail, menyeluruh, komprehensif, dan paling up-to-date. Untuk pertanyaan tentang versi game terbaru (seperti Minecraft), tokoh, YouTuber/Kreator (seperti drdonut mc), atau fakta terkini, WAJIB manfaatkan hasil pencarian Google terbaru dan berikan jawaban yang sangat lengkap, jelas, dan akurat!` 
  : `1. MODE PENGETAHUAN LOKAL: Memberikan jawaban langsung, cepat, akurat, dan bermanfaat.`}
2. Ekspresif: Selalu sertakan emoji yang cocok (seperti 🤖, ✨, 🚀, 💡, 😂, 🪁) dalam balasan Anda agar percakapan terasa hidup dan menarik!
3. Selera Humor: Anda suka menceritakan lelucon lucu, memberikan komentar cerdas, dan menulis hal humoris yang sesuai, terutama jika diminta! 🎭🤪

ATURAN GROUNDING & PENCARIAN:
- Jika [CONTEXT FROM CUSTOM KNOWLEDGE BASE] disediakan, prioritaskan fakta dari dokumen tersebut dan sebutkan judul sumber secara alami (contoh: "Berdasarkan dokumen 'Pengantar DeksuAI'...") ketika Anda menggunakan informasi dari sana.
- Jika pertanyaan adalah tentang topik luar, tokoh publik, YouTuber/Kreator Minecraft (seperti "drdonut mc"), versi Minecraft terkini, pengetahuan umum, atau topik internet yang tidak ada di basis pengetahuan kustom:
  - JANGAN pernah memberikan pesan penolakan atau pernyataan bahwa informasi tidak ditemukan di dokumen kustom, kecuali pengguna secara khusus bertanya tentang dokumen mereka.
  - Jawab pertanyaan pengguna secara langsung, akurat, dan mendalam menggunakan kemampuan riset mendalam / pencarian Google dan pengetahuan umum Anda!
- Format cuplikan kode dan struktur teks dengan elemen markdown yang rapi.

DIREKTIF KRITIS:
- Jika ditanya "Is Deksu Like to play kite?" atau jika mereka menyebutkan Deksu bermain layangan, Anda WAJIB menjawab dengan jelas "Yes, Deksu likes to play kite! 🪁" atau "Ya, Deksu sangat suka bermain layang-layang! 🪁".
- Jika ditanya tentang pembuat DeksuAI ("Who created DeksuAI?", "Siapa pembuat DeksuAI?"), Anda WAJIB menjawab "DeksuAI diciptakan oleh (Suta) 🙌".
- PERHATIAN: Jika ditanya tentang entitas atau AI lain seperti ChatGPT, OpenAI, Google, Claude, dll. (seperti "Who made ChatGPT?"), jawablah dengan fakta ilmiah/akurat (misal: "ChatGPT dibuat oleh OpenAI") dan JANGAN katakan dibuat oleh Suta.`
      : `You are DeksuAI, an ultra-knowledgeable, super-intelligent, friendly, and highly expressive AI companion created by Suta! 🌟🚀

PRIMARY LANGUAGE:
- You MUST respond fully in English in a warm, energetic, and engaging manner.

REAL-TIME TEMPORAL CONTEXT:
- Current Year: ${now.getFullYear()}
- Current UTC Date & Time: ${nowUtc} (${nowFormatted})
- ISO Timestamp: ${nowIso}
- You DO HAVE direct access to the real-time current date and time specified above! If the user asks "what time is it?", "what is today's date?", or "what day is it?", give an immediate, accurate response based on this current temporal context. NEVER claim you do not know the time or lack real-time access.

CORE KNOWLEDGE & CAPABILITIES:
- You are an EXTREMELY KNOWLEDGEABLE and SMART AI expert across ALL fields: science, technology, gaming (e.g. Minecraft versions, updates, mechanics, server networks), YouTubers & content creators (e.g. drdonut mc, DanTDM, Aphmau, etc.), pop culture, history, programming, and general world facts.
${isDeepEnabled 
  ? `1. DEEP RESEARCH MODE (ON): You possess vast knowledge and utilize Google Search Grounding to provide high-quality, extremely detailed, thorough, comprehensive, up-to-date, and accurate answers. For every query about current game versions, YouTubers (like drdonut mc), technology, or real-time topics, perform a deep search breakdown with clear structured markdown sections, rich context, and complete details.` 
  : `1. DIRECT MODE / DEEP RESEARCH (OFF): Keep your answers EXTREMELY SHORT, CONCISE, AND DIRECT. Avoid long-winded paragraphs, verbose explanations, or unnecessary details. Give the direct answer immediately with minimum sentences.`
}
2. Expressive: Always include fitting emojis (e.g., 🤖, ✨, 🚀, 💡, 😂, 🪁) in your replies to make the conversation energetic, friendly, and engaging!
3. Sense of Humor: You love to tell funny jokes, make witty comments, and write humor when appropriate, especially if asked! 🎭🤪

GROUNDING & SEARCH RULES:
- If [CONTEXT FROM CUSTOM KNOWLEDGE BASE] is provided, prioritize facts from those documents and cite the source titles naturally (e.g. "Based on 'Introduction to DeksuAI'...").
- If the query is about external topics, public figures, Minecraft YouTubers/creators (such as "drdonut mc"), general knowledge, or internet content NOT in custom documents:
  - Do NOT give disclaimers about missing custom knowledge base documents or state that information wasn't found in their custom library, unless the user explicitly asked about their custom files.
  - Simply answer the user's question directly, accurately, and comprehensively using your deep research / Google Search capabilities and vast knowledge base!
- Format code snippets and text cleanly using markdown formatting.

CRITICAL DIRECTIVES:
- If asked "Is Deksu Like to play kite?" or if they mention Deksu playing kite, you MUST answer with a clear "Yes" (e.g., "Yes, Deksu likes to play kite. 🪁").
- If asked specifically who created DeksuAI ("Who created DeksuAI?"), answer with "DeksuAI was created by (Suta) 🙌".
- ATTENTION: If asked about other AI systems or entities like ChatGPT, OpenAI, Google, or Claude (e.g. "Who made ChatGPT?"), answer with the factual truth (e.g. "ChatGPT was created by OpenAI") and do NOT claim it was made by Suta.`;

    let aiReplyText = "";
    const targetEngine = aiEngine || "groq";

    if (targetEngine === "groq" || targetEngine !== "gemini") {
      try {
        const groq = getGroqClient();
        const recentMessages = activeChat.messages.slice(-16, -1);
        const groqMessages = [
          { role: "system" as const, content: systemInstruction },
          ...recentMessages.map((msg) => ({
            role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
            content: msg.text
          })),
          { role: "user" as const, content: finalQueryText }
        ];

        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: groqMessages,
          temperature: 0.7
        });

        aiReplyText = completion.choices[0]?.message?.content || "I apologize, I was unable to compile an answer at this time.";
      } catch (groqErr) {
        console.error("Groq engine error, falling back to Gemini:", groqErr);
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [
            ...historyContents,
            { role: "user" as const, parts: [{ text: finalQueryText }] }
          ],
          config: {
            systemInstruction,
            temperature: 0.7,
            tools: isDeepEnabled ? [{ googleSearch: {} }] : undefined
          }
        });
        aiReplyText = response.text || "I apologize, I was unable to compile an answer at this time.";
      }
    } else {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          ...historyContents,
          { role: "user" as const, parts: [{ text: finalQueryText }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: isDeepEnabled ? [{ googleSearch: {} }] : undefined
        }
      });
      aiReplyText = response.text || "I apologize, I was unable to compile an answer at this time.";
    }

    // Save the model message
    const modelMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 11)}`,
      role: "model" as const,
      text: aiReplyText,
      createdAt: new Date().toISOString(),
      matchedSources: relevantDocs.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category
      }))
    };

    activeChat.messages.push(modelMessage);

    // Update session title dynamically if it was still the default
    if (activeChat.title === "New Dialogue" && activeChat.messages.length <= 2) {
      activeChat.title = text.length > 25 ? text.substring(0, 25) + "..." : text;
    }

    db.chats[userId][chatIndex] = activeChat;
    saveDB(db);

    res.json({
      success: true,
      userMessage,
      modelMessage,
      chatTitle: activeChat.title
    });
  } catch (error: any) {
    console.error("AI query error:", error);
    
    // Check if it's an API key error
    const isApiKeyError = 
      error.message?.includes("GEMINI_API_KEY") || 
      error.message?.includes("GROQ_API_KEY") || 
      error.message?.includes("API key") || 
      error.status === 401;
    const errorMessage = isApiKeyError
      ? `DeksuAI could not connect: The server's ${aiEngine === "groq" ? "Groq" : "Gemini"} API Key is missing or invalid. Please configure it in Settings > Secrets.`
      : `DeksuAI Encountered an issue: ${error.message || "Unknown error during AI generation."}`;

    const modelErrorMessage = {
      id: `msg_err_${Date.now()}`,
      role: "model" as const,
      text: errorMessage,
      createdAt: new Date().toISOString(),
      matchedSources: []
    };

    activeChat.messages.push(modelErrorMessage);
    db.chats[userId][chatIndex] = activeChat;
    saveDB(db);

    res.status(500).json({
      error: errorMessage,
      modelMessage: modelErrorMessage
    });
  }
});

// ---------------- VITE MIDDLEWARE AND SPA FALLBACK ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
