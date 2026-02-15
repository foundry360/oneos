-- ============================================================================
-- Create Three Governance Profiles
-- ============================================================================
-- This script creates three governance profiles with rules, data controls, and audit entries
-- ============================================================================

-- Enable pgcrypto extension for hash functions (if available)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION
    WHEN OTHERS THEN
        -- Extension may not be available in all environments
        NULL;
END $$;

-- Ensure compute_profile_hash function exists
CREATE OR REPLACE FUNCTION compute_profile_hash(profile_id UUID)
RETURNS TEXT AS $$
DECLARE
    profile_data JSONB;
    rules_data JSONB;
    controls_data JSONB;
    combined_data TEXT;
    p_id UUID := profile_id;
BEGIN
    -- Get profile data
    SELECT row_to_json(p)::jsonb INTO profile_data
    FROM (
        SELECT id, name, domain, description, version, status, allowed_actions, 
               risk_thresholds, human_review_requirement, assignment_rules, metadata
        FROM governance_profiles
        WHERE id = p_id
    ) p;
    
    -- Get rules data
    SELECT COALESCE(json_agg(row_to_json(r)::jsonb ORDER BY priority, rule_type, rule_key), '[]'::json) INTO rules_data
    FROM (
        SELECT rule_type, rule_key, rule_value, priority
        FROM governance_profile_rules
        WHERE governance_profile_rules.profile_id = p_id
    ) r;
    
    -- Get controls data
    SELECT COALESCE(json_agg(row_to_json(c)::jsonb ORDER BY control_type), '[]'::json) INTO controls_data
    FROM (
        SELECT control_type, control_config, is_required
        FROM governance_profile_data_controls
        WHERE governance_profile_data_controls.profile_id = p_id
    ) c;
    
    -- Combine all data
    combined_data := (profile_data || jsonb_build_object('rules', rules_data) || jsonb_build_object('data_controls', controls_data))::text;
    
    -- Return SHA-256 hash
    BEGIN
        RETURN encode(digest(combined_data, 'sha256'), 'hex');
    EXCEPTION
        WHEN OTHERS THEN
            RETURN md5(combined_data);
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Governance Profile 1: Financial Compliance Review
-- ============================================================================
INSERT INTO governance_profiles (
  id, name, domain, description, version, status,
  allowed_actions, risk_thresholds, human_review_requirement,
  assignment_rules, metadata, created_by
) VALUES (
  gen_random_uuid(),
  'financial-compliance-review',
  'financial',
  'Governance profile for financial compliance reviews. Requires compliance officer and financial expert review for regulatory compliance decisions.',
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
      "requires_compliance_officer": true,
      "requires_financial_expert": true
    }
  }'::jsonb,
  'required',
  '{
    "roles": ["governance", "reviewer"],
    "sla_hours": 48,
    "escalation_hours": 72,
    "requires_compliance_certification": true
  }'::jsonb,
  '{
    "use_case": "Financial Compliance Review",
    "jurisdiction": "US",
    "compliance_standards": ["SOX", "FINRA", "SEC Regulations"]
  }'::jsonb,
  NULL
)
ON CONFLICT (name, version) DO NOTHING;

-- Rules for Financial Compliance profile
INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'financial-compliance-review' LIMIT 1),
  rule_type,
  rule_key,
  rule_value,
  priority
FROM (VALUES
  ('action', 'approve', '{"requires_justification": true, "min_confidence": 0.85, "requires_compliance_check": true}'::jsonb, 1),
  ('action', 'reject', '{"requires_justification": true, "requires_documentation": true, "requires_compliance_review": true}'::jsonb, 1),
  ('action', 'escalate', '{"triggers": ["high_risk", "regulatory_concern", "compliance_issue"], "escalate_to": "compliance_director"}'::jsonb, 1),
  ('risk', 'high', '{"requires_compliance_officer": true, "requires_financial_expert": true, "requires_documentation": true}'::jsonb, 2),
  ('review', 'compliance_review', '{"required_roles": ["governance"], "requires_compliance_certification": true}'::jsonb, 3),
  ('review', 'financial_review', '{"required_roles": ["governance"], "requires_financial_expertise": true}'::jsonb, 3)
) AS rules(rule_type, rule_key, rule_value, priority)
ON CONFLICT DO NOTHING;

-- Data controls for Financial Compliance profile
INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'financial-compliance-review' LIMIT 1),
  control_type,
  control_config,
  is_required
FROM (VALUES
  ('pii', '{"encryption_required": true, "access_logging": true, "retention_days": 2555, "gdpr_compliant": true}'::jsonb, true),
  ('financial_data', '{"encryption_required": true, "access_controls": "strict", "audit_trail": true}'::jsonb, true),
  ('tokenization', '{"enabled": true, "method": "format_preserving", "preserve_format": true}'::jsonb, true),
  ('encryption', '{"algorithm": "AES-256", "key_rotation_days": 90}'::jsonb, true)
) AS controls(control_type, control_config, is_required)
ON CONFLICT DO NOTHING;

