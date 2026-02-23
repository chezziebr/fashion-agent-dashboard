import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator, validateParsedIntent, estimateDuration } from '@/agents/orchestrator';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Run the orchestrator
    const result = await runOrchestrator({ prompt, context });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Validate the parsed intent
    if (result.parsed_intent) {
      const validation = validateParsedIntent(result.parsed_intent);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid intent',
            validation_errors: validation.errors,
            parsed_intent: result.parsed_intent,
          },
          { status: 400 }
        );
      }
    }

    // Calculate estimated duration if not provided
    if (result.task_plan && !result.estimated_duration_seconds) {
      result.estimated_duration_seconds = estimateDuration(result.task_plan);
    }

    // Create a job in the database
    const supabase = createServerClient();
    
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_prompt: prompt,
        parsed_intent: result.parsed_intent,
        status: 'queued',
        progress: 0,
        input_data: { context },
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      // Still return the orchestrator result even if job creation fails
    }

    return NextResponse.json({
      ...result,
      job_id: job?.id,
    });
  } catch (error) {
    console.error('Orchestrate API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
