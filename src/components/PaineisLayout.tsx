import { ReactNode } from "react";
import { PaineisSidebar } from "./PaineisSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingProfileMenu } from "./FloatingProfileMenu";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PaineisLayoutProps {
  children: ReactNode;
}

export function PaineisLayout({ children }: PaineisLayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <PaineisSidebar />

        <SidebarInset className="flex-1 flex flex-col">
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
            <div className="h-12 flex items-center justify-between px-4 w-full">
              <div className="flex items-center">
                <SidebarTrigger className="-ml-1" />
                <div className="h-4 w-px bg-border mx-3" />
                <h1 className="text-lg font-semibold">Painéis</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userRole?.foto_perfil_url} alt="Foto de perfil" />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col text-sm">
                    <span className="font-medium leading-none">{user?.email}</span>
                    <span className="text-xs text-muted-foreground capitalize leading-none mt-1">
                      {userRole?.role?.replace("_", " ")}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
      <FloatingProfileMenu />
    </SidebarProvider>
  );
}