-- Compute and update version hash
UPDATE governance_profiles
SET version_hash = compute_profile_hash(id)
WHERE name = 'financial-compliance-review';

-- Set activated timestamp
UPDATE governance_profiles
SET activated_at = CURRENT_TIMESTAMP,
    activated_by = NULL
WHERE name = 'financial-compliance-review';

-- ============================================================================
-- Governance Profile 2: Healthcare Data Processing
-- ============================================================================
INSERT INTO governance_profiles (
  id, name, domain, description, version, status,
  allowed_actions, risk_thresholds, human_review_requirement,
  assignment_rules, metadata, created_by
) VALUES (
  gen_random_uuid(),
  'healthcare-data-processing',
  'healthcare',
  'Governance profile for healthcare data processing. Requires HIPAA compliance and medical data expert review for all patient data decisions.',
  1,
  'active',
  ARRAY['approve', 'reject', 'escalate'],
  '{
    "low": {
      "requires_review": true,
      "min_reviewers": 1,
      "sla_hours": 72
    },
    "medium": {
      "requires_review": true,
      "min_reviewers": 1,
      "sla_hours": 48,
      "requires_hipaa_review": true
    },
    "high": {
      "requires_review": true,
      "min_reviewers": 2,
      "sla_hours": 24,
      "requires_hipaa_review": true,
      "requires_medical_expert": true,
      "requires_privacy_officer": true
    }
  }'::jsonb,
  'required',
  '{
    "roles": ["governance", "reviewer"],
    "sla_hours": 48,
    "escalation_hours": 72,
    "requires_hipaa_compliance": true,
    "requires_privacy_officer_approval": true
  }'::jsonb,
  '{
    "use_case": "Healthcare Data Processing",
    "jurisdiction": "US",
    "compliance_standards": ["HIPAA", "HITECH", "State Medical Privacy Laws"],
    "sensitive_data": true,
    "phi_handling": true
  }'::jsonb,
  NULL
)
ON CONFLICT (name, version) DO NOTHING;

-- Rules for Healthcare Data Processing profile
INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'healthcare-data-processing' LIMIT 1),
  rule_type,
  rule_key,
  rule_value,
  priority
FROM (VALUES
  ('action', 'approve', '{"requires_justification": true, "min_confidence": 0.9, "requires_hipaa_compliance": true}'::jsonb, 1),
  ('action', 'reject', '{"requires_justification": true, "requires_documentation": true, "requires_privacy_review": true}'::jsonb, 1),
  ('action', 'escalate', '{"triggers": ["high_risk", "phi_breach_risk", "privacy_concern"], "escalate_to": "privacy_officer"}'::jsonb, 1),
  ('risk', 'high', '{"requires_hipaa_review": true, "requires_privacy_officer": true, "requires_medical_expert": true}'::jsonb, 2),
  ('risk', 'medium', '{"requires_hipaa_review": true, "requires_documentation": true}'::jsonb, 2),
  ('review', 'hipaa_review', '{"required_roles": ["governance"], "requires_hipaa_certification": true}'::jsonb, 3),
  ('review', 'privacy_review', '{"required_roles": ["governance"], "requires_privacy_officer": true}'::jsonb, 3),
  ('review', 'medical_review', '{"required_roles": ["governance"], "requires_medical_expertise": true}'::jsonb, 3)
) AS rules(rule_type, rule_key, rule_value, priority)
ON CONFLICT DO NOTHING;

-- Data controls for Healthcare Data Processing profile
INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'healthcare-data-processing' LIMIT 1),
  control_type,
  control_config,
  is_required
FROM (VALUES
  ('phi', '{"hipaa_compliant": true, "encryption_required": true, "access_controls": "strict", "audit_trail": true, "retention_days": 2555}'::jsonb, true),
  ('pii', '{"encryption_required": true, "access_logging": true, "retention_days": 2555, "gdpr_compliant": true}'::jsonb, true),
  ('tokenization', '{"enabled": true, "method": "format_preserving", "preserve_format": true, "phi_safe": true}'::jsonb, true),
  ('encryption', '{"algorithm": "AES-256", "key_rotation_days": 90, "hipaa_compliant": true}'::jsonb, true),
  ('access_control', '{"role_based": true, "minimum_privilege": true, "audit_all_access": true}'::jsonb, true)
) AS controls(control_type, control_config, is_required)
ON CONFLICT DO NOTHING;

-- Compute and update version hash
UPDATE governance_profiles
SET version_hash = compute_profile_hash(id)
WHERE name = 'healthcare-data-processing';

-- Set activated timestamp
UPDATE governance_profiles
SET activated_at = CURRENT_TIMESTAMP,
    activated_by = NULL
WHERE name = 'healthcare-data-processing';

