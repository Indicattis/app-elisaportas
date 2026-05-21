import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./admin/AdminHeader";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FloatingProfileMenu } from "./FloatingProfileMenu";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <div className="flex items-center border-b px-3 py-2">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <AdminHeader />
            </div>
          </div>
          <main className="flex-1 p-2 md:p-3 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
      <FloatingProfileMenu />
    </SidebarProvider>
  );
}
