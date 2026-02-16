import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export function useAppointments(statusFilter) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await client.get(`/appointments${params}`);
      setAppointments(data.appointments);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const updateStatus = async (id, status) => {
    const { data } = await client.patch(`/appointments/${id}`, { status });
    setAppointments((prev) => prev.map((a) => (a.id === id ? data : a)));
    return data;
  };

  return { appointments, loading, fetchAppointments, updateStatus };
}
