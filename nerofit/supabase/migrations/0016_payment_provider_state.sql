-- 0016_payment_provider_state.sql
-- Stage 2 of gym membership: real payment providers (Payme + Click).
-- Payme's Merchant API (JSON-RPC) is stateful — the CheckTransaction method
-- must echo back the transaction's state and its create/perform/cancel times.
-- We persist those on the payments row so the webhook can answer correctly and
-- stay idempotent (Payme retries the same transaction id).
--
-- Columns are all nullable — only the webhook writes them (service role),
-- Stage-1 manual activation leaves them null.

alter table public.payments
  -- Payme transaction state:  1 = created, 2 = performed,
  -- -1 = cancelled before perform, -2 = cancelled after perform.
  add column if not exists provider_state integer,
  -- Unix milliseconds, as sent/echoed to Payme.
  add column if not exists create_time    bigint,
  add column if not exists perform_time   bigint,
  add column if not exists cancel_time    bigint,
  -- Payme cancel reason code (echoed in CheckTransaction).
  add column if not exists cancel_reason  integer;

-- Look up a payment by the provider's transaction id during webhook handling.
create index if not exists payments_provider_txn_idx
  on public.payments (provider, provider_txn);
