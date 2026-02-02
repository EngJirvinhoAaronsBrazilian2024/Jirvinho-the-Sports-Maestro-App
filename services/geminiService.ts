
import { GoogleGenAI } from "@google/genai";
import { Tip } from "../types";

// The API key is obtained exclusively from the environment variable process.env.API_KEY per instructions.

export const generateMatchAnalysis = async (teams: string, league: string): Promise<string> => {
  // Fix: Initialize GoogleGenAI directly with process.env.API_KEY and removed key existence check per guidelines
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Using gemini-3-flash-preview for basic text tasks as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a short, punchy, expert betting analysis (max 50 words) for the match: ${teams} in the ${league}. Focus on form and key factors.`,
    });
    
    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating analysis. Please write manually.";
  }
};

export const checkBetResult = async (tip: Tip): Promise<{ status: string, score: string, reason: string }> => {
  // Fix: Initialize GoogleGenAI directly with process.env.API_KEY and removed key existence check per guidelines
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a specific prompt for result verification
    const prompt = `
      Find the final result for the match: ${tip.teams} in ${tip.league} played around ${tip.kickoffTime}.
      The bet prediction was: "${tip.prediction}".
      
      Based on the final score/result:
      1. What was the exact final score?
      2. Did the bet WIN, LOSE, or was it VOID?
      3. Give a very short reason (e.g. "Score 2-1, total 3 goals").

      Format your response exactly like this string:
      STATUS: [WON/LOST/VOID] | SCORE: [Score] | REASON: [Reason]
    `;

    // Using gemini-3-flash-preview as it is suitable for this reasoning task with search
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // Enable Google Search to get real-time results
      }
    });

    const text = response.text || '';
    
    // Simple parsing logic based on the requested format
    let status = 'PENDING';
    let score = '?-?';
    let reason = 'Could not verify';

    if (text.includes('STATUS: WON')) status = 'WON';
    else if (text.includes('STATUS: LOST')) status = 'LOST';
    else if (text.includes('STATUS: VOID')) status = 'VOID';

    const scoreMatch = text.match(/SCORE: (.*?)( \||$)/);
    if (scoreMatch) score = scoreMatch[1];

    const reasonMatch = text.match(/REASON: (.*?)( \||$)/);
    if (reasonMatch) reason = reasonMatch[1];

    return { status, score, reason };

  } catch (error) {
    console.error("Gemini Verification Error:", error);
    return { status: 'ERROR', score: '?', reason: 'AI Verification Failed' };
  }
};
