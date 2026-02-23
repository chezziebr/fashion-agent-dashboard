import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { AIModel, ApiResponse } from '@/types';

// GET /api/models - List all AI models with poses and expressions
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const gender = searchParams.get('gender');
    const includePoses = searchParams.get('include_poses') === 'true';
    const includeExpressions = searchParams.get('include_expressions') === 'true';

    let query = supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (gender) {
      query = query.eq('gender', gender);
    }

    const { data: models, error } = await query;

    if (error) {
      console.error('Error fetching models:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Fetch poses and expressions if requested
    if (includePoses || includeExpressions) {
      const modelsWithRelations = await Promise.all(
        (models as AIModel[]).map(async (model) => {
          const enrichedModel = { ...model };

          if (includePoses) {
            const { data: poses } = await supabase
              .from('model_poses')
              .select('*')
              .eq('model_id', model.id)
              .order('is_default', { ascending: false });
            enrichedModel.poses = poses || [];
          }

          if (includeExpressions) {
            const { data: expressions } = await supabase
              .from('model_expressions')
              .select('*')
              .eq('model_id', model.id)
              .order('is_default', { ascending: false });
            enrichedModel.expressions = expressions || [];
          }

          return enrichedModel;
        })
      );

      return NextResponse.json<ApiResponse<AIModel[]>>(
        { success: true, data: modelsWithRelations },
        { status: 200 }
      );
    }

    return NextResponse.json<ApiResponse<AIModel[]>>(
      { success: true, data: models as AIModel[] },
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

// POST /api/models - Create a new AI model
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.model_code || !body.name || !body.gender || !body.base_image_url) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields: model_code, name, gender, base_image_url' },
        { status: 400 }
      );
    }

    const modelData = {
      model_code: body.model_code,
      name: body.name,
      gender: body.gender,
      ethnicity: body.ethnicity || null,
      age_range: body.age_range || null,
      body_type: body.body_type || null,
      base_image_url: body.base_image_url,
      thumbnail_url: body.thumbnail_url || null,
      style_tags: body.style_tags || [],
      is_active: body.is_active ?? true,
      metadata: body.metadata || {},
    };

    const { data, error } = await supabase
      .from('ai_models')
      .insert(modelData)
      .select()
      .single();

    if (error) {
      console.error('Error creating model:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<AIModel>>(
      { success: true, data: data as AIModel, message: 'Model created successfully' },
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


// PATCH /api/models - Update model (archive/unarchive)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing model ID" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (typeof body.is_active !== 'undefined') {
      updateData.is_active = body.is_active;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_models")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating model:", error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<AIModel>>(
      { success: true, data: data as AIModel, message: "Model updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/models?id=xxx - Delete a model permanently
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing model ID" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("ai_models")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting model:", error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: true, message: "Model deleted permanently" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
