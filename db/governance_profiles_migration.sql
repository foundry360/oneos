-- Governance Profiles Database Migration
-- Creates tables to support the Governance Profiles feature for AI governance and decision oversight

-- Enable pgcrypto extension for hash functions (if available)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION
    WHEN OTHERS THEN
        -- Extension may not be available in all environments
        -- Fallback to using encode/digest if available
        NULL;
END $$;

-- Main governance profiles table
CREATE TABLE IF NOT EXISTS governance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL, -- e.g., 'workers-comp', 'employment', 'ai-model-deployment'
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
    allowed_actions TEXT[] NOT NULL DEFAULT '{}', -- ['approve', 'reject', 'escalate', 'override']
    risk_thresholds JSONB NOT NULL DEFAULT '{}', -- {low: {...}, medium: {...}, high: {...}}
    human_review_requirement VARCHAR(20) NOT NULL DEFAULT 'conditional' CHECK (human_review_requirement IN ('required', 'conditional', 'optional')),
    assignment_rules JSONB NOT NULL DEFAULT '{}', -- {roles: [...], sla_hours: 24}
    metadata JSONB DEFAULT '{}',
    created_by UUID, -- References Supabase auth.users(id) - validated in application layer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP,
    activated_by UUID,
    deprecated_at TIMESTAMP,
    deprecated_by UUID,
    version_hash VARCHAR(64), -- SHA-256 hash of profile content for ledger
    UNIQUE(name, version) -- One version per profile name
);

-- Governance profile rules table
CREATE TABLE IF NOT EXISTS governance_profile_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES governance_profiles(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- e.g., 'action', 'risk', 'review', 'assignment'
    rule_key VARCHAR(100) NOT NULL,
    rule_value JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Governance profile data controls table
CREATE TABLE IF NOT EXISTS governance_profile_data_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES governance_profiles(id) ON DELETE CASCADE,
    control_type VARCHAR(50) NOT NULL, -- e.g., 'tokenization', 'pii', 'phi', 'encryption'
    control_config JSONB NOT NULL DEFAULT '{}',
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Governance profile audit table
CREATE TABLE IF NOT EXISTS governance_profile_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES governance_profiles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'activated', 'deprecated', 'deleted'
    performed_by UUID NOT NULL, -- References Supabase auth.users(id)
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changes JSONB DEFAULT '{}', -- Before/after state for updates
    justification TEXT,
    ledger_hash VARCHAR(64), -- Hash stored in ledger simulator
    ledger_timestamp TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for governance_profiles
CREATE INDEX IF NOT EXISTS idx_governance_profiles_name ON governance_profiles(name);
CREATE INDEX IF NOT EXISTS idx_governance_profiles_domain ON governance_profiles(domain);
CREATE INDEX IF NOT EXISTS idx_governance_profiles_status ON governance_profiles(status);
CREATE INDEX IF NOT EXISTS idx_governance_profiles_name_status ON governance_profiles(name, status);
CREATE INDEX IF NOT EXISTS idx_governance_profiles_created_at ON governance_profiles(created_at);

-- Indexes for governance_profile_rules
CREATE INDEX IF NOT EXISTS idx_governance_profile_rules_profile_id ON governance_profile_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_governance_profile_rules_type ON governance_profile_rules(rule_type);

-- Indexes for governance_profile_data_controls
CREATE INDEX IF NOT EXISTS idx_governance_profile_data_controls_profile_id ON governance_profile_data_controls(profile_id);
CREATE INDEX IF NOT EXISTS idx_governance_profile_data_controls_type ON governance_profile_data_controls(control_type);

-- Indexes for governance_profile_audit
CREATE INDEX IF NOT EXISTS idx_governance_profile_audit_profile_id ON governance_profile_audit(profile_id);
CREATE INDEX IF NOT EXISTS idx_governance_profile_audit_performed_by ON governance_profile_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_governance_profile_audit_performed_at ON governance_profile_audit(performed_at);
CREATE INDEX IF NOT EXISTS idx_governance_profile_audit_action ON governance_profile_audit(action);

-- Function to compute version hash for a profile
CREATE OR REPLACE FUNCTION compute_profile_hash(profile_id UUID)
RETURNS TEXT AS $$
DECLARE
    profile_data JSONB;
    rules_data JSONB;
    controls_data JSONB;
    combined_data TEXT;
    p_id UUID := profile_id;  -- Local variable to avoid ambiguity
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
        WHERE profile_id = p_id
    ) r;
    
    -- Get controls data
    SELECT COALESCE(json_agg(row_to_json(c)::jsonb ORDER BY control_type), '[]'::json) INTO controls_data
    FROM (
        SELECT control_type, control_config, is_required
        FROM governance_profile_data_controls
        WHERE profile_id = p_id
    ) c;
    
    -- Combine all data
    combined_data := (profile_data || jsonb_build_object('rules', rules_data) || jsonb_build_object('data_controls', controls_data))::text;
    
    -- Return SHA-256 hash (using pgcrypto extension if available, otherwise use built-in)
    BEGIN
        RETURN encode(digest(combined_data, 'sha256'), 'hex');
    EXCEPTION
        WHEN OTHERS THEN
            -- Fallback: use md5 if pgcrypto not available (less secure but functional)
            RETURN md5(combined_data);
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp for governance_profiles
CREATE TRIGGER update_governance_profiles_updated_at BEFORE UPDATE ON governance_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp for governance_profile_rules
CREATE TRIGGER update_governance_profile_rules_updated_at BEFORE UPDATE ON governance_profile_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp for governance_profile_data_controls
CREATE TRIGGER update_governance_profile_data_controls_updated_at BEFORE UPDATE ON governance_profile_data_controls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one active version per profile name
CREATE OR REPLACE FUNCTION ensure_single_active_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- If activating a profile, deprecate other active versions with the same name
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        UPDATE governance_profiles
        SET status = 'deprecated',
            deprecated_at = CURRENT_TIMESTAMP,
            deprecated_by = NEW.activated_by
        WHERE name = NEW.name
          AND id != NEW.id
          AND status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single active profile per name
