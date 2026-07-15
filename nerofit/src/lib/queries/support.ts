import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTicket, getMyTickets, getTicketMessages } from "@/lib/api/support";

export function useMyTickets(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["support-tickets", userId] : ["support-tickets", "none"],
    queryFn: () => getMyTickets(userId!),
    enabled: !!userId,
  });
}

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-messages", ticketId],
    queryFn: () => getTicketMessages(ticketId!),
    enabled: !!ticketId,
  });
}

// Submit a ticket, then refresh the member's list so it appears immediately.
export function useCreateTicket(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, body }: { subject: string; body: string }) =>
      createTicket(userId!, subject, body),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: ["support-tickets", userId] });
    },
  });
}
