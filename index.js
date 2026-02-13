
const Cerebras=require('@cerebras/cerebras_cloud_sdk');
const express=require("express");
const { v4: uuidv4 } = require('uuid');
const app=express();
const path=require('path');
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,"public")));
require('dotenv').config();


const client = new Cerebras({
 apiKey: process.env.CEREBRAS_API_KEY,
});

app.get('/',function (req,res){
   res.sendFile(path.join(__dirname,"/public/index.html")) //,{text:""}
})

app.post("/sub", async (req, res) => {


  const title = req.body.title;
const level = req.body.level || "Beginner";

let depthInstruction = "";

if (level === "Beginner") {
  depthInstruction = `
  Explain in very simple language.
  Avoid technical jargon.
  Use analogies and real-life examples.
  Focus on clarity.
  `;
}
else if (level === "Intermediate") {
  depthInstruction = `
  Use proper technical terms.
  Include structured explanation and examples.
  Explain internal working clearly.
  `;
}
else if (level === "Advanced") {
  depthInstruction = `
  Provide deep conceptual explanation.
  Include internal mechanisms.
  Discuss tradeoffs.
  Include edge cases and design implications.
  Assume reader understands basics.
  `;
}



  if (!title || typeof title !== "string" || title.trim().length < 2) {
    return res.status(400).json({ error: "Invalid topic" });
  }

  const sessionId = uuidv4();

const prompt = `
You are an expert teacher focused on deep conceptual clarity.

The student is studying the topic: "${title}" at ${level} level.

TASK:

1. Identify exactly 5 important subtopics under "${title}".
2. For EACH subtopic:
   - Provide a detailed, well-written explanation.
   - Adapt the explanation naturally based on the subtopic.
   - Use examples, intuition, and reasoning where appropriate.
   - Do NOT follow rigid formatting sections.
   - Teach clearly and logically.
3. After teaching all 5 subtopics, generate 5 quiz questions:
   - One question per subtopic.
   - Medium difficulty.
   - Each question must include the related subtopic name.

   ${depthInstruction}
Return STRICTLY in this JSON format:



{
  "subtopic": [
    {
      "title": "...",
      "content": "..."
    }
  ],

  "quiz": [
    {
      "question": "Question text",
      "subtopic": "Must match one of the generated subtopics",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "answer": "A"
    }
  ]
}

Requirements:
- Teach deeply and conceptually.
- Do not give short textbook definitions.
- Avoid generic language.
- Make explanations detailed and logically structured.
- No markdown.
- No extra commentary.
- Only raw valid JSON.
`;

try {



  const response = await client.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b',
  });



  const rawText = response.choices[0].message.content;

  console.log("RAW TEXT:");


  let parsed;

  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error("JSON PARSE FAILED:", err);
    return res.status(500).json({ error: "Invalid AI JSON" });
  }

  res.json({
    sessionId,
    module: parsed
  });

} catch (error) {
  console.error("FULL ERROR:", error);
  res.status(500).json({ error: error.message });
}
});


app.post("/performance", (req, res) => {
  const { sessionId, performanceData } = req.body;

  if (!sessionId || !performanceData) {
    return res.status(400).json({ error: "Invalid data" });
  }

  console.log("Session:", sessionId);
  console.log("Performance:", performanceData);

  res.json({ status: "saved" });
});

app.post("/reinforce", async (req, res) => {

  const { weakTopics } = req.body;

  if (!weakTopics || !Array.isArray(weakTopics)) {
    return res.status(400).json({ error: "Invalid topics" });
  }

  const prompt = `
  Generate 3 reinforcement quiz questions only for these weak subtopics:
  ${weakTopics.join(", ")}

  Medium difficulty.
  Return only valid JSON.
  `;

  try {
    const response = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b',
    });

    res.json({ text: response.choices[0].message.content });

  } catch (error) {
    res.status(500).json({ error: "AI error" });
  }
});

app.post("/deep-explain", async (req, res) => {

  const { weakTopics, originalTopic } = req.body;

  if (!weakTopics || !Array.isArray(weakTopics)) {
    return res.status(400).json({ error: "Invalid topics" });
  }

  const prompt = `
You are an expert tutor.

The student is struggling with these subtopics in "${originalTopic}":
${weakTopics.join(", ")}

For EACH weak subtopic:
- Explain it in a simpler way
- Give real-world example
- Give analogy
- Highlight common mistakes
- Keep it clear and structured

Return STRICTLY in this JSON format:

[
  {
    "subtopic": "Subtopic name",
    "simplified_explanation": "Clear explanation",
    "real_world_example": "Example",
    "analogy": "Simple analogy",
    "common_mistake": "Common misunderstanding"
  }
]

Return only raw JSON.
`;

  try {

    const response = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b',
    });

    const rawText = response.choices[0].message.content;

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      return res.status(500).json({ error: "Invalid AI JSON" });
    }

    res.json({ explanations: parsed });

  } catch (error) {
    res.status(500).json({ error: "AI error" });
  }
});

app.post("/next-topic", async (req, res) => {

  const { topic, accuracy, level } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topic required" });
  }

  const prompt = `
You are a structured curriculum designer.

The student just completed the topic "${topic}" 
at ${level} level with ${accuracy}% accuracy.

IMPORTANT RULES:
- Suggest ONLY closely related next-level topics.
- Stay within the SAME subject domain.
- Do NOT jump to unrelated fields.
- Do NOT suggest completely different subjects.
- Progress deeper, not broader.

If accuracy < 60%:
Suggest foundational reinforcement topics within "${topic}".

If accuracy >= 60%:
Suggest advanced or closely related continuation topics of "${topic}".

Return STRICTLY in this JSON format:

{
  "next_topics": [
    {
      "title": "Topic name",
      "reason": "Why this logically follows from the previous topic"
    }
  ]
}

Return only raw JSON.
`;


  try {

    const response = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b',
    });

    const rawText = response.choices[0].message.content;

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      return res.status(500).json({ error: "Invalid AI JSON" });
    }

    res.json(parsed);

  } catch (error) {
    res.status(500).json({ error: "AI error" });
  }
});

app.listen(5000,function(){
  console.log("running...");
})
