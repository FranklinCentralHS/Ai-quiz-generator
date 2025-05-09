
const apiKey = "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";

async function sendPromptToChatGPT(subject, questionsInput, grade, difficulty, mc, tf, ms) {
  const unit = document.getElementById("unitInput").value.trim();

  const prompt = `
You are a quiz generator. Only return valid JSON — no explanations, no extra text.

Generate a ${questionsInput}-question quiz in JSON format.

Subject: ${subject}
${unit ? "Focus specifically on this topic within the subject: " + unit : ""}
Grade Level: ${grade}
Difficulty: ${difficulty}

You must generate **exactly and only**:
- ${mc} multiple choice question${mc !== 1 ? "s" : ""}
- ${tf} true/false question${tf !== 1 ? "s" : ""}
- ${ms} multiple select question${ms !== 1 ? "s" : ""}

⚠️ Strictly follow this breakdown. Do NOT mix question types.
⚠️ If multiple select is 0, do NOT use the format: 
  - no "select all"
  - no multiple correct answers
  - no array of answers — use a single correct answer string

For multiple-select questions (only if specified):
- Include exactly 4 options
- Only 1 to 3 options should be correct — never all 4
- Each must include a **specific, clear instruction**, such as:
  - "Select all that are prime numbers"
  - "Select all that equal 10"
- Avoid vague prompts like "Select all that apply"
- Always include at least one plausible incorrect option

Each question must include:
- "question": string
- "options": array of 4 strings (or ["True", "False"] for T/F)
- "answer": string OR array of strings for multi-select (ONLY if ms > 0)

Return ONLY valid JSON. No commentary or explanation.
`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a quiz generator that responds only in JSON format." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(" Raw API response:", data);

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("No valid content from API.");
    }

    let content = data.choices[0].message.content.trim();

    if (content.startsWith("```")) {
      content = content.replace(/```(json)?/gi, "").replace(/```/g, "").trim();
    }

    const firstBracket = content.indexOf("[");
    const lastBracket = content.lastIndexOf("]") + 1;
    const jsonText = content.slice(firstBracket, lastBracket);

    try {
      const parsed = JSON.parse(jsonText);
      console.log("parsed Quiz JSON:", parsed);
      return parsed;
    } catch (parseErr) {
      console.warn("JSON parsing failed but quiz still might render.");
      // Fallback: try to extract usable JSON
      return eval("(" + jsonText + ")");
    }

  } catch (err) {
    console.error("Final catch - API Error:", err.message);

    // Only show alert if nothing was returned
    if (!latestQuizData || !Array.isArray(latestQuizData) || latestQuizData.length === 0) {
      alert("API Error: " + err.message);
    }

    // Return previously loaded quiz as a fallback if possible
    return latestQuizData || [];
  }
}
