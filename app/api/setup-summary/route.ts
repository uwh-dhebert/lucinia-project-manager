import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { ensureProjectSummaryTable } from '@/lib/setup-summary';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ensureProjectSummaryTable();

    const { error: verifyError } = await supabase
      .from('project_summaries')
      .select('id', { count: 'exact', head: true });

    if (verifyError) {
      return NextResponse.json(
        {
          success: false,
          error: verifyError.message,
          hint: 'Table may exist but PostgREST schema cache needs a moment. Refresh and try again.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}