CREATE TRIGGER enforce_single_active_profile
    BEFORE UPDATE ON governance_profiles
    FOR EACH ROW
    WHEN (NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active'))
    EXECUTE FUNCTION ensure_single_active_profile();

-- Comments for documentation
COMMENT ON TABLE governance_profiles IS 'Main table for governance profiles defining decision rules and controls';
COMMENT ON COLUMN governance_profiles.name IS 'Unique profile name (e.g., workers-comp-ime-review)';
COMMENT ON COLUMN governance_profiles.domain IS 'Domain/category of the profile (e.g., workers-comp, employment, ai-model-deployment)';
COMMENT ON COLUMN governance_profiles.version IS 'Version number for this profile (increments on each activation)';
COMMENT ON COLUMN governance_profiles.status IS 'Profile status: draft (editable), active (immutable, in use), deprecated (replaced)';
COMMENT ON COLUMN governance_profiles.allowed_actions IS 'Array of allowed actions: approve, reject, escalate, override';
COMMENT ON COLUMN governance_profiles.risk_thresholds IS 'JSONB object defining risk level configurations';
COMMENT ON COLUMN governance_profiles.human_review_requirement IS 'Human review requirement level';
COMMENT ON COLUMN governance_profiles.assignment_rules IS 'JSONB object with role assignments and SLA requirements';
COMMENT ON COLUMN governance_profiles.version_hash IS 'SHA-256 hash of profile content for ledger verification';

COMMENT ON TABLE governance_profile_rules IS 'Detailed rules for governance profiles';
COMMENT ON TABLE governance_profile_data_controls IS 'Data handling and security controls for profiles';
COMMENT ON TABLE governance_profile_audit IS 'Audit trail of all changes to governance profiles';

