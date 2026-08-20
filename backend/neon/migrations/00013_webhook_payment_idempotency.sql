-- Allow transient webhook claims to be retried until processing completes.
ALTER TABLE public.stripe_webhook_events
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
    ALTER COLUMN processed_at DROP DEFAULT,
    ALTER COLUMN processed_at DROP NOT NULL;

UPDATE public.stripe_webhook_events
SET claimed_at = processed_at
WHERE claimed_at IS NULL;

DO $$
DECLARE
    duplicate_count integer;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT payment_id
        FROM public.credit_transactions
        WHERE payment_id IS NOT NULL
          AND amount > 0
        GROUP BY payment_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION
            'Cannot create idx_credit_transactions_purchase_payment_id: % duplicate payment_id values have multiple positive credit transactions. Insert compensating negative ledger rows for duplicate grants, then rerun this migration.',
            duplicate_count;
    END IF;
END $$;

-- Prevent duplicate Stripe checkout sessions from granting credits twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_purchase_payment_id
    ON public.credit_transactions(payment_id)
    WHERE payment_id IS NOT NULL AND amount > 0;
