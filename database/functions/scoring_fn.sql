-- =============================================================================
-- Motor de Scoring Determinístico — Espejo SQL de lib/scoring.ts (rulesVersion v1.0.0)
-- =============================================================================
-- Implementa la MISMA lógica de negocio que lib/scoring.ts para poder calcular
-- el scoring directamente en Postgres (trigger o RPC de Supabase) sin depender
-- de una llamada a la capa de aplicación.
--
-- IMPORTANTE: si modificas los pesos/umbrales aquí, replica el cambio en
-- lib/scoring.ts y viceversa, e incrementa RULES_VERSION en ambos lugares.
--
-- Contrato de datos esperado (coordinar con Agente DB Architect / schema.sql):
--   monthly_salary          NUMERIC   (CLP)
--   savings_amount          NUMERIC   (CLP)
--   employment_type         TEXT      ('indefinido'|'plazo_fijo'|'honorarios'|'independiente')
--   employment_years        NUMERIC
--   has_existing_debt       BOOLEAN
--   monthly_debt_payments   NUMERIC   (CLP)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Sub-función: score de SALARIO (peso máximo 35)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION scoring_fn_salario(monthly_salary NUMERIC, weight NUMERIC DEFAULT 35)
RETURNS NUMERIC AS $$
BEGIN
  IF monthly_salary IS NULL OR monthly_salary <= 0 THEN
    RETURN 0;
  ELSIF monthly_salary < 500000 THEN
    RETURN weight * 0.15;
  ELSIF monthly_salary < 900000 THEN
    RETURN weight * 0.4;
  ELSIF monthly_salary < 1500000 THEN
    RETURN weight * 0.65;
  ELSIF monthly_salary < 2500000 THEN
    RETURN weight * 0.85;
  ELSE
    RETURN weight * 1.0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- Sub-función: score de AHORRO / pie disponible (peso máximo 25)
-- Referencia: propiedad de 60M CLP, pie ideal 20% = 12M CLP
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION scoring_fn_ahorro(savings_amount NUMERIC, weight NUMERIC DEFAULT 25)
RETURNS NUMERIC AS $$
DECLARE
  reference_property_value NUMERIC := 60000000;
  ideal_down_payment_ratio NUMERIC := 0.2;
  ideal_savings NUMERIC;
  ratio NUMERIC;
BEGIN
  IF savings_amount IS NULL OR savings_amount <= 0 THEN
    RETURN 0;
  END IF;

  ideal_savings := reference_property_value * ideal_down_payment_ratio;
  ratio := savings_amount / ideal_savings;

  IF ratio >= 1 THEN
    RETURN weight * 1.0;
  ELSIF ratio >= 0.5 THEN
    RETURN weight * 0.7;
  ELSIF ratio >= 0.25 THEN
    RETURN weight * 0.45;
  ELSIF ratio >= 0.1 THEN
    RETURN weight * 0.2;
  ELSE
    RETURN weight * 0.05;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- Sub-función: score de ESTABILIDAD LABORAL (peso máximo 20)
-- Tipo de contrato pesa 60% del factor, antigüedad pesa 40%
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION scoring_fn_estabilidad_laboral(
  employment_type TEXT,
  employment_years NUMERIC,
  weight NUMERIC DEFAULT 20
)
RETURNS NUMERIC AS $$
DECLARE
  type_score NUMERIC;
  years_score NUMERIC;
  years NUMERIC;
