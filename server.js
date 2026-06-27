// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import { GoogleGenAI } from "@google/genai";

// dotenv.config();

// const app = express();

// app.use(cors());
// app.use(express.json());

// const ai = new GoogleGenAI({
//     apiKey: process.env.GEMINI_API_KEY,
// });

// app.get("/", (req, res) => {
//     res.json({
//         message: "Sikau Nepal AI Engine Running 🚀"
//     });
// });

// app.post("/api/generate-lesson", async (req, res) => {
//     try {
//         const { topic, language } = req.body;

//         if (!topic) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Topic is required"
//             });
//         }

//         const selectedLanguage = language || "English";

//         const prompt = `
// You are an expert AI teacher for Sikau Nepal.

// Generate a complete educational lesson in STRICT JSON format.

// Topic: "${topic}"
// Language preference: "${selectedLanguage}"

// IMPORTANT LANGUAGE RULE:
// - Write ALL user-facing content in ${selectedLanguage}
// - Do not mix languages
// - JSON keys must stay in English
// - Only values should be written in ${selectedLanguage}

// IMPORTANT RULES:
// - Return ONLY valid JSON
// - No markdown
// - No explanation outside JSON
// - Make content beginner-friendly
// - Make it easy to convert into presentation slides
// - Use simple real-world examples
// - Generate minimum 8 slides

// JSON FORMAT:

// {
//   "title": "",
//   "description": "",
//   "difficulty": "",
//   "language": "${selectedLanguage}",
//   "slides": [
//     {
//       "slideNumber": 1,
//       "title": "",
//       "content": "",
//       "example": ""
//     }
//   ],
//   "quiz": [
//     {
//       "question": "",
//       "options": ["", "", "", ""],
//       "answer": ""
//     }
//   ]
// }

// Generate:
// - 8 detailed slides
// - 5 MCQ quiz questions
// `;

//         const response = await ai.models.generateContent({
//             model: "gemini-2.5-flash",
//             contents: prompt,
//         });

//         const text = response.text;

//         let parsedData;

//         try {
//             parsedData = JSON.parse(text);
//         } catch (parseError) {
//             return res.status(500).json({
//                 success: false,
//                 message: "AI returned invalid JSON",
//                 raw: text
//             });
//         }

//         res.json({
//             success: true,
//             data: parsedData
//         });

//     } catch (error) {
//         console.error(error);

//         res.status(500).json({
//             success: false,
//             message: "Lesson generation failed",
//             error: error.message
//         });
//     }
// });

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT} 🚀`);
// });


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});


async function generateWithRetry(prompt, isJson = false) {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

    for (const model of models) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                return await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: isJson
                        ? {
                              responseMimeType: "application/json",
                          }
                        : {},
                });
            } catch (error) {
                const isRetryable =
                    error.status === 503 ||
                    error.status === 429 ||
                    error.message?.includes("UNAVAILABLE");

                console.log(
                    `Model ${model} failed. Attempt ${attempt}. Error:`,
                    error.message
                );

                if (!isRetryable || attempt === 3) break;

                await new Promise((resolve) =>
                    setTimeout(resolve, attempt * 3000)
                );
            }
        }
    }

    throw new Error("All Gemini models are busy. Please try again later.");
}

function cleanJsonResponse(text) {
    return text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
}

app.get("/", (req, res) => {
    res.json({
        message: "Sikau Nepal AI Engine Running"
    });
});

// Lesson + Slides + Quiz Game API
app.post("/api/generate-lesson", async (req, res) => {
    try {
        const { topic, language } = req.body;

        if (!topic) {
            return res.status(400).json({
                success: false,
                message: "Topic is required"
            });
        }

        const selectedLanguage = language || "English";

        const prompt = `
You are an expert AI teacher for Sikau Nepal.

Generate a complete educational lesson in STRICT JSON format.

Topic: "${topic}"
Language preference: "${selectedLanguage}"

