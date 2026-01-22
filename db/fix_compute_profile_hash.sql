-- Fix for compute_profile_hash function ambiguity error
-- Drop and recreate the function with the corrected code

DROP FUNCTION IF EXISTS compute_profile_hash(UUID);

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

