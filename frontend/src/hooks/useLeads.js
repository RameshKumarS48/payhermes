import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export function useLeads(filters = {}) {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.funnel_id) params.set('funnel_id', filters.funnel_id);
      if (filters.page) params.set('page', filters.page);
      const { data } = await client.get(`/leads?${params}`);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch leads', err);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.funnel_id, filters.page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const getLeadDetail = async (id) => {
    const { data } = await client.get(`/leads/${id}`);
    return data;
  };

  return { leads, total, loading, fetchLeads, getLeadDetail };
}
