import Groq from 'groq-sdk';

export interface Scene {
  id: number;
  narration: string;
  keywords: string[];
}

export async function segmentScenes(script: string): Promise<Scene[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is missing for scenes");

  const groq = new Groq({ apiKey });

  // Add formatting hint to script so the LLM doesn't get cut off processing huge output.
  const prompt = `I have a documentary script. I need to break it down into roughly 15-20 sequential scenes.
For each scene, provide the exact narration text chunk, and 2-4 visual keywords to search for B-roll stock footage.

Script:
${script}

Output JSON format exactly like this:
[
  {
    "id": 1,
    "narration": "The exact first couple of sentences...",
    "keywords": ["space", "stars", "galaxy"]
  }
]
Reply ONLY with the raw JSON array. DO NOT wrap in markdown \`\`\`json blocks.`;

  const response = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
  });

  let content = response.choices[0]?.message?.content?.trim() || "[]";
  
  // Clean markdown if hallucinated
  if (content.startsWith('```json')) content = content.replace(/^```json/, '');
  if (content.startsWith('```')) content = content.replace(/^```/, '');
  if (content.endsWith('```')) content = content.replace(/```$/, '');

  try {
    const scenes: Scene[] = JSON.parse(content.trim());
    return scenes;
  } catch(e) {
    console.error("Failed to parse JSON for scenes:", content);
    throw new Error("Failed to parse scene segmentation from AI.");
  }
}
