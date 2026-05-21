import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ArrowLeft, Mail, Shield, Building2, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SETOR_LABELS } from "@/utils/setorMapping";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function MeuPerfil() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user || !userRole) return null;

  const handleAvatarUpdate = (url: string | null) => {
    window.location.reload();
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erro", description: "A nova senha deve ter pelo menos 6 caracteres" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Erro", description: "As senhas não coincidem" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Sucesso", description: "Senha alterada com sucesso" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Erro ao alterar senha" });
    } finally {
      setChangingPassword(false);
    }
  };

  const setorLabel = userRole.setor ? SETOR_LABELS[userRole.setor] || userRole.setor : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-white/60 hover:text-white hover:bg-white/10 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-8">Meu Perfil</h1>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={userRole.foto_perfil_url}
              userName={userRole.nome}
              onAvatarUpdate={handleAvatarUpdate}
            />
          </div>

          {/* Info */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Nome</p>
              <p className="text-lg font-medium">{userRole.nome}</p>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm">{userRole.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Cargo</p>
                <p className="text-sm capitalize">{userRole.role.replace(/_/g, ' ')}</p>
              </div>
            </div>

            {setorLabel && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Setor</p>
                  <p className="text-sm">{setorLabel}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alterar Senha */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5 mt-6">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-white/60" />
            <h2 className="text-lg font-semibold">Alterar Senha</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white pr-10"
                  placeholder="Repita a nova senha"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleUpdatePassword}
            disabled={changingPassword}
            className="w-full"
          >
            {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar nova senha
          </Button>
        </div>
      </div>
    </div>
  );
}