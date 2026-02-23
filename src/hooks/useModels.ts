import { useState, useEffect } from 'react';
import { AIModel, ApiResponse } from '@/types';

export function useModels(filters?: {
  gender?: string;
  include_poses?: boolean;
  include_expressions?: boolean;
}) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.gender) params.append('gender', filters.gender);
      if (filters?.include_poses) params.append('include_poses', 'true');
      if (filters?.include_expressions) params.append('include_expressions', 'true');

      const url = `/api/models${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      const result: ApiResponse<AIModel[]> = await response.json();

      if (result.success && result.data) {
        setModels(result.data);
      } else {
        setError(result.error || 'Failed to fetch models');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [JSON.stringify(filters)]);

  return { models, loading, error, refetch: fetchModels };
}
