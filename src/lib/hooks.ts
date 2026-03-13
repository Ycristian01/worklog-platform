import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Category {
  id: string;
  name: string;
  color: string | null;
}

export interface Entry {
  id: string;
  userId: string;
  date: string;
  categoryId: string | null;
  category: Category | null;
  timeHours: number;
  description: string;
  notes: string | null;
  status: "draft" | "confirmed" | "submitted";
  source: string | null;
  signalIds: string[];
  aiSuggested: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DayStatus {
  submitted: boolean;
  submittedAt: string | null;
  totalHours: number | null;
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useEntries(date: string) {
  return useQuery<Entry[]>({
    queryKey: ["entries", date],
    queryFn: async () => {
      const res = await fetch(`/api/entries?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
  });
}

export function useDayStatus(date: string) {
  return useQuery<DayStatus>({
    queryKey: ["dayStatus", date],
    queryFn: async () => {
      const res = await fetch(`/api/days/${date}/status`);
      if (!res.ok) throw new Error("Failed to fetch day status");
      return res.json();
    },
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      date: string;
      categoryId?: string;
      timeHours: number;
      description: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source: "manual" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create entry");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.date] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      date,
      ...data
    }: {
      id: string;
      date: string;
      categoryId?: string;
      timeHours?: number;
      description?: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update entry");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.date] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; date: string }) => {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete entry");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.date] });
    },
  });
}

export function useConfirmEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; date: string }) => {
      const res = await fetch(`/api/entries/${id}/confirm`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to confirm entry");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.date] });
    },
  });
}

export function useSubmitDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(`/api/days/${date}/submit`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to submit day");
      }
      return res.json();
    },
    onSuccess: (_data, date) => {
      queryClient.invalidateQueries({ queryKey: ["entries", date] });
      queryClient.invalidateQueries({ queryKey: ["dayStatus", date] });
    },
  });
}
