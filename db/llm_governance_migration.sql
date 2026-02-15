-- ============================================================================
-- LLM Governance Database Migration
-- ============================================================================
-- This migration creates tables for LLM prompt governance, including
-- prompt requests, responses, and governance evaluation results.
-- ============================================================================

-- Table to store LLM prompt requests
CREATE TABLE IF NOT EXISTS llm_prompt_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    prompt_hash VARCHAR(64) NOT NULL, -- Hash of prompt for deduplication/verification
    model_name VARCHAR(100) NOT NULL, -- e.g., 'gpt-4', 'claude-3', 'gemini-pro'
    provider VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'openai', 'anthropic', 'custom', etc.
    governance_profile_id UUID REFERENCES governance_profiles(id),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
    risk_score DECIMAL(3,2), -- 0.00 to 1.00
    requires_review BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, in_review, completed, failed
    pre_processing_metadata JSONB DEFAULT '{}', -- Tokenization, PII detection, etc.
    governance_evaluation JSONB DEFAULT '{}', -- Full governance evaluation result
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT
);

-- Table to store LLM responses
CREATE TABLE IF NOT EXISTS llm_prompt_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES llm_prompt_requests(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    response_hash VARCHAR(64) NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    model_name VARCHAR(100),
    finish_reason VARCHAR(50), -- stop, length, content_filter, etc.
    post_processing_metadata JSONB DEFAULT '{}', -- Filtering, redaction, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store LLM provider configurations
CREATE TABLE IF NOT EXISTS llm_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'customer-llm-1', 'openai-prod'
    provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'custom', 'azure-openai', 'vertex-ai'
    endpoint TEXT, -- API endpoint URL
    api_key_encrypted TEXT, -- Encrypted API key
    model_config JSONB DEFAULT '{}', -- Model-specific configurations
    network_config JSONB DEFAULT '{}', -- VPC, subnet, security group info
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for llm_prompt_requests
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_user_id ON llm_prompt_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_status ON llm_prompt_requests(status);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_risk_level ON llm_prompt_requests(risk_level);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_governance_profile_id ON llm_prompt_requests(governance_profile_id);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_created_at ON llm_prompt_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_prompt_hash ON llm_prompt_requests(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_requires_review ON llm_prompt_requests(requires_review) WHERE requires_review = true;

-- Indexes for llm_prompt_responses
CREATE INDEX IF NOT EXISTS idx_llm_prompt_responses_request_id ON llm_prompt_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_llm_prompt_responses_created_at ON llm_prompt_responses(created_at);

-- Indexes for llm_provider_configs
CREATE INDEX IF NOT EXISTS idx_llm_provider_configs_provider ON llm_provider_configs(provider);
CREATE INDEX IF NOT EXISTS idx_llm_provider_configs_is_active ON llm_provider_configs(is_active) WHERE is_active = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_llm_prompt_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_llm_prompt_requests_updated_at ON llm_prompt_requests;
CREATE TRIGGER update_llm_prompt_requests_updated_at
    BEFORE UPDATE ON llm_prompt_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_llm_prompt_requests_updated_at();

-- Comments for documentation
COMMENT ON TABLE llm_prompt_requests IS 'Stores LLM prompt requests with governance evaluation results';
COMMENT ON TABLE llm_prompt_responses IS 'Stores LLM responses linked to prompt requests';
COMMENT ON TABLE llm_provider_configs IS 'Stores LLM provider configurations for different deployments';

COMMENT ON COLUMN llm_prompt_requests.prompt_hash IS 'SHA-256 hash of the prompt for deduplication and verification';
COMMENT ON COLUMN llm_prompt_requests.risk_score IS 'Risk score from 0.00 (low) to 1.00 (high)';
COMMENT ON COLUMN llm_prompt_requests.pre_processing_metadata IS 'Metadata about pre-processing (PII redaction, tokenization, etc.)';
COMMENT ON COLUMN llm_prompt_requests.governance_evaluation IS 'Complete governance evaluation result including factors and decisions';

