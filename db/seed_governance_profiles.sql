-- Seed Data for Governance Profiles
-- Example profiles for Workers' Comp, Employment, and AI Model Deployment
-- 
-- NOTE: The profiles table is in Supabase, not in the local PostgreSQL database.
-- The created_by and activated_by fields will be NULL.
-- These fields will be automatically populated when profiles are activated via the API
-- (the backend sets activated_by from the JWT token).
-- You can also update them manually if needed.

-- Enable pgcrypto extension for hash functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Workers' Comp - IME Review Profile
-- ============================================================================
INSERT INTO governance_profiles (
  id, name, domain, description, version, status,
  allowed_actions, risk_thresholds, human_review_requirement,
  assignment_rules, metadata, created_by
) VALUES (
  gen_random_uuid(),
  'workers-comp-ime-review',
  'workers-comp',
  'Governance profile for Independent Medical Examination (IME) reviews in Workers Compensation cases. Requires medical expert review for all decisions.',
  1,
  'active',
  ARRAY['approve', 'reject', 'escalate'],
  '{
    "low": {
      "requires_review": false,
      "auto_approve": true
    },
    "medium": {
      "requires_review": true,
      "min_reviewers": 1,
      "sla_hours": 48
    },
    "high": {
      "requires_review": true,
      "min_reviewers": 2,
      "sla_hours": 24,
      "requires_medical_expert": true
    }
  }'::jsonb,
  'required',
  '{
    "roles": ["governance", "reviewer"],
    "sla_hours": 48,
    "escalation_hours": 72,
    "requires_medical_license": true
  }'::jsonb,
  '{
    "use_case": "IME Review",
    "jurisdiction": "US",
    "compliance_standards": ["HIPAA", "State Medical Board"]
  }'::jsonb,
  NULL
);

-- Rules for Workers' Comp profile
INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'workers-comp-ime-review' LIMIT 1),
  rule_type,
  rule_key,
  rule_value,
  priority
FROM (VALUES
  ('action', 'approve', '{"requires_justification": true, "min_confidence": 0.8}'::jsonb, 1),
  ('action', 'reject', '{"requires_justification": true, "requires_documentation": true}'::jsonb, 1),
  ('action', 'escalate', '{"triggers": ["high_risk", "conflicting_evidence"], "escalate_to": "medical_director"}'::jsonb, 1),
  ('risk', 'high', '{"requires_medical_expert": true, "requires_peer_review": true}'::jsonb, 2),
  ('review', 'medical_expert', '{"required_credentials": ["MD", "DO"], "specialties": ["occupational_medicine", "orthopedics"]}'::jsonb, 3)
) AS rules(rule_type, rule_key, rule_value, priority);

-- Data controls for Workers' Comp profile
INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'workers-comp-ime-review' LIMIT 1),
  control_type,
  control_config,
  is_required
FROM (VALUES
  ('pii', '{"encryption_required": true, "access_logging": true, "retention_days": 2555}'::jsonb, true),
  ('phi', '{"hipaa_compliant": true, "encryption_required": true, "access_controls": "strict"}'::jsonb, true),
  ('tokenization', '{"enabled": true, "method": "format_preserving", "preserve_format": true}'::jsonb, false)
) AS controls(control_type, control_config, is_required);

-- Compute and update version hash
UPDATE governance_profiles
SET version_hash = compute_profile_hash(id)
WHERE name = 'workers-comp-ime-review';

-- Set activated timestamp
UPDATE governance_profiles
SET activated_at = CURRENT_TIMESTAMP,
    activated_by = NULL
WHERE name = 'workers-comp-ime-review';

-- ============================================================================
-- 2. Employment - Harassment Claim Profile
-- ============================================================================
INSERT INTO governance_profiles (
  id, name, domain, description, version, status,
  allowed_actions, risk_thresholds, human_review_requirement,
  assignment_rules, metadata, created_by
) VALUES (
  gen_random_uuid(),
  'employment-harassment-claim',
  'employment',
  'Governance profile for employment harassment claims. Requires HR and legal review for sensitive cases.',
  1,
  'active',
  ARRAY['approve', 'reject', 'escalate', 'override'],
  '{
    "low": {
      "requires_review": false,
      "auto_approve": true
    },
    "medium": {
      "requires_review": true,
      "min_reviewers": 1,
      "sla_hours": 72
    },
    "high": {
      "requires_review": true,
      "min_reviewers": 2,
      "sla_hours": 24,
      "requires_legal_review": true,
      "requires_hr_review": true
    }
  }'::jsonb,
  'conditional',
  '{
    "roles": ["governance", "reviewer"],
    "sla_hours": 72,
    "escalation_hours": 96,
    "requires_hr_approval": true,
    "requires_legal_approval_for_high_risk": true
  }'::jsonb,
  '{
    "use_case": "Harassment Claim Review",
    "jurisdiction": "US",
    "compliance_standards": ["EEOC", "State Employment Law"],
    "sensitive_data": true
  }'::jsonb,
  NULL
);

-- Rules for Employment profile
INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'employment-harassment-claim' LIMIT 1),
  rule_type,
  rule_key,
  rule_value,
  priority
FROM (VALUES
  ('action', 'approve', '{"requires_justification": true, "min_confidence": 0.75}'::jsonb, 1),
  ('action', 'reject', '{"requires_justification": true, "requires_documentation": true, "requires_legal_review": true}'::jsonb, 1),
  ('action', 'escalate', '{"triggers": ["high_risk", "legal_complexity"], "escalate_to": "legal_team"}'::jsonb, 1),
  ('action', 'override', '{"requires_admin_approval": true, "requires_justification": true}'::jsonb, 2),
  ('risk', 'high', '{"requires_legal_review": true, "requires_hr_review": true, "requires_documentation": true}'::jsonb, 2),
  ('review', 'hr_review', '{"required_roles": ["governance"], "specialties": ["hr", "employment_law"]}'::jsonb, 3),
  ('review', 'legal_review', '{"required_roles": ["governance"], "requires_legal_license": true}'::jsonb, 3)
) AS rules(rule_type, rule_key, rule_value, priority);

