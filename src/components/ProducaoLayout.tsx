import { ReactNode } from "react";
import { ProducaoHeader } from "./producao/ProducaoHeader";
import { FloatingProfileMenu } from "./FloatingProfileMenu";

interface ProducaoLayoutProps {
  children: ReactNode;
}

export function ProducaoLayout({ children }: ProducaoLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <ProducaoHeader />
        <main className="flex-1 p-2 md:p-3 overflow-auto">
          {children}
        </main>
      </div>
      <FloatingProfileMenu />
    </div>
  );
}
