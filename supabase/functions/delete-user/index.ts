import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[delete-user] Invalid token', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from('admin_users')
      .select('role, ativo, bypass_permissions')
      .eq('user_id', user.id)
      .single();

    if (adminCheckError) {
      console.error('[delete-user] Failed to verify permissions', adminCheckError);
      return new Response(JSON.stringify({ error: 'Failed to verify user permissions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adminUser) {
      console.error('[delete-user] User not found in admin_users', user.id);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adminUser.ativo) {
      console.error('[delete-user] Inactive user', user.id);
      return new Response(JSON.stringify({ error: 'User account is inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedRoles = ['administrador', 'analista_rh', 'diretor', 'gerente_marketing', 'gerente_geral'];
    const hasPermission = adminUser.bypass_permissions === true || allowedRoles.includes(adminUser.role);

    if (!hasPermission) {
      console.error('[delete-user] Insufficient permissions', { role: adminUser.role, userId: user.id });
      return new Response(JSON.stringify({ error: 'Insufficient permissions - admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const targetUserId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';
    const rawSource = typeof body?.source === 'string' ? body.source.trim() : '';
    const source: 'admin_users' | 'representantes' | null =
      rawSource === 'admin_users' || rawSource === 'representantes' ? rawSource : null;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let targetAdminUser: { id: string; user_id: string; nome: string; email: string } | null = null;
    let targetRepresentante: { id: string; user_id: string; nome: string; email: string } | null = null;

    if (source === null || source === 'admin_users') {
      const { data, error } = await supabaseAdmin
        .from('admin_users')
        .select('id, user_id, nome, email')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (error) {
        console.error('[delete-user] Target lookup failed', error);
        return new Response(JSON.stringify({ error: 'Failed to locate target user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetAdminUser = data;
    }

    if (source === null || source === 'representantes') {
      const { data, error } = await supabaseAdmin
        .from('representantes')
        .select('id, user_id, nome, email')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (error) {
        console.error('[delete-user] Representante lookup failed', error);
        return new Response(JSON.stringify({ error: 'Failed to locate target representante' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetRepresentante = data;
    }

    // Decide qual perfil será removido. Se a chamada informou source, respeita.
    // Caso contrário, mantém compatibilidade antiga (admin_users primeiro).
    const operateOn: 'admin_users' | 'representantes' | null =
      source === 'admin_users'
        ? (targetAdminUser ? 'admin_users' : null)
        : source === 'representantes'
          ? (targetRepresentante ? 'representantes' : null)
          : targetAdminUser
            ? 'admin_users'
            : targetRepresentante
              ? 'representantes'
              : null;

    if (source === null && targetAdminUser && targetRepresentante) {
      console.warn('[delete-user] user_id exists in both tables; defaulting to admin_users (no source provided)', {
        targetUserId,
      });
    }

    if (!operateOn) {
      return new Response(JSON.stringify({ error: 'Target user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let deletionMode: 'deleted' | 'archived' = 'deleted';

    let deleteAdminError: any = null;
    if (operateOn === 'admin_users') {
      const { error } = await supabaseAdmin
        .from('admin_users')
        .delete()
        .eq('user_id', targetUserId);
      deleteAdminError = error;
    } else {
      const { error } = await supabaseAdmin
        .from('representantes')
        .delete()
        .eq('user_id', targetUserId);
      deleteAdminError = error;
    }

    if (deleteAdminError) {
      // 23503 = FK violation, 23502 = NOT NULL violation (ex.: vendas.atendente_id NOT NULL).
      // Em ambos os casos o registro tem histórico e deve ser arquivado, não excluído.
      const archivableCodes = new Set(['23503', '23502']);
      if (!archivableCodes.has(deleteAdminError.code)) {
        console.error('[delete-user] Failed deleting user row', deleteAdminError);
        return new Response(JSON.stringify({ error: `Failed to delete user data: ${deleteAdminError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.warn('[delete-user] User has related records, archiving profile instead', {
        targetUserId,
        operateOn,
        code: deleteAdminError.code,
        message: deleteAdminError.message,
      });

      const baseName = targetAdminUser?.nome ?? targetRepresentante?.nome ?? 'Usuário';
      const archivedName = baseName.includes('(Arquivado)') ? baseName : `${baseName} (Arquivado)`;
      const archivedEmail = `deleted+${targetUserId}@archived.local`;

      if (operateOn === 'admin_users') {
        const { error: archiveAdminError } = await supabaseAdmin
          .from('admin_users')
          .update({
            ativo: false,
            tipo_usuario: 'arquivado',
            nome: archivedName,
            email: archivedEmail,
            cpf: null,
            foto_perfil_url: null,
            visivel_organograma: false,
          })
          .eq('user_id', targetUserId);

        if (archiveAdminError) {
          console.error('[delete-user] Failed archiving referenced user', archiveAdminError);
          return new Response(JSON.stringify({ error: `Failed to archive referenced user: ${archiveAdminError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        const { error: archiveRepError } = await supabaseAdmin
          .from('representantes')
          .update({
            ativo: false,
            nome: archivedName,
            email: archivedEmail,
            foto_perfil_url: null,
          })
          .eq('user_id', targetUserId);

        if (archiveRepError) {
          console.error('[delete-user] Failed archiving representante', archiveRepError);
          return new Response(JSON.stringify({ error: `Failed to archive representante: ${archiveRepError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      deletionMode = 'archived';
    }

    const disableAuthAccess = async () => {
      const archivedAuthEmail = `deleted+${targetUserId}@archived.local`;
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      return await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        email: archivedAuthEmail,
        password: randomPassword,
        ban_duration: '876000h',
        user_metadata: {
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        },
      });
    };

    // Só bloqueia o acesso do auth user quando NÃO há mais nenhum perfil ativo apontando para ele.
    // Se removemos apenas o registro de representante mas o usuário ainda existe como admin/colaborador,
    // o auth user precisa continuar funcional.
    const { data: remainingAdmin } = await supabaseAdmin
      .from('admin_users')
      .select('id, ativo')
      .eq('user_id', targetUserId)
      .maybeSingle();
    const { data: remainingRep } = await supabaseAdmin
      .from('representantes')
      .select('id, ativo')
      .eq('user_id', targetUserId)
      .maybeSingle();
    const stillHasActiveProfile =
      (remainingAdmin && remainingAdmin.ativo) || (remainingRep && remainingRep.ativo);

    if (stillHasActiveProfile) {
      console.log('[delete-user] Auth user kept active because another profile still references it', {
        targetUserId,
      });
    } else if (deletionMode === 'archived') {
      const { error: archiveAuthError } = await disableAuthAccess();

      if (archiveAuthError) {
        console.error('[delete-user] Failed disabling archived auth user', archiveAuthError);
        return new Response(JSON.stringify({ error: `Usuário arquivado, mas não foi possível bloquear o acesso: ${archiveAuthError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (deleteAuthError) {
        console.warn('[delete-user] Auth user could not be deleted, disabling access instead', deleteAuthError);
        const { error: disableAuthError } = await disableAuthAccess();

        if (disableAuthError) {
          console.error('[delete-user] Failed disabling auth user after delete failure', disableAuthError);
          return new Response(JSON.stringify({ error: `Não foi possível remover nem bloquear o acesso do usuário: ${disableAuthError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        deletionMode = 'archived';
      }
    }

    console.log('[delete-user] User removed', { targetUserId, deletedBy: user.id, mode: deletionMode });

    return new Response(JSON.stringify({
      success: true,
      deleted_user_id: targetUserId,
      mode: deletionMode,
      message: deletionMode === 'archived'
        ? 'O usuário tinha histórico vinculado e foi arquivado, com o acesso removido.'
        : 'Usuário excluído com sucesso.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[delete-user] Unexpected error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
