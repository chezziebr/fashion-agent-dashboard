import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractGarment } from '@/agents/garment-extract';
import { ApiResponse } from '@/types';

// Increase timeout for batch extraction
// Vercel limits: Hobby = 10s, Pro = 60s, Enterprise = 300s
// Set to 60 for Pro tier (adjust to 10 if on Hobby tier)
export const maxDuration = 60; // 60 seconds - enough for ~10 parallel extractions

// Create Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExtractionRequest {
  product_ids: string[];  // Array of product IDs to extract
  remove_background?: boolean;
  garment_type?: 'upper' | 'lower' | 'full' | 'auto';
}

interface ExtractionResult {
  product_id: string;
  sku: string;
  success: boolean;
  extracted_image_url?: string;
  error?: string;
}

// POST /api/products/extract - Extract garments from product images
export async function POST(request: NextRequest) {
  try {
    const body: ExtractionRequest = await request.json();

    if (!body.product_ids || !Array.isArray(body.product_ids) || body.product_ids.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing or invalid product_ids array' },
        { status: 400 }
      );
    }

    // Fetch products to extract
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, original_image_url, garment_type')
      .in('id', body.product_ids);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No products found with provided IDs' },
        { status: 404 }
      );
    }

    // Process extractions in PARALLEL for better performance
    // This allows multiple Replicate API calls to run concurrently
    const results: ExtractionResult[] = await Promise.all(
      products.map(async (product) => {
        try {
          // Update status to processing
          await supabase
            .from('products')
            .update({ extraction_status: 'processing' })
            .eq('id', product.id);

          // Run extraction
          const extractionResult = await extractGarment({
            image_url: product.original_image_url,
            garment_type: body.garment_type || product.garment_type || 'auto',
            remove_background: body.remove_background ?? true,
          });

          if (extractionResult.success && extractionResult.garment_url) {
            // Update product with extracted image
            await supabase
              .from('products')
              .update({
                studio_image_url: extractionResult.garment_url,
                extraction_status: 'completed',
                metadata: {
                  extraction_model: extractionResult.model_used,
                  extraction_duration_ms: extractionResult.duration_ms,
                  extracted_at: new Date().toISOString(),
                },
              })
              .eq('id', product.id);

            return {
              product_id: product.id,
              sku: product.sku,
              success: true,
              extracted_image_url: extractionResult.garment_url,
            };
          } else {
            // Update status to failed
            await supabase
              .from('products')
              .update({ extraction_status: 'failed' })
              .eq('id', product.id);

            return {
              product_id: product.id,
              sku: product.sku,
              success: false,
              error: extractionResult.error || 'Extraction failed',
            };
          }
        } catch (error) {
          console.error(`Error extracting garment for product ${product.id}:`, error);

          // Update status to failed
          await supabase
            .from('products')
            .update({ extraction_status: 'failed' })
            .eq('id', product.id);

          return {
            product_id: product.id,
            sku: product.sku,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json<ApiResponse<ExtractionResult[]>>(
      {
        success: true,
        data: results,
        message: `Extraction complete: ${successCount} succeeded, ${failCount} failed`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/products/extract - Get extraction status summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, processing, completed, failed

    let query = supabase
      .from('products')
      .select('id, sku, name, extraction_status, created_at, updated_at')
      .eq('is_active', true);

    if (status) {
      query = query.eq('extraction_status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching extraction status:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get counts by status
    const { data: countData } = await supabase
      .from('products')
      .select('extraction_status')
      .eq('is_active', true);

    const counts = {
      pending: countData?.filter(p => p.extraction_status === 'pending').length || 0,
      processing: countData?.filter(p => p.extraction_status === 'processing').length || 0,
      completed: countData?.filter(p => p.extraction_status === 'completed').length || 0,
      failed: countData?.filter(p => p.extraction_status === 'failed').length || 0,
    };

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        data: {
          products: data,
          counts,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
