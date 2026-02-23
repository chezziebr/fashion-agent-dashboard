import { NextRequest, NextResponse } from 'next/server';
import { runVirtualTryOn, runMultiGarmentTryOn, generateVariations } from '@/agents/virtual-tryon';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      model_image_url,
      garments, // Array of { url, type }
      variations = 1,
      job_id,
    } = body;

    if (!model_image_url) {
      return NextResponse.json(
        { success: false, error: 'model_image_url is required' },
        { status: 400 }
      );
    }

    if (!garments || !Array.isArray(garments) || garments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one garment is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const startTime = Date.now();

    // Update job status if job_id provided
    if (job_id) {
      await supabase
        .from('jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job_id);

      // Log agent start
      await supabase.from('agent_logs').insert({
        job_id,
        agent_name: 'virtual_tryon',
        action: garments.length > 1 ? 'multi_garment_tryon' : 'single_garment_tryon',
        status: 'started',
        input: { model_image_url, garments, variations },
      });
    }

    let results;

    if (garments.length === 1 && variations === 1) {
      // Simple single garment try-on
      const result = await runVirtualTryOn({
        model_image_url,
        garment_image_url: garments[0].url,
        garment_type: garments[0].type || 'upper',
      });
      results = [result];
    } else if (garments.length === 1 && variations > 1) {
      // Single garment with variations
      results = await generateVariations(
        {
          model_image_url,
          garment_image_url: garments[0].url,
          garment_type: garments[0].type || 'upper',
        },
        variations
      );
    } else {
      // Multi-garment try-on
      if (variations > 1) {
        // Generate variations for multi-garment
        const variationResults = [];
        for (let i = 0; i < variations; i++) {
          const result = await runMultiGarmentTryOn(model_image_url, garments);
          variationResults.push(result);
        }
        results = variationResults;
      } else {
        const result = await runMultiGarmentTryOn(model_image_url, garments);
        results = [result];
      }
    }

    const totalDuration = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);

    // Log results to database
    if (job_id) {
      await supabase.from('agent_logs').insert({
        job_id,
        agent_name: 'virtual_tryon',
        action: 'complete',
        status: successfulResults.length > 0 ? 'success' : 'failed',
        output: { results_count: results.length, successful: successfulResults.length },
        duration_ms: totalDuration,
      });

      // Save generated images
      if (successfulResults.length > 0) {
        const images = successfulResults.map((r, i) => ({
          job_id,
          product_ids: garments.map((g: { id?: string }) => g.id).filter(Boolean),
          output_url: r.output_url,
          status: 'pending',
          variation_index: i,
          generation_config: { model_used: r.model_used },
        }));

        await supabase.from('generated_images').insert(images);

        // Update job status
        await supabase
          .from('jobs')
          .update({
            status: 'completed',
            progress: 100,
            completed_at: new Date().toISOString(),
            output_data: { images: successfulResults.map(r => r.output_url) },
          })
          .eq('id', job_id);
      } else {
        // All failed
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error_message: results[0]?.error || 'All try-on attempts failed',
          })
          .eq('id', job_id);
      }
    }

    return NextResponse.json({
      success: successfulResults.length > 0,
      results: successfulResults.map(r => ({
        output_url: r.output_url,
        model_used: r.model_used,
      })),
      total_duration_ms: totalDuration,
      job_id,
    });
  } catch (error) {
    console.error('Try-on API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