BEGIN
  years := COALESCE(employment_years, 0);
  IF years < 0 THEN
    years := 0;
  END IF;

  type_score := CASE employment_type
    WHEN 'indefinido' THEN 1.0
    WHEN 'plazo_fijo' THEN 0.6
    WHEN 'honorarios' THEN 0.4
    WHEN 'independiente' THEN 0.3
    ELSE 0
  END;

  IF years >= 5 THEN
    years_score := 1.0;
  ELSIF years >= 2 THEN
    years_score := 0.7;
  ELSIF years >= 1 THEN
    years_score := 0.4;
  ELSE
    years_score := 0.1;
  END IF;

  RETURN weight * (type_score * 0.6 + years_score * 0.4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- Sub-función: score de CARGA FINANCIERA (peso máximo 20)
-- Ratio dividendo/renta = deuda mensual / salario mensual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION scoring_fn_carga_financiera(
  has_existing_debt BOOLEAN,
  monthly_debt_payments NUMERIC,
  monthly_salary NUMERIC,
  weight NUMERIC DEFAULT 20
)
RETURNS NUMERIC AS $$
DECLARE
  ratio NUMERIC;
BEGIN
  IF has_existing_debt IS NOT TRUE OR monthly_debt_payments IS NULL OR monthly_debt_payments <= 0 THEN
    RETURN weight * 1.0;
  END IF;

  IF monthly_salary IS NULL OR monthly_salary <= 0 THEN
    RETURN 0;
  END IF;

  ratio := monthly_debt_payments / monthly_salary;

  IF ratio <= 0.1 THEN
    RETURN weight * 0.9;
  ELSIF ratio <= 0.25 THEN
    RETURN weight * 0.7;
  ELSIF ratio <= 0.35 THEN
    RETURN weight * 0.45;
  ELSIF ratio <= 0.5 THEN
    RETURN weight * 0.15;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- Función principal: calcula el scoring completo y retorna score + categoría
-- -----------------------------------------------------------------------------
-- Parámetros de pesos/umbrales con DEFAULT = valores actuales de
-- lib/scoring.ts (FACTOR_WEIGHTS/SCORING_THRESHOLDS). Pasar valores propios
-- permite recalcular con una configuración distinta (ej. la vigente en
-- `scoring_rule_sets` para una organización) sin tocar esta función.
CREATE OR REPLACE FUNCTION scoring_fn(
  monthly_salary NUMERIC,
  savings_amount NUMERIC,
  employment_type TEXT,
  employment_years NUMERIC,
  has_existing_debt BOOLEAN,
  monthly_debt_payments NUMERIC,
  weight_salario NUMERIC DEFAULT 35,
  weight_ahorro NUMERIC DEFAULT 25,
  weight_estabilidad NUMERIC DEFAULT 20,
  weight_carga NUMERIC DEFAULT 20,
  threshold_plata NUMERIC DEFAULT 40,
  threshold_oro NUMERIC DEFAULT 60,
  threshold_platino NUMERIC DEFAULT 80
)
RETURNS TABLE (
  score NUMERIC,
  category TEXT,
  salario_points NUMERIC,
  ahorro_points NUMERIC,
  estabilidad_points NUMERIC,
  carga_points NUMERIC,
  rules_version TEXT
) AS $$
DECLARE
  v_salario NUMERIC;
  v_ahorro NUMERIC;
  v_estabilidad NUMERIC;
  v_carga NUMERIC;
  v_raw_score NUMERIC;
  v_score NUMERIC;
  v_category TEXT;
BEGIN
  IF weight_salario + weight_ahorro + weight_estabilidad + weight_carga > 100 THEN
    RAISE EXCEPTION 'Configuración inválida de scoring: la suma de pesos excede 100';
  END IF;

  v_salario := scoring_fn_salario(monthly_salary, weight_salario);
  v_ahorro := scoring_fn_ahorro(savings_amount, weight_ahorro);
  v_estabilidad := scoring_fn_estabilidad_laboral(employment_type, employment_years, weight_estabilidad);
  v_carga := scoring_fn_carga_financiera(has_existing_debt, monthly_debt_payments, monthly_salary, weight_carga);

  v_raw_score := v_salario + v_ahorro + v_estabilidad + v_carga;
  -- Clamp defensivo a [0, 100], redondeado a 1 decimal (igual que TS)
  v_score := ROUND(LEAST(100, GREATEST(0, v_raw_score))::NUMERIC, 1);

  v_category := CASE
    WHEN v_score >= threshold_platino THEN 'PLATINO'
    WHEN v_score >= threshold_oro THEN 'ORO'
    WHEN v_score >= threshold_plata THEN 'PLATA'
    ELSE 'BRONCE'
  END;

  RETURN QUERY SELECT
    v_score,
    v_category,
    v_salario,
    v_ahorro,
    v_estabilidad,
    v_carga,
    'v1.0.0'::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- Variante que lee la configuración ACTIVA de `scoring_rule_sets` para la
-- organización dada y la usa para calcular. Si no hay fila activa, cae a los
-- defaults de `scoring_fn` (mismo comportamiento de fallback que
-- `loadActiveScoringConfig` en lib/scoring.ts).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION scoring_fn_for_org(
  p_org_id UUID,
  monthly_salary NUMERIC,
  savings_amount NUMERIC,
  employment_type TEXT,
  employment_years NUMERIC,
  has_existing_debt BOOLEAN,
  monthly_debt_payments NUMERIC
)
RETURNS TABLE (
  score NUMERIC,
  category TEXT,
  salario_points NUMERIC,
  ahorro_points NUMERIC,
  estabilidad_points NUMERIC,
  carga_points NUMERIC,
  rules_version TEXT
) AS $$
DECLARE
  v_config RECORD;
BEGIN
  SELECT weights, thresholds INTO v_config
  FROM scoring_rule_sets
  WHERE org_id = p_org_id AND is_active
  LIMIT 1;

  IF v_config IS NULL THEN
    -- Sin config activa: usa todos los defaults de scoring_fn.
    RETURN QUERY SELECT * FROM scoring_fn(
      monthly_salary, savings_amount, employment_type, employment_years,
      has_existing_debt, monthly_debt_payments
    );
  ELSE
    RETURN QUERY SELECT * FROM scoring_fn(
      monthly_salary, savings_amount, employment_type, employment_years,
      has_existing_debt, monthly_debt_payments,
      (v_config.weights->>'SALARIO')::NUMERIC,
      (v_config.weights->>'AHORRO')::NUMERIC,
      (v_config.weights->>'ESTABILIDAD_LABORAL')::NUMERIC,
      (v_config.weights->>'CARGA_FINANCIERA')::NUMERIC,
      (v_config.thresholds->'PLATA'->>'min')::NUMERIC,
      (v_config.thresholds->'ORO'->>'min')::NUMERIC,
      (v_config.thresholds->'PLATINO'->>'min')::NUMERIC
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
-- NOTA: no IMMUTABLE (a diferencia de scoring_fn) porque consulta una tabla
-- que puede cambiar (scoring_rule_sets); STABLE sería más preciso pero
-- plpgsql con SELECT a tabla + control de flujo se declara sin marcador aquí
-- por simplicidad.

-- Ejemplo de uso:
-- SELECT * FROM scoring_fn(1800000, 12000000, 'indefinido', 4, false, 0);
-- SELECT * FROM scoring_fn_for_org('00000000-0000-0000-0000-000000000001', 1800000, 12000000, 'indefinido', 4, false, 0);
