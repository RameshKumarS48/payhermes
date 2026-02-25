import type { IntentConfig } from '@voiceflow/shared';

interface IntentResult {
  name: string;
  confidence: number;
  outputHandle: string;
}

export class IntentDetector {
  async classify(
    userText: string,
    intentConfig: IntentConfig,
    context: Record<string, unknown> = {},
  ): Promise<IntentResult> {
    // Build classification prompt
    const intentDescriptions = intentConfig.intents
      .map(
        (intent) =>
          `- "${intent.name}": Examples: ${intent.examples.map((e) => `"${e}"`).join(', ')}`,
      )
      .join('\n');

    const prompt = `You are an intent classifier for a voice AI system. Classify the user's message into one of the following intents.

Available intents:
${intentDescriptions}

User message: "${userText}"

Respond with ONLY a JSON object: {"intent": "<intent_name>", "confidence": <0.0-1.0>}
If no intent matches well, respond with: {"intent": "__fallback__", "confidence": 0.0}`;

    try {
      // Call OpenAI API for classification
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: 100,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(content);

      if (parsed.intent === '__fallback__' || parsed.confidence < intentConfig.confidenceThreshold) {
        return {
          name: '__fallback__',
          confidence: parsed.confidence || 0,
          outputHandle: intentConfig.fallbackHandle,
        };
      }

      const matchedIntent = intentConfig.intents.find((i) => i.name === parsed.intent);
      if (!matchedIntent) {
        return {
          name: '__fallback__',
          confidence: 0,
          outputHandle: intentConfig.fallbackHandle,
        };
      }

      return {
        name: parsed.intent,
        confidence: parsed.confidence,
        outputHandle: matchedIntent.outputHandle,
      };
    } catch (error) {
      console.error('Intent detection error:', error);
      return {
        name: '__fallback__',
        confidence: 0,
        outputHandle: intentConfig.fallbackHandle,
      };
    }
  }
}
