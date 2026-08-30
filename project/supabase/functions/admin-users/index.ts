import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AdminUserBody {
  action: "create" | "update" | "reset_password" | "toggle_active" | "delete" | "self_update" | "self_password" | "impersonate";
  // create / update
  login_id?: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string | null;
  phone?: string;
  address?: string;
  city?: string;
  role?: "mechanic" | "supplier" | "delivery" | "admin";
  is_active?: boolean;
  password?: string; // temp password on create / new password on reset
  current_password?: string; // for self_password
  new_password?: string; // for self_password
  // update / reset / toggle / delete
  user_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData.user) {
      return json({ error: "Non authentifié" }, 401);
    }

    const body: AdminUserBody = await req.json();

    // Self-service actions: any authenticated user can call these
    if (body.action === "self_update") {
      return await handleSelfUpdate(userClient, body, userData.user.id);
    }
    if (body.action === "self_password") {
      return await handleSelfPassword(userClient, body, userData.user);
    }

    // Admin-only actions
    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "admin") {
      return json({ error: "Accès refusé — administrateur uniquement" }, 403);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (body.action) {
      case "create": {
        return await handleCreate(adminClient, body, userData.user.id);
      }
      case "update": {
        return await handleUpdate(adminClient, body);
      }
      case "reset_password": {
        return await handleResetPassword(adminClient, body);
      }
      case "toggle_active": {
        return await handleToggleActive(adminClient, body);
      }
      case "delete": {
        return await handleDelete(adminClient, body);
      }
      case "impersonate": {
        return await handleImpersonate(adminClient, body, userData.user.id);
      }
      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// A login_id is used verbatim as the local-part of the synthetic auth email
// `<login_id>@mecapieces.local`. GoTrue rejects anything that is not a valid
// address ("Unable to validate email address: invalid format"), which would
// desync profiles from auth.users. Allow lowercase letters, digits and . _ -
// only, 3–64 chars, starting and ending with a letter or digit.
const LOGIN_ID_RE = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/;

function normalizeLoginId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return LOGIN_ID_RE.test(v) ? v : null;
}

function syntheticEmailFor(loginId: string): string {
  return `${loginId}@mecapieces.local`;
}

const LOGIN_ID_ERROR =
  "Identifiant invalide : 3 à 64 caractères, lettres minuscules, chiffres, . _ - uniquement (ni espace ni accent).";

async function handleSelfUpdate(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody,
  userId: string
) {
  const newLoginId = normalizeLoginId(body.login_id);
  if (!newLoginId) {
    return json({ error: LOGIN_ID_ERROR }, 400);
  }

  // Check if login_id is already taken by someone else
  const { data: existing } = await client
    .from("profiles")
    .select("id, login_id")
    .eq("login_id", newLoginId)
    .neq("id", userId)
    .maybeSingle();
  if (existing) {
    return json({ error: "Cet identifiant de connexion existe déjà" }, 409);
  }

  // Read the current login_id so we can roll back if one of the two writes fails.
  const { data: current } = await client
    .from("profiles")
    .select("login_id")
    .eq("id", userId)
    .maybeSingle();
  const previousLoginId = current?.login_id ?? null;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const syntheticEmail = syntheticEmailFor(newLoginId);

  // Update the synthetic email in auth.users FIRST. email_confirm:true keeps the
  // address confirmed — there is no real inbox for @mecapieces.local, so without
  // it GoTrue would flag the account as pending an email confirmation that can
  // never arrive, locking the user out and breaking admin impersonation.
  const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
    email: syntheticEmail,
    email_confirm: true,
  });
  if (authErr) {
    return json({ error: authErr.message }, 500);
  }

  // Then update login_id in profiles (RLS allows self-update).
  const { error: profErr } = await client
    .from("profiles")
    .update({ login_id: newLoginId })
    .eq("id", userId);
  if (profErr) {
    // Roll the auth email back so profiles and auth.users stay in sync.
    if (previousLoginId) {
      await adminClient.auth.admin.updateUserById(userId, {
        email: syntheticEmailFor(previousLoginId),
        email_confirm: true,
      });
    }
    return json({ error: profErr.message }, 500);
  }

  return json({ ok: true, login_id: newLoginId });
}

