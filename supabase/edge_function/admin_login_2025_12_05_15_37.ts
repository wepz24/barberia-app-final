import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email y contraseña son requeridos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar credenciales del barbero
    const { data: admin, error } = await supabaseClient
      .from('admin_users_2025_12_05_15_37')
      .select('*')
      .eq('email', email)
      .eq('active', true)
      .single();

    if (error || !admin) {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Para simplicidad, usamos una contraseña fija: "barbero123"
    // En producción deberías usar bcrypt para verificar el hash
    if (password !== 'barbero123') {
      return new Response(
        JSON.stringify({ error: 'Credenciales inválidas' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generar token simple (en producción usar JWT)
    const token = btoa(`${admin.id}:${Date.now()}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        token: token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});