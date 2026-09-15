// apps/web/src/pages/app/Help.tsx
// Help center: articles from doc 07, categorized view
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { HelpCircle, BookOpen, ChevronRight } from 'lucide-react';
import { api } from '../../api/client.js';

export default function Help() {
  const { slug } = useParams<{ slug?: string }>();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['help-articles'],
    queryFn: () => api.get('/help').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="section-padding max-w-3xl mx-auto">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // Article detail view
  if (slug) {
    const article = articles?.find((a: Record<string, unknown>) => a['slug'] === slug);
    if (!article) return <div className="section-padding text-white/50">Article not found.</div>;

    return (
      <div className="section-padding max-w-2xl mx-auto">
        <Link to="/help" className="btn-ghost mb-6 -ml-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> All articles
        </Link>
        <h1 className="text-2xl font-bold text-white mb-6">{String(article['title'])}</h1>
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: String(article['bodyHtml'] ?? '') }}
          style={{
            color: 'rgba(255,255,255,0.75)',
            lineHeight: '1.7',
          }}
        />
      </div>
    );
  }

  // Category grouping
  const categories = [...new Set(articles?.map((a: Record<string, unknown>) => String(a['category'])) ?? [])];

  return (
    <div className="section-padding max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="w-6 h-6 text-brand-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Help Center</h1>
          <p className="text-white/50 text-sm">Everything you need to know about ReplyBridge.</p>
        </div>
      </div>

      {categories.map((category: any) => {
        const catArticles = articles?.filter(
          (a: Record<string, unknown>) => a['category'] === category
        ) ?? [];

        return (
          <div key={category} className="mb-8">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="space-y-2">
              {catArticles.map((article: Record<string, unknown>) => (
                <Link
                  key={String(article['_id'])}
                  to={`/help/${article['slug']}`}
                  className="card-hover flex items-center gap-4 p-4 block"
                >
                  <BookOpen className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <span className="text-sm text-white flex-1">{String(article['title'])}</span>
                  <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