async function handleSelfPassword(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody,
  user: { id: string; email?: string }
) {
  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return json({ error: "Ancien et nouveau mot de passe requis" }, 400);
  }
  if (new_password.length < 6) {
    return json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" }, 400);
  }

  // Verify current password by signing in
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: user.email!,
    password: current_password,
  });
  if (signInErr) {
    return json({ error: "Ancien mot de passe incorrect" }, 401);
  }

  // Update password via admin client
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
    password: new_password,
  });
  if (updateErr) {
    return json({ error: updateErr.message }, 500);
  }

  // Mark first_login_completed as true since user has set their own password
  await client
    .from("profiles")
    .update({ first_login_completed: true })
    .eq("id", user.id);

  return json({ ok: true });
}

async function handleCreate(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody,
  adminId: string
) {
  const { first_name, last_name, role, password, phone, address, city, employee_id } = body;
  if (!first_name || !last_name || !role || !password) {
    return json({ error: "Champs obligatoires manquants" }, 400);
  }
  const login_id = normalizeLoginId(body.login_id);
  if (!login_id) {
    return json({ error: LOGIN_ID_ERROR }, 400);
  }

  // Check login_id uniqueness in profiles
  const { data: existing } = await client
    .from("profiles")
    .select("id")
    .eq("login_id", login_id)
    .maybeSingle();
  if (existing) {
    return json({ error: "Cet identifiant de connexion existe déjà" }, 409);
  }

  // Generate anonymous reference
  const { data: ref, error: refErr } = await client.rpc("generate_anonymous_reference", { p_role: role });
  if (refErr || !ref) {
    return json({ error: "Impossible de générer la référence anonyme" }, 500);
  }

  // Create auth user with a synthetic email (login_id@app.local) so Supabase
  // handles password hashing. Email confirmation stays off.
  const syntheticEmail = syntheticEmailFor(login_id);
  const { data: authData, error: authErr } = await client.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  });
  if (authErr || !authData.user) {
    return json({ error: authErr?.message ?? "Création de l'utilisateur échouée" }, 500);
  }

  const newUserId = authData.user.id;
  const { error: profErr } = await client.from("profiles").insert({
    id: newUserId,
    login_id,
    anonymous_reference: ref,
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`,
    employee_id: employee_id ?? null,
    phone: phone ?? "",
    address: address ?? "",
    city: city ?? "",
    role,
    is_active: true,
    is_approved: true,
    first_login_completed: false,
    created_by: adminId,
  });
  if (profErr) {
    // Best-effort cleanup of orphaned auth user
    await client.auth.admin.deleteUser(newUserId);
    return json({ error: profErr.message }, 500);
  }

  return json({ id: newUserId, anonymous_reference: ref, login_id }, 201);
}

async function handleUpdate(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody
) {
  const { user_id, first_name, last_name, employee_id, phone, address, city, role, is_active } = body;
  if (!user_id) return json({ error: "user_id requis" }, 400);

  const update: Record<string, unknown> = {};
  if (first_name !== undefined) update.first_name = first_name;
  if (last_name !== undefined) {
    update.last_name = last_name;
    if (first_name !== undefined) update.full_name = `${first_name} ${last_name}`;
  }
  if (employee_id !== undefined) update.employee_id = employee_id || null;
  if (phone !== undefined) update.phone = phone;
  if (address !== undefined) update.address = address;
  if (city !== undefined) update.city = city;
  if (role !== undefined) update.role = role;
  if (is_active !== undefined) update.is_active = is_active;

  // An admin may correct a broken/invalid login_id here. It must stay in sync
  // with the synthetic auth email, so update auth.users first (email_confirm:true
  // to avoid a pending confirmation), then the profile.
  let previousLoginId: string | null = null;
  if (body.login_id !== undefined) {
    const newLoginId = normalizeLoginId(body.login_id);
    if (!newLoginId) return json({ error: LOGIN_ID_ERROR }, 400);

    const { data: taken } = await client
      .from("profiles")
      .select("id")
      .eq("login_id", newLoginId)
      .neq("id", user_id)
      .maybeSingle();
    if (taken) return json({ error: "Cet identifiant de connexion existe déjà" }, 409);

    const { data: current } = await client
      .from("profiles")
      .select("login_id")
      .eq("id", user_id)
      .maybeSingle();
    previousLoginId = current?.login_id ?? null;

    if (newLoginId !== previousLoginId) {
      const { error: authErr } = await client.auth.admin.updateUserById(user_id, {
        email: syntheticEmailFor(newLoginId),
        email_confirm: true,
      });
      if (authErr) return json({ error: authErr.message }, 500);
      update.login_id = newLoginId;
    }
  }

  const { error } = await client.from("profiles").update(update).eq("id", user_id);
  if (error) {
    // Roll the auth email back so profiles and auth.users stay in sync.
    if (update.login_id && previousLoginId) {
      await client.auth.admin.updateUserById(user_id, {
        email: syntheticEmailFor(previousLoginId),
        email_confirm: true,
      });
    }
    return json({ error: error.message }, 500);
  }
  return json({ ok: true });
}

async function handleResetPassword(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody
) {
  const { user_id, password } = body;
  if (!user_id || !password) return json({ error: "user_id et password requis" }, 400);

  // email_confirm:true also re-confirms the synthetic address, so this doubles as
  // a recovery path for an account whose email was left unconfirmed.
  const { error } = await client.auth.admin.updateUserById(user_id, { password, email_confirm: true });
  if (error) return json({ error: error.message }, 500);

  // Force password change on next login
  await client.from("profiles").update({ first_login_completed: false }).eq("id", user_id);
  return json({ ok: true });
}

async function handleToggleActive(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody
) {
  const { user_id, is_active } = body;
  if (!user_id) return json({ error: "user_id requis" }, 400);

  const { error } = await client
    .from("profiles")
    .update({ is_active: is_active ?? false })
    .eq("id", user_id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

async function handleDelete(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody
) {
  const { user_id } = body;
  if (!user_id) return json({ error: "user_id requis" }, 400);

  // Best-effort: clear the impersonation audit rows for this user so the delete
  // is not blocked on installs where the cascade migration has not run yet.
  await client.from("impersonation_log").delete().or(`admin_id.eq.${user_id},target_user_id.eq.${user_id}`);

  // profiles row cascades on auth.users delete
  const { error } = await client.auth.admin.deleteUser(user_id);
  if (error) {
    const raw = error.message ?? "";
    if (/foreign key|violates|constraint/i.test(raw)) {
      return json({
        error: "Impossible de supprimer ce compte : il est lié à des commandes, évaluations ou reversements. Désactivez-le plutôt (bouton Désactiver).",
      }, 409);
    }
    return json({ error: raw || "Suppression échouée" }, 500);
  }
  return json({ ok: true });
}

async function handleImpersonate(
  client: ReturnType<typeof createClient>,
  body: AdminUserBody,
  adminId: string
) {
  const { user_id } = body;
  if (!user_id) return json({ error: "user_id requis" }, 400);
  if (user_id === adminId) return json({ error: "Impossible de s'impersonner soi-même" }, 400);

  const { data: target, error: profErr } = await client
    .from("profiles")
    .select("login_id, role, is_active")
    .eq("id", user_id)
    .maybeSingle();
  if (profErr || !target) return json({ error: "Utilisateur introuvable" }, 404);
  if (target.role === "admin") return json({ error: "Impossible de se connecter en tant qu'un autre administrateur" }, 403);
  if (!target.login_id) return json({ error: "Cet utilisateur n'a pas d'identifiant de connexion" }, 400);
  if (!target.is_active) return json({ error: "Ce compte est désactivé" }, 400);

  const loginId = normalizeLoginId(target.login_id);
  if (!loginId) {
    return json({
      error: "L'identifiant de connexion de cet utilisateur n'est pas valide. Corrigez-le via « Modifier » avant de vous connecter en tant que lui.",
    }, 400);
  }

  const syntheticEmail = syntheticEmailFor(loginId);
  const { data: linkData, error: linkErr } = await client.auth.admin.generateLink({
    type: "magiclink",
    email: syntheticEmail,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    return json({ error: linkErr?.message ?? "Impossible de générer l'accès temporaire" }, 500);
  }

  await client.from("impersonation_log").insert({ admin_id: adminId, target_user_id: user_id });

  return json({ token_hash: linkData.properties.hashed_token, login_id: loginId });
}
