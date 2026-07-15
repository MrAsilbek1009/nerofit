import { supabase } from "@/lib/supabase";
import type { SupportTicket, SupportTicketMessage } from "@/types/db";

// The member's own tickets, newest first. RLS (migration 0025) scopes this to
// auth.uid() = user_id, so no extra filter is strictly needed — we pass it for
// query-key clarity and belt-and-braces.
export async function getMyTickets(userId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

// The full thread of a ticket the member owns (RLS gates it to their own).
export async function getTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SupportTicketMessage[];
}

// Submit a new ticket: create the ticket (subject = chosen category) then post
// the description as the first 'member' message. Both inserts are allowed by the
// RLS insert policies (own ticket, own 'member' message). status/priority default
// server-side (open / normal).
export async function createTicket(
  userId: string,
  subject: string,
  body: string,
): Promise<string> {
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: userId, subject })
    .select("id")
    .single();
  if (error) throw error;

  const { error: msgError } = await supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: ticket.id, author_kind: "member", body });
  if (msgError) throw msgError;

  return ticket.id as string;
}
