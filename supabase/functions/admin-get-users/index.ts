import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user client to verify the caller is an admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Get the calling user
    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callingUser) {
      throw new Error("Unauthorized");
    }

    // Check if caller is admin
    const { data: isAdmin, error: adminError } = await supabaseUser.rpc("is_admin");
    if (adminError || !isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Fetch all users from auth.users using admin API
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      throw authError;
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");
    if (profilesError) {
      throw profilesError;
    }

    // Fetch admin roles
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");
    if (rolesError) {
      throw rolesError;
    }

    const adminUserIds = new Set(adminRoles?.map((r) => r.user_id) || []);

    // Combine auth users with profiles
    const usersWithDetails = authUsers.users.map((authUser) => {
      const profile = profiles?.find((p) => p.user_id === authUser.id);
      
      // Extract phone from email (format: 1234567890@royall11.app)
      const email = authUser.email || "";
      const phone = email.includes("@royall11.app") 
        ? email.split("@")[0] 
        : email;

      return {
        id: profile?.id || authUser.id,
        user_id: authUser.id,
        username: profile?.username || null,
        wallet_balance: profile?.wallet_balance || 0,
        created_at: profile?.created_at || authUser.created_at,
        updated_at: profile?.updated_at || null,
        avatar_url: profile?.avatar_url || null,
        email: authUser.email,
        phone: phone,
        last_sign_in: authUser.last_sign_in_at,
        email_confirmed: authUser.email_confirmed_at != null,
        isAdmin: adminUserIds.has(authUser.id),
      };
    });

    // Sort by created_at descending
    usersWithDetails.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return new Response(
      JSON.stringify({ users: usersWithDetails }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
