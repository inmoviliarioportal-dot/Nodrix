-- Persiste el saldo total de deuda de corto plazo declarado por el cliente
-- (wizard, totalDebtBalance) en la application -- antes ni siquiera se
-- recolectaba este dato (solo existía "cuota mensual de deuda", descartada
-- tras calcular el scoring). Se necesita persistido para poder calcular el
-- parámetro de Leverage en la pre-evaluación en UF
-- (GET /api/applications/[id]/proposal-bands), igual que savings_amount
-- (ver 009_application_savings_amount.sql).
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS total_debt_balance NUMERIC(14,2);
