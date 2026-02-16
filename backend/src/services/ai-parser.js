const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const logger = require('../utils/logger');

async function parseAnswer(message, answerType, question, choices) {
  if (!env.anthropicApiKey) {
    return { value: message, confidence: 0.5 };
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const typeInstructions = {
    boolean: 'Extract a yes/no/maybe answer. Return { "value": true|false|null, "confidence": 0.0-1.0 }',
    number: 'Extract a number. Return { "value": <number|null>, "confidence": 0.0-1.0 }',
    choice: `Pick from these choices: ${JSON.stringify(choices)}. Return { "value": "<chosen>", "confidence": 0.0-1.0 }`,
    text: 'Extract the relevant text answer. Return { "value": "<text>", "confidence": 0.0-1.0 }',
    date: 'Extract a date. Return { "value": "<ISO date string>", "confidence": 0.0-1.0 }',
  };

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      system: `You are a message parser. Extract structured data from SMS responses.
Question asked: "${question}"
Expected answer type: ${answerType}
${typeInstructions[answerType] || typeInstructions.text}
Return ONLY valid JSON.`,
      messages: [{ role: 'user', content: message }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (err) {
    logger.warn(`AI parse failed: ${err.message}`);
  }

  return { value: message, confidence: 0.3 };
}

module.exports = { parseAnswer };