-- Data controls for Employment profile
INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'employment-harassment-claim' LIMIT 1),
  control_type,
  control_config,
  is_required
FROM (VALUES
  ('pii', '{"encryption_required": true, "access_logging": true, "retention_days": 2555, "gdpr_compliant": true}'::jsonb, true),
  ('tokenization', '{"enabled": true, "method": "format_preserving", "preserve_format": true}'::jsonb, true),
  ('encryption', '{"algorithm": "AES-256", "key_rotation_days": 90}'::jsonb, true)
) AS controls(control_type, control_config, is_required);

-- Compute and update version hash
UPDATE governance_profiles
SET version_hash = compute_profile_hash(id)
WHERE name = 'employment-harassment-claim';

-- Set activated timestamp
UPDATE governance_profiles
SET activated_at = CURRENT_TIMESTAMP,
    activated_by = NULL
WHERE name = 'employment-harassment-claim';

-- ============================================================================
-- 3. AI Model Deployment Profile
-- ============================================================================
INSERT INTO governance_profiles (
  id, name, domain, description, version, status,
  allowed_actions, risk_thresholds, human_review_requirement,
  assignment_rules, metadata, created_by
) VALUES (
  gen_random_uuid(),
  'ai-model-deployment',
  'ai-model-deployment',
  'Governance profile for AI model deployment decisions. Requires technical and compliance review for production deployments.',
  1,
  'active',
  ARRAY['approve', 'reject', 'escalate'],
  '{
    "low": {
      "requires_review": false,
      "auto_approve": true
    },
    "medium": {
      "requires_review": true,
      "min_reviewers": 1,
      "sla_hours": 48
    },
    "high": {
      "requires_review": true,
      "min_reviewers": 2,
      "sla_hours": 24,
      "requires_technical_review": true,
      "requires_compliance_review": true
    }
  }'::jsonb,
  'required',
  '{
    "roles": ["governance", "admin"],
    "sla_hours": 48,
    "escalation_hours": 72,
    "requires_technical_approval": true,
    "requires_compliance_approval": true
  }'::jsonb,
  '{
    "use_case": "AI Model Deployment",
    "compliance_standards": ["GDPR", "CCPA", "AI Ethics Guidelines"],
    "requires_model_card": true,
    "requires_bias_audit": true
  }'::jsonb,
  NULL
);

-- Rules for AI Model Deployment profile
INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'ai-model-deployment' LIMIT 1),
  rule_type,
  rule_key,
  rule_value,
  priority
FROM (VALUES
  ('action', 'approve', '{"requires_justification": true, "min_confidence": 0.85, "requires_model_card": true}'::jsonb, 1),
  ('action', 'reject', '{"requires_justification": true, "requires_documentation": true}'::jsonb, 1),
  ('action', 'escalate', '{"triggers": ["high_risk", "bias_concerns", "compliance_issues"], "escalate_to": "ai_ethics_board"}'::jsonb, 1),
  ('risk', 'high', '{"requires_technical_review": true, "requires_compliance_review": true, "requires_bias_audit": true}'::jsonb, 2),
  ('review', 'technical_review', '{"required_roles": ["admin", "governance"], "requires_ml_expertise": true}'::jsonb, 3),
  ('review', 'compliance_review', '{"required_roles": ["governance"], "requires_compliance_expertise": true}'::jsonb, 3)
) AS rules(rule_type, rule_key, rule_value, priority);

-- Data controls for AI Model Deployment profile
INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'ai-model-deployment' LIMIT 1),
  control_type,
  control_config,
  is_required
FROM (VALUES
  ('pii', '{"encryption_required": true, "access_logging": true, "anonymization_required": true}'::jsonb, true),
  ('tokenization', '{"enabled": true, "method": "format_preserving"}'::jsonb, true),
  ('encryption', '{"algorithm": "AES-256", "key_rotation_days": 90}'::jsonb, true),
  ('data_retention', '{"max_retention_days": 365, "auto_delete": true}'::jsonb, true)
) AS controls(control_type, control_config, is_required);

-- Compute and update version hash
UPDATE governance_profiles
SET version_hash = compute_profile_hash(id)
WHERE name = 'ai-model-deployment';

-- Set activated timestamp
UPDATE governance_profiles
SET activated_at = CURRENT_TIMESTAMP,
    activated_by = NULL
WHERE name = 'ai-model-deployment';

-- ============================================================================
-- Create audit log entries for seeded profiles
-- ============================================================================
-- Use a system UUID for seed data (since created_by and activated_by are NULL)
-- This represents a system/seeding operation
INSERT INTO governance_profile_audit (profile_id, action, performed_by, changes, justification)
SELECT 
  id,
  'created',
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user for seed data
  '{}'::jsonb,
  'Profile created via seed data'
FROM governance_profiles
WHERE name IN ('workers-comp-ime-review', 'employment-harassment-claim', 'ai-model-deployment');

INSERT INTO governance_profile_audit (profile_id, action, performed_by, changes, justification)
SELECT 
  id,
  'activated',
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user for seed data
  jsonb_build_object('version_hash', version_hash),
  'Profile activated via seed data'
FROM governance_profiles
WHERE name IN ('workers-comp-ime-review', 'employment-harassment-claim', 'ai-model-deployment');

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE governance_profiles IS 'Governance profiles seeded with example data for Workers Comp, Employment, and AI Model Deployment';

