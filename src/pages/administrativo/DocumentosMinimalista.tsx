import { MinimalistLayout } from '@/components/MinimalistLayout';
import DocumentosPanel, { useDocumentosHeaderActions } from '@/components/marketing/DocumentosPanel';

export default function DocumentosMinimalista() {
  const headerActions = useDocumentosHeaderActions();
  return (
    <MinimalistLayout
      title="Documentos"
      subtitle="Gerencie e visualize documentos públicos"
      backPath="/administrativo"
      headerActions={headerActions}
    >
      <DocumentosPanel />
    </MinimalistLayout>
  );
}
