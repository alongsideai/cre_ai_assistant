/**
 * LLM Abstraction Layer
 *
 * This module provides a simple interface to call different LLM providers.
 * Currently supports Anthropic (Claude) and OpenAI (GPT).
 *
 * Set LLM_PROVIDER in your .env file to either "anthropic" or "openai"
 * and provide the corresponding API key.
 */

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Call the configured LLM with a prompt and return the response.
 * @param prompt The input prompt for the LLM
 * @returns The LLM's response as a string
 */
export async function callLLM(prompt: string): Promise<string> {
  if (LLM_PROVIDER === 'anthropic') {
    return callAnthropic(prompt);
  } else if (LLM_PROVIDER === 'openai') {
    return callOpenAI(prompt);
  } else {
    throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
  }
}

/**
 * Call Anthropic's Claude API
 */
async function callAnthropic(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Call OpenAI's GPT API
 */
async function callOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
