import Anthropic from '@anthropic-ai/sdk';
import { ParsedIntent, TaskPlanStep, AgentName } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Orchestrator Agent for a fashion photography AI system. Your job is to:

1. Parse natural language commands from users about fashion photography tasks
2. Identify the products (by SKU) and models (by code like D01, F02) mentioned
3. Determine the desired pose and expression
4. Create a step-by-step task plan for other agents to execute

Available Agents:
- garment_extract: Extracts clean garment images from photos with models
- model_manager: Generates AI models, changes poses/expressions
- virtual_tryon: Puts garments onto models
- qc: Quality checks the generated images

Available Products are identified by SKU (e.g., TH8-001, AZM-002)
Available Models are identified by code (e.g., D01, D02, F01, F02)
Available Poses: front, half_front, side, back
Available Expressions: neutral, smiling, casual, serious

Respond ONLY with valid JSON in this exact format:
{
  "success": true,
  "parsed_intent": {
    "action": "single_tryon" | "multi_tryon" | "extract_garment" | "generate_model" | "batch_process",
    "products": ["SKU1", "SKU2"],
    "model": "MODEL_CODE" | null,
    "pose": "pose_name" | null,
    "expression": "expression_name" | null,
    "variations": number,
    "additional_params": {}
  },
  "task_plan": [
    {
      "step": 1,
      "agent": "agent_name",
      "action": "action_description",
      "description": "Human readable description",
      "inputs": ["input1", "input2"],
      "expected_outputs": ["output1"]
    }
  ],
  "estimated_duration_seconds": number
}

If you cannot parse the request or it's unclear, respond with:
{
  "success": false,
  "error": "Description of what's unclear",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;

export interface OrchestratorInput {
  prompt: string;
  context?: {
    available_models?: string[];
    available_products?: string[];
  };
}

export interface OrchestratorOutput {
  success: boolean;
  parsed_intent?: ParsedIntent;
  task_plan?: TaskPlanStep[];
  estimated_duration_seconds?: number;
  error?: string;
  suggestions?: string[];
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const contextInfo = input.context
    ? `\n\nContext:\n- Available Models: ${input.context.available_models?.join(', ') || 'All'}\n- Available Products: ${input.context.available_products?.join(', ') || 'All'}`
    : '';

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse this request and create a task plan:${contextInfo}\n\nUser Request: "${input.prompt}"`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result as OrchestratorOutput;
  } catch (error) {
    console.error('Orchestrator error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      suggestions: [
        'Try being more specific about the products and models',
        'Use SKU codes like TH8-001 and model codes like D01',
        'Specify the desired pose and expression',
      ],
    };
  }
}

// Helper function to validate parsed intent
export function validateParsedIntent(intent: ParsedIntent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!intent.action) {
    errors.push('Missing action type');
  }

  if (!intent.products || intent.products.length === 0) {
    if (intent.action !== 'generate_model') {
      errors.push('No products specified');
    }
  }

  if (!intent.model && ['single_tryon', 'multi_tryon'].includes(intent.action)) {
    errors.push('No model specified for try-on action');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helper to estimate duration based on task plan
export function estimateDuration(taskPlan: TaskPlanStep[]): number {
  const AGENT_DURATIONS: Record<AgentName, number> = {
    orchestrator: 2,
    garment_extract: 15,
    model_manager: 20,
    virtual_tryon: 30,
    qc: 5,
  };

  return taskPlan.reduce((total, step) => {
    return total + (AGENT_DURATIONS[step.agent as AgentName] || 10);
  }, 0);
}