IMPORTANT LANGUAGE RULE:
- Write ALL user-facing values in ${selectedLanguage}
- Do not mix languages
- JSON keys must stay in English
- Only JSON values should be in ${selectedLanguage}

IMPORTANT RULES:
- Return ONLY valid JSON
- No markdown
- No explanation outside JSON
- Do NOT use Markdown.
- Do NOT use **, *, #, _, backticks, or bullet formatting.
- Do not bold, italicize, or format text.
- Make content beginner-friendly
- Make it easy to convert into presentation slides
- Use practical real-world examples
- Generate exactly 8 slides
- Generate quiz game with answers

JSON FORMAT:

{
  "title": "",
  "description": "",
  "difficulty": "",
  "language": "",
  "slides": [
    {
      "slideNumber": 1,
      "title": "",
      "content": "",
      "example": "",
      "speakerNotes": ""
    }
  ],
  "quizGame": {
    "gameTitle": "",
    "instructions": "",
    "totalQuestions": 5,
    "questions": [
      {
        "questionNumber": 1,
        "question": "",
        "options": ["", "", "", ""],
        "correctAnswer": "",
        "correctOptionIndex": 0,
        "explanation": "",
        "points": 10
      }
    ]
  },
  "summary": "",
  "learningOutcome": ["", "", ""]
}
`;

        const response = await generateWithRetry(prompt, true);

        // const text = cleanJsonResponse(response.text);
        const text = cleanJsonResponse(response.text || "");

        let parsedData;

        try {
            parsedData = JSON.parse(text);
        } catch (parseError) {
            return res.status(500).json({
                success: false,
                message: "AI returned invalid JSON",
                raw: text
            });
        }

        res.json({
            success: true,
            data: parsedData
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Lesson generation failed",
            error: error.message
        });
    }
});

// Conversation API
app.post("/api/chat", async (req, res) => {
    try {
        const { message, language, history } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        const selectedLanguage = language || "English";

        const conversationHistory = Array.isArray(history)
            ? history.map((item) => `
User: ${item.user || ""}
AI: ${item.ai || ""}
`).join("\n")
            : "";

        const prompt = `
You are Sikau Nepal AI Teacher.

Language preference: ${selectedLanguage}

Rules:
- Reply only in plain text.
- Do NOT use Markdown.
- Do NOT use **, *, #, _, backticks, or bullet formatting.
- Do not bold, italicize, or format text.
- Reply in ${selectedLanguage}.
- Explain simply.
- Be friendly and educational.
- If the user asks about learning, explain with examples.
- Do not mix languages unless the user asks.

Conversation history:
${conversationHistory}

User message:
${message}
`;

        const response = await generateWithRetry(prompt, false);

        res.json({
            success: true,
            reply: response.text || "Sorry, I could not generate a reply."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Chat failed",
            error: error.message
        });
    }
});



app.post("/api/voice-interview", async (req, res) => {
    try {
        const { message, topic, level, language, history } = req.body;

        const selectedLanguage = language || "English";

        const conversationHistory = Array.isArray(history)
            ? history.map((item) => {
                return `${item.role === "ai" ? "Interviewer" : "Student"}: ${item.message}`;
            }).join("\n")
            : "";

        const prompt = `
You are Sikau Nepal AI Voice Interviewer.

Topic: ${topic || "general learning"}
Level: ${level || "beginner"}
Language: ${selectedLanguage}

Rules:
Reply like a real human interviewer.
Keep your answer short because this is voice conversation.
Ask only one question at a time.
React to the student's answer first.
Then ask the next question.
Do not use markdown.
Do not use ** or bullet symbols.
Reply only in ${selectedLanguage}.

Conversation so far:
${conversationHistory}

Student said:
${message}

Now reply as the interviewer.
`;

        const response = await generateWithRetry(prompt, false);

        res.json({
            success: true,
            reply: cleanTextResponse(response.text || "")
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Voice interview failed",
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});