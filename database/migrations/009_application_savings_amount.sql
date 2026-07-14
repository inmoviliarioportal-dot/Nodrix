-- Persiste el ahorro disponible declarado por el cliente (wizard,
-- savingsAmount) en la application -- antes solo se usaba en memoria para
-- calcular el scoring y se descartaba, lo que impedía calcular una
-- pre-evaluación real más adelante (DOCUMENTOS_APROBADOS -> PRE_EVALUACION_COMPLETADA).
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS savings_amount NUMERIC(14,2);
