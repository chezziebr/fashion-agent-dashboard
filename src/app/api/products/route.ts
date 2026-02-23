import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Product, ApiResponse } from '@/types';

// Create Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/products - List all products with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');
    const garmentType = searchParams.get('garment_type');
    const search = searchParams.get('search');

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (brand) {
      query = query.eq('brand', brand);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (garmentType) {
      query = query.eq('garment_type', garmentType);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Product[]>>(
      { success: true, data: data as Product[] },
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

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields - only SKU is required now
    if (!body.sku) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required field: sku' },
        { status: 400 }
      );
    }

    const productData = {
      sku: body.sku,
      name: body.name || body.sku, // Default to SKU if no name provided
      brand: body.brand || 'TH8TA', // Default brand
      category: body.category || 'apparel', // Default category
      garment_type: body.garment_type || 'upper', // Default garment type
      color: body.color || null,
      color_hex: body.color_hex || null,
      size_range: body.size_range || null,
      original_image_url: body.original_image_url || null,
      studio_image_url: body.studio_image_url || null,
      thumbnail_url: body.thumbnail_url || null,
      extraction_status: body.extraction_status || 'pending',
      tags: body.tags || [],
      is_active: body.is_active ?? true,
      metadata: body.metadata || {},
    };

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Product>>(
      { success: true, data: data as Product, message: 'Product created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
