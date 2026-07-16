import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Checking wiki tables...')

    // Try to query subjects table to see if it exists
    const { data, error } = await supabase
      .from('subjects')
      .select('id')
      .limit(1)

    if (error && error.message.includes('not found')) {
      // Tables don't exist - provide instructions
      return NextResponse.json(
        {
          success: false,
          initialized: false,
          message: 'Wiki tables need to be created manually in Supabase',
          instructions: [
            'Go to: https://supabase.com/dashboard',
            'Open SQL Editor → New Query',
            'Copy all content from WIKI_RESTRUCTURE_NO_RLS.sql (in project root)',
            'Then run WIKI_PER_USER.sql to add per-user ownership and RLS',
            'Paste into SQL editor and click Run',
            'Refresh your browser after SQL completes'
          ]
        },
        { status: 200 }
      )
    }

    if (error) {
      console.error('Setup check error:', error)
      throw error
    }

    console.log('✅ Wiki tables already exist')
    return NextResponse.json({
      success: true,
      initialized: true,
      message: 'Wiki tables are ready to use',
    })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json(
      {
        success: false,
        initialized: false,
        error: error.message,
        hint: 'Please run WIKI_RESTRUCTURE_NO_RLS.sql then WIKI_PER_USER.sql in Supabase Dashboard manually'
      },
      { status: 200 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if subjects table exists
    const { data, error } = await supabase
      .from('subjects')
      .select('id')
      .limit(1)

    if (error?.message.includes('not found')) {
      return NextResponse.json({
        initialized: false,
        message: 'Wiki tables not found - need manual setup',
      })
    }

    return NextResponse.json({
      initialized: true,
      message: 'Wiki tables are ready',
    })
  } catch (error: any) {
    return NextResponse.json({
      initialized: false,
      error: error.message,
    })
  }
}



