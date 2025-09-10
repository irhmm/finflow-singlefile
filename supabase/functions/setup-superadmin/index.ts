import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create the superadmin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'irham@superadmin.com',
      password: 'Percobaan111',
      user_metadata: {
        username: 'irham',
        role: 'superadmin'
      },
      email_confirm: true
    })

    if (authError) {
      throw authError
    }

    // Update the profile with superadmin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        username: 'irham',
        role: 'superadmin'
      })

    if (profileError) {
      throw profileError
    }

    return new Response(
      JSON.stringify({ 
        message: 'Superadmin user created successfully',
        user: authData.user 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})