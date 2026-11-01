import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static("public"));

const apiKey = process.env.GEMINI_API_KEY;
console.log("Chave Gemini configurada:", Boolean(apiKey));

const RATE_LIMIT = 20;          
const RATE_WINDOW_MS = 60_000;  
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || "desconhecido";
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(ip, entry);
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: "Muitas mensagens em pouco tempo. Aguarde um minuto e tente de novo."
    });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now - entry.start > RATE_WINDOW_MS) hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

app.get("/health", (req, res) => {
  res.json({ ok: true, geminiKeyConfigured: Boolean(apiKey) });
});

app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({
        error: "A chave Gemini não está configurada no servidor."
      });
    }

    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Digite uma mensagem."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "A mensagem é muito longa."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.trim(),
      config: {
        systemInstruction: `
Você é Bernard, a inteligência artificial oficial do PouPay.

Fale sempre em português brasileiro.
Seja simpático, paciente e claro.
Ajude a organizar receitas e despesas.
Explique conceitos financeiros e ajude a criar orçamentos.
Faça cálculos usando os dados fornecidos.
Nunca invente saldos ou transações.
Nunca peça senhas bancárias ou códigos de autenticação.
Não diga que acessou contas bancárias se não tiver acesso.
Deixe claro que estimativas financeiras não são garantias.
`
      }
    });

    res.json({
      reply: response.text || "Não consegui gerar uma resposta."
    });
  } catch (error) {
    console.error("Erro na Gemini:", error);

    res.status(500).json({
      error: "Não consegui responder agora. Verifique a configuração e tente novamente."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`PouPay iniciado na porta ${port}`);
});
