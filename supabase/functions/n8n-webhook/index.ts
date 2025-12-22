import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate API key
    const providedApiKey = req.headers.get('x-api-key') || new URL(req.url).searchParams.get('api_key')
    const expectedApiKey = Deno.env.get('N8N_WEBHOOK_API_KEY')
    
    if (!expectedApiKey) {
      console.error('N8N_WEBHOOK_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook not properly configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      console.error('Invalid or missing API key')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized - Invalid API key' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the incoming webhook data
    const webhookData = await req.json()
    console.log('Received webhook data:', webhookData)

    // Determine which table to insert into based on the data structure
    let tableName: string
    let insertData: any

    if (webhookData.code && webhookData.jobdesk && webhookData.worker && webhookData.fee) {
      // Worker income data
      tableName = 'worker_income'
      insertData = {
        tanggal: webhookData.tanggal || new Date().toISOString().split('T')[0],
        code: webhookData.code,
        jobdesk: webhookData.jobdesk,
        worker: webhookData.worker,
        fee: parseFloat(webhookData.fee)
      }
    } else if (webhookData.nominal && webhookData.type === 'admin') {
      // Admin income data
      tableName = 'admin_income'
      insertData = {
        tanggal: webhookData.tanggal || new Date().toISOString().split('T')[0],
        nominal: parseFloat(webhookData.nominal)
      }
    } else if (webhookData.nominal && (webhookData.type === 'expense' || !webhookData.type)) {
      // Expense data (default if no type specified)
      tableName = 'expenses'
      insertData = {
        tanggal: webhookData.tanggal || new Date().toISOString().split('T')[0],
        nominal: parseFloat(webhookData.nominal)
      }
    } else {
      // Try to auto-detect based on webhook table parameter
      tableName = webhookData.table || 'expenses'
      
      if (tableName === 'worker_income') {
        insertData = {
          tanggal: webhookData.tanggal || new Date().toISOString().split('T')[0],
          code: webhookData.code || 'N8N-' + Date.now(),
          jobdesk: webhookData.jobdesk || 'Auto Import',
          worker: webhookData.worker || 'N8N Worker',
          fee: parseFloat(webhookData.fee || webhookData.nominal || 0)
        }
      } else if (tableName === 'admin_income') {
        insertData = {
          tanggal: webhookData.tanggal || new Date().toISOString().split('T')[0],
          nominal: parseFloat(webhookData.nominal || 0)
        }
      } else {
        insertData = {
          tanggal: webhookData.tanggal || new Date().toISOString().split('T')[0],
          nominal: parseFloat(webhookData.nominal || 0)
        }
      }
    }

    console.log(`Inserting into ${tableName}:`, insertData)

    // Insert data into Supabase
    const { data, error } = await supabase
      .from(tableName)
      .insert([insertData])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error.details 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully inserted:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Data inserted into ${tableName}`, 
        data: data[0],
        table: tableName
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})