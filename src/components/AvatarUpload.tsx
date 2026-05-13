
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName: string;
  onAvatarUpdate: (url: string | null) => void;
  compact?: boolean;
}

export function AvatarUpload({ userId, currentAvatarUrl, userName, onAvatarUpdate, compact = false }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];

      // Validação do tipo de arquivo
      if (!file.type.startsWith("image/")) {
        throw new Error("Por favor, selecione apenas arquivos de imagem.");
      }

      // Validação do tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 5MB.");
      }

      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '31536000' // 1 ano
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      // Atualizar na base de dados com a URL do Storage
      const { data: updatedRows, error: updateError } = await supabase
        .from('admin_users')
        .update({ foto_perfil_url: publicUrl })
        .eq('user_id', userId)
        .select('id');

      if (updateError) {
        throw updateError;
      }

      // Fallback para representantes (não estão em admin_users)
      if (!updatedRows || updatedRows.length === 0) {
        const { data: repRows, error: repError } = await supabase
          .from('representantes')
          .update({ foto_perfil_url: publicUrl } as Record<string, unknown>)
          .eq('user_id', userId)
          .select('id');
        if (repError) throw repError;
        if (!repRows || repRows.length === 0) {
          throw new Error('Não foi possível salvar a foto: usuário não encontrado ou sem permissão.');
        }
      }

      onAvatarUpdate(publicUrl);
      
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada com sucesso",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Erro ao fazer upload da foto",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      // Se existe URL atual, tentar remover do storage
      if (currentAvatarUrl && currentAvatarUrl.includes('user-avatars')) {
        const filePath = currentAvatarUrl.split('/user-avatars/')[1];
        if (filePath) {
          await supabase.storage
            .from('user-avatars')
            .remove([`avatars/${filePath}`]);
        }
      }

      // Remover da base de dados
      const { data: updatedRows, error: updateError } = await supabase
        .from('admin_users')
        .update({ foto_perfil_url: null })
        .eq('user_id', userId)
        .select('id');

      if (updateError) {
        throw updateError;
      }

      if (!updatedRows || updatedRows.length === 0) {
        const { data: repRows, error: repError } = await supabase
          .from('representantes')
          .update({ foto_perfil_url: null } as Record<string, unknown>)
          .eq('user_id', userId)
          .select('id');
        if (repError) throw repError;
        if (!repRows || repRows.length === 0) {
          throw new Error('Não foi possível remover a foto: usuário não encontrado ou sem permissão.');
        }
      }

      onAvatarUpdate(null);
      
      toast({
        title: "Sucesso",
        description: "Foto de perfil removida com sucesso",
      });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao remover foto",
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <Avatar className="w-6 h-6">
        <AvatarImage 
          src={currentAvatarUrl || undefined} 
          alt={userName} 
        />
        <AvatarFallback className="text-[8px]">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Avatar className="w-16 h-16">
        <AvatarImage 
          src={currentAvatarUrl || undefined} 
          alt={userName} 
        />
        <AvatarFallback className="text-lg">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            asChild
          >
            <label className="cursor-pointer">
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              {uploading ? "Enviando..." : "Alterar Foto"}
              <Input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
              />
            </label>
          </Button>
          
          {currentAvatarUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={removeAvatar}
              disabled={uploading}
            >
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou GIF. Máx. 5MB.
        </p>
      </div>
    </div>
  );
}
