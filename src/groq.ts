import Groq from 'groq-sdk';

export async function generateScript(topic: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is missing");

  const groq = new Groq({ apiKey });

  const prompt = `You are an expert YouTube documentary scriptwriter. 
Write a highly engaging, structured storytelling script about: "${topic}".
The script should be around 1000-1500 words and take about 8 minutes to read.
Structure it with:
- A strong Hook
- Background Context
- Key Arguments / Main Body
- Counterpoints or nuances
- A powerful Conclusion

Only output the narration text. Do not include stage directions, speaker names like [Narrator], or notes. Write it like a continuous speech.`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
  });

  let script = chatCompletion.choices[0]?.message?.content || "";
  
  // Clean up any remaining narrator tags just in case
  script = script.replace(/\[.*?\]/g, '').replace(/Narrator:/g, '').trim();
  
  return script;
}
