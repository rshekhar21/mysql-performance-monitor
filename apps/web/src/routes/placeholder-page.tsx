import { EmptyState } from '../components/empty-state';
import { PageHeader } from '../components/page-header';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="This page is part of the planned operational surface."
      />
      <EmptyState
        title="Waiting for the next implementation phase"
        body="The route exists now so navigation and permissions can settle before metric-specific screens are filled in."
      />
    </div>
  );
}
