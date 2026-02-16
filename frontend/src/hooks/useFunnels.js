import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export function useFunnels() {
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFunnels = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/funnels');
      setFunnels(data);
    } catch (err) {
      console.error('Failed to fetch funnels', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);

  const generateFunnel = async (prompt, name) => {
    const { data } = await client.post('/funnels/generate', { prompt, name });
    setFunnels((prev) => [data, ...prev]);
    return data;
  };

  const updateFunnel = async (id, updates) => {
    const { data } = await client.patch(`/funnels/${id}`, updates);
    setFunnels((prev) => prev.map((f) => (f.id === id ? data : f)));
    return data;
  };

  const deleteFunnel = async (id) => {
    await client.delete(`/funnels/${id}`);
    setFunnels((prev) => prev.filter((f) => f.id !== id));
  };

  return { funnels, loading, fetchFunnels, generateFunnel, updateFunnel, deleteFunnel };
}
