'use client';

import { useEffect, useState } from 'react';
import InsightsPanel from './InsightsPanel';

export default function DashboardInsightsLoader() {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard-insights');
        const json = await res.json();
        setInsights(json.insights || []);
      } catch (error) {
        console.error('Error loading insights:', error);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return <InsightsPanel insights={insights} isLoading={loading} />;
}
