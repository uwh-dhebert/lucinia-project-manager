import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: groups, error } = await supabase
      .from('link_groups')
      .select('*, links(*)')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching link groups:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(groups || []);
  } catch (error: any) {
    console.error('Error fetching link groups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: group, error } = await supabase
      .from('link_groups')
      .insert({
        userId: user.id,
        name,
      })
      .select('*, links(*)');

    if (error) {
      console.error('Error creating link group:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(group?.[0] || {});
  } catch (error: any) {
    console.error('Error creating link group:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

