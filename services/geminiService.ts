import { GoogleGenAI } from "@google/genai";
import { Tip } from "../types";

// SAFELY retrieve API Key. 
// Checks if 'process' exists before accessing it to prevent browser crashes (ReferenceError).
const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors in environments where process is not defined
  }
  return '';
};

const apiKey = getApiKey();

export const generateMatchAnalysis = async (teams: string, league: string): Promise<string> => {
  if (!apiKey) {
    // Graceful fallback if no API key is present
    return `(Analysis) ${teams} in ${league} is set to be a highly contested match. Both sides have everything to play for. Expect tactical discipline and moments of individual brilliance.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a short, punchy, expert betting analysis (max 50 words) for the match: ${teams} in the ${league}. Focus on form and key factors.`,
    });
    
    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating analysis. Please write manually.";
  }
};

export const checkBetResult = async (tip: Tip): Promise<{ status: string, score: string, reason: string }> => {
  if (!apiKey) {
      return { status: 'UNKNOWN', score: '?', reason: 'API Key missing. Check manually.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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