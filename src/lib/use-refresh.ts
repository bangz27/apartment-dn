import { useQueryClient } from "@tanstack/react-query";

export function useRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}
