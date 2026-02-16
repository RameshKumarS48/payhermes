const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are a conversation funnel designer for a B2B SMS/WhatsApp automation platform.
Given a business description, create a structured conversation funnel in JSON format.

A funnel is an array of steps. Each step has:
- id: unique string identifier (e.g., "step_1", "greeting", "qualify_budget")
- type: one of "message", "question", "decision", "calendar_booking", "schedule_job"
- For "message": { text, next_step }
- For "question": { text, variable_name, answer_type ("text"|"boolean"|"number"|"choice"), choices (if answer_type is "choice"), next_step }
- For "decision": { conditions: [{ variable, operator ("equals"|"contains"|"gt"|"lt"), value, next_step }], default_step }
- For "calendar_booking": { text, duration_minutes, next_step_booked, next_step_declined }
- For "schedule_job": { job_type ("followup"|"reminder_24h"|"no_response_check"), delay_hours, next_step }

Template variables use {{variable_name}} syntax.

Return ONLY valid JSON with this structure:
{
  "steps": [...],
  "entry_step": "step_id",
  "variables": ["list", "of", "variable_names"]
}`;

async function generateFunnel(prompt) {
  if (!env.anthropicApiKey) {
    throw new AppError('ANTHROPIC_API_KEY not configured', 503);
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Create a conversation funnel for: ${prompt}` }],
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const funnel = JSON.parse(jsonMatch[0]);

      if (!funnel.steps || !Array.isArray(funnel.steps) || !funnel.entry_step) {
        throw new Error('Invalid funnel structure');
      }

      return funnel;
    } catch (err) {
      logger.warn(`Funnel generation attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt === 2) throw new AppError('Failed to generate funnel after 3 attempts', 502);
    }
  }
}

module.exports = { generateFunnel };
