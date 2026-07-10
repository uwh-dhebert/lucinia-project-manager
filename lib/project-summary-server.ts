import type { SupabaseClient } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/errors';
import { ensureProjectSummaryTable, isSummaryTableMissingError } from '@/lib/setup-summary';

export async function saveProjectSummary(
  supabase: SupabaseClient,
  projectId: string,
  content: string
) {
  const savedAt = new Date().toISOString();

  const persist = async () => {
    const { data: existing, error: existingError } = await supabase
      .from('project_summaries')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { data, error } = await supabase
        .from('project_summaries')
        .update({ content, updated_at: savedAt })
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('project_summaries')
      .insert({ project_id: projectId, content })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  try {
    return await persist();
  } catch (error) {
    if (!isSummaryTableMissingError(getErrorMessage(error))) throw error;
    await ensureProjectSummaryTable();
    return persist();
  }
}