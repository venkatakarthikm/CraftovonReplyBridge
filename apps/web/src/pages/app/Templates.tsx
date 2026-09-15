// apps/web/src/pages/app/Templates.tsx
// Template library: system templates + user templates
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Lock } from 'lucide-react';
import { api } from '../../api/client.js';

export default function Templates() {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then((r) => r.data.data),
  });

  const forkMutation = useMutation({
    mutationFn: (templateId: string) => api.post(`/templates/${templateId}/fork`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const systemTemplates = templates?.filter((t: Record<string, unknown>) => t['isSystem']) ?? [];
  const userTemplates = templates?.filter((t: Record<string, unknown>) => !t['isSystem']) ?? [];

  return (
    <div className="section-padding max-w-4xl mx-auto" id="tour-templates">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-white/50 text-sm mt-0.5">Ready-made reply texts. Fork to customize.</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          New template
        </button>
      </div>

      {/* System templates */}
      {systemTemplates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-3.5 h-3.5 text-white/30" />
            <h2 className="text-sm font-medium text-white/50">Library templates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {systemTemplates.map((tpl: Record<string, unknown>) => (
              <TemplateCard
                key={String(tpl['_id'])}
                template={tpl}
                isSystem
                onFork={() => forkMutation.mutate(String(tpl['_id']))}
              />
            ))}
          </div>
        </div>
      )}

      {/* User templates */}
      {userTemplates.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-white/50 mb-4">Your templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {userTemplates.map((tpl: Record<string, unknown>) => (
              <TemplateCard key={String(tpl['_id'])} template={tpl} />
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && !templates?.length && (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 mx-auto text-white/20 mb-4" />
          <p className="text-white/40 text-sm">No templates yet.</p>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  isSystem = false,
  onFork,
}: {
  template: Record<string, unknown>;
  isSystem?: boolean;
  onFork?: () => void;
}) {
  const kindColor: Record<string, string> = {
    private_reply: 'badge-purple',
    comment_reply: 'badge-blue',
    dm_reply: 'badge-green',
  };
  const kind = String(template['kind'] ?? 'private_reply');

  return (
    <div className="card-hover p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-white">{String(template['name'] ?? 'Template')}</p>
        <span className={`badge ${kindColor[kind] ?? 'badge-gray'} flex-shrink-0`}>
          {kind.replace('_', ' ')}
        </span>
      </div>
      <p className="text-xs text-white/50 line-clamp-2 mb-3 leading-relaxed">
        {String(template['body'] ?? '')}
      </p>
      {isSystem && (
        <button onClick={onFork} className="btn-ghost text-xs py-1.5 text-brand-400">
          Fork & customize
        </button>
      )}
    </div>
  );
}
