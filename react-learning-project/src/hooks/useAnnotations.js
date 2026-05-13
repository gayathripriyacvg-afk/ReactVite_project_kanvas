import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/annotations';

export const useAnnotations = (documentId) => {
  return useQuery({
    queryKey: ['annotations', documentId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/${documentId}`);
      return data;
    },
    enabled: !!documentId,
  });
};

export const useSaveAnnotations = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.post(API_URL, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['annotations', variables.documentId] });
    },
  });
};
