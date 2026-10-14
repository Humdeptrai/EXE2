-- Run on the same PostgreSQL database used by the deployed backend, after backup.
-- Safe to repeat. No balance, payment status or historical row is changed.
BEGIN;
DO $$
DECLARE col text; item record; attribute smallint;
BEGIN
    FOREACH col IN ARRAY ARRAY['payment_method','consumer_payment_method','provider_payment_method']
    LOOP
        SELECT attnum INTO STRICT attribute FROM pg_attribute
        WHERE attrelid = 'connection_payments'::regclass AND attname = col AND NOT attisdropped;
        -- Only replace single-column enum checks, never unrelated/multi-column business checks.
        FOR item IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'connection_payments'::regclass AND contype = 'c'
              AND conkey = ARRAY[attribute]::smallint[]
              AND pg_get_constraintdef(oid) ~ '(MOMO|ZALOPAY|BANK_TRANSFER|WALLET)'
        LOOP
            EXECUTE format('ALTER TABLE connection_payments DROP CONSTRAINT %I', item.conname);
        END LOOP;
        EXECUTE format('ALTER TABLE connection_payments ADD CONSTRAINT %I CHECK (%I IS NULL OR %I IN (''WALLET'',''MOMO'',''ZALOPAY'',''BANK_TRANSFER''))',
                       'chk_' || col, col, col);
    END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS idx_wallet_topups_uncredited
    ON wallet_topups(order_code) WHERE credited_at IS NULL AND status IN ('CREATED','PENDING');
COMMIT;