-- ============================================================================
-- Governance Profile 3: Legal Document Review
-- ============================================================================
INSERT INTO governance_profiles (
  id, name, domain, description, version, status,
  allowed_actions, risk_thresholds, human_review_requirement,
  assignment_rules, metadata, created_by
) VALUES (
  gen_random_uuid(),
  'legal-document-review',
  'legal',
  'Governance profile for legal document review. Requires attorney review for all legal document processing and analysis decisions.',
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
      "sla_hours": 72,
      "requires_attorney_review": false
    },
    "high": {
      "requires_review": true,
      "min_reviewers": 2,
      "sla_hours": 24,
      "requires_attorney_review": true,
      "requires_senior_attorney": false
    },
    "critical": {
      "requires_review": true,
      "min_reviewers": 2,
      "sla_hours": 12,
      "requires_attorney_review": true,
      "requires_senior_attorney": true
    }
  }'::jsonb,
  'conditional',
  '{
    "roles": ["governance", "reviewer"],
    "sla_hours": 72,
    "escalation_hours": 96,
    "requires_attorney_approval": true,
    "requires_legal_license": true
  }'::jsonb,
  '{
    "use_case": "Legal Document Review",
    "jurisdiction": "US",
    "compliance_standards": ["Attorney-Client Privilege", "State Bar Rules", "Legal Ethics"],
    "sensitive_data": true,
    "privileged_communications": true
  }'::jsonb,
  NULL
)
ON CONFLICT (name, version) DO NOTHING;

-- Rules for Legal Document Review profile
INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'legal-document-review' LIMIT 1),
  rule_type,
  rule_key,
  rule_value,
  priority
FROM (VALUES
  ('action', 'approve', '{"requires_justification": true, "min_confidence": 0.8, "requires_attorney_review_for_high_risk": true}'::jsonb, 1),
  ('action', 'reject', '{"requires_justification": true, "requires_documentation": true, "requires_attorney_review": true}'::jsonb, 1),
  ('action', 'escalate', '{"triggers": ["high_risk", "legal_complexity", "privilege_concern"], "escalate_to": "senior_attorney"}'::jsonb, 1),
  ('action', 'override', '{"requires_admin_approval": true, "requires_justification": true, "requires_attorney_approval": true}'::jsonb, 2),
  ('risk', 'critical', '{"requires_senior_attorney": true, "requires_legal_review": true, "requires_documentation": true}'::jsonb, 1),
  ('risk', 'high', '{"requires_attorney_review": true, "requires_legal_review": true, "requires_documentation": true}'::jsonb, 2),
  ('review', 'attorney_review', '{"required_roles": ["governance"], "requires_legal_license": true, "requires_bar_admission": true}'::jsonb, 3),
  ('review', 'senior_attorney_review', '{"required_roles": ["governance"], "requires_legal_license": true, "requires_senior_experience": true}'::jsonb, 3)
) AS rules(rule_type, rule_key, rule_value, priority)
ON CONFLICT DO NOTHING;

-- Data controls for Legal Document Review profile
INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
SELECT 
  (SELECT id FROM governance_profiles WHERE name = 'legal-document-review' LIMIT 1),
  control_type,
  control_config,
  is_required
FROM (VALUES
  ('pii', '{"encryption_required": true, "access_logging": true, "retention_days": 2555, "gdpr_compliant": true}'::jsonb, true),
  ('privileged_data', '{"encryption_required": true, "access_controls": "strict", "attorney_client_privilege": true, "audit_trail": true}'::jsonb, true),
  ('tokenization', '{"enabled": true, "method": "format_preserving", "preserve_format": true}'::jsonb, true),
  ('encryption', '{"algorithm": "AES-256", "key_rotation_days": 90}'::jsonb, true),
  ('access_control', '{"role_based": true, "minimum_privilege": true, "attorney_only_access": true}'::jsonb, true)
) AS controls(control_type, control_config, is_required)
ON CONFLICT DO NOTHING;

-- Compute and update version hash
UPDATE governance_profiles
SET version_hash = compute_profile_hash(id)
WHERE name = 'legal-document-review';

-- Set activated timestamp
UPDATE governance_profiles
SET activated_at = CURRENT_TIMESTAMP,
    activated_by = NULL
WHERE name = 'legal-document-review';

-- ============================================================================
-- Create audit log entries for all three profiles
-- ============================================================================
INSERT INTO governance_profile_audit (profile_id, action, performed_by, changes, justification)
SELECT 
  id,
  'created',
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user for seed data
  '{}'::jsonb,
  'Profile created via script'
FROM governance_profiles
WHERE name IN ('financial-compliance-review', 'healthcare-data-processing', 'legal-document-review')
ON CONFLICT DO NOTHING;

INSERT INTO governance_profile_audit (profile_id, action, performed_by, changes, justification)
SELECT 
  id,
  'activated',
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user for seed data
  jsonb_build_object('version_hash', version_hash),
  'Profile activated via script'
FROM governance_profiles
WHERE name IN ('financial-compliance-review', 'healthcare-data-processing', 'legal-document-review')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Verify the profiles were created
-- ============================================================================
SELECT 
    '✅ Governance profiles created successfully!' as status,
    name,
    domain,
    status,
    version,
    created_at,
    activated_at
FROM governance_profiles
WHERE name IN (
    'financial-compliance-review',
    'healthcare-data-processing',
    'legal-document-review'
)
ORDER BY name;

