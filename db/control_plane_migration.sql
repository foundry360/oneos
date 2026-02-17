-- Control Plane Database Migration
-- Creates tables to support the AI Governance Control Plane decision management system

-- Decisions table - Main table for governance decisions
CREATE TABLE IF NOT EXISTS decisions (
    id VARCHAR(50) PRIMARY KEY,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('data-access', 'model-deployment', 'policy-exception', 'data-retention', 'user-permission')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'in-review')),
    assigned_to UUID, -- References Supabase auth.users(id) - validated in application layer
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    source_refs TEXT[] DEFAULT '{}',
    ai_recommendation JSONB NOT NULL DEFAULT '{}',
    risk_rationale TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for decisions table
CREATE INDEX IF NOT EXISTS idx_decisions_risk_level ON decisions(risk_level);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(type);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_assigned_to ON decisions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_updated_at ON decisions(updated_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_decisions_status_risk ON decisions(status, risk_level);
CREATE INDEX IF NOT EXISTS idx_decisions_assigned_status ON decisions(assigned_to, status);

-- Decision actions/history table - Tracks all actions taken on decisions
CREATE TABLE IF NOT EXISTS decision_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id VARCHAR(50) NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'escalate')),
    justification TEXT NOT NULL,
    performed_by UUID NOT NULL, -- References Supabase auth.users(id) - validated in application layer
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for decision_actions table
CREATE INDEX IF NOT EXISTS idx_decision_actions_decision_id ON decision_actions(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_actions_performed_by ON decision_actions(performed_by);
CREATE INDEX IF NOT EXISTS idx_decision_actions_performed_at ON decision_actions(performed_at);

-- Decision comments/notes table - For additional context and collaboration
CREATE TABLE IF NOT EXISTS decision_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id VARCHAR(50) NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by UUID NOT NULL, -- References Supabase auth.users(id) - validated in application layer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for decision_comments table
CREATE INDEX IF NOT EXISTS idx_decision_comments_decision_id ON decision_comments(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_comments_created_by ON decision_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_decision_comments_created_at ON decision_comments(created_at);

-- Trigger to update updated_at timestamp for decisions
DROP TRIGGER IF EXISTS update_decisions_updated_at ON decisions;
CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp for decision_comments
DROP TRIGGER IF EXISTS update_decision_comments_updated_at ON decision_comments;
CREATE TRIGGER update_decision_comments_updated_at BEFORE UPDATE ON decision_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate AI recommendation structure
CREATE OR REPLACE FUNCTION validate_ai_recommendation(recommendation JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        recommendation ? 'action' AND
        recommendation ? 'explanation' AND
        recommendation ? 'confidence' AND
        recommendation->>'action' IN ('approve', 'reject', 'escalate') AND
        (recommendation->>'confidence')::INTEGER BETWEEN 0 AND 100
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to validate AI recommendation structure (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_ai_recommendation' 
        AND conrelid = 'decisions'::regclass
    ) THEN
        ALTER TABLE decisions ADD CONSTRAINT check_ai_recommendation 
            CHECK (validate_ai_recommendation(ai_recommendation));
    END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE decisions IS 'Main table for AI governance decisions requiring human review';
COMMENT ON COLUMN decisions.id IS 'Unique decision identifier (e.g., DEC-2024-001)';
COMMENT ON COLUMN decisions.risk_level IS 'Risk assessment: high, medium, or low';
COMMENT ON COLUMN decisions.type IS 'Type of decision: data-access, model-deployment, policy-exception, data-retention, or user-permission';
COMMENT ON COLUMN decisions.status IS 'Current status: pending, approved, rejected, escalated, or in-review';
COMMENT ON COLUMN decisions.assigned_to IS 'User assigned to review this decision';
COMMENT ON COLUMN decisions.source_refs IS 'Array of source references (e.g., request IDs, dataset IDs)';
COMMENT ON COLUMN decisions.ai_recommendation IS 'JSONB object containing action, explanation, and confidence (0-100)';
COMMENT ON COLUMN decisions.risk_rationale IS 'Detailed explanation of the risk assessment';

COMMENT ON TABLE decision_actions IS 'Audit trail of all actions taken on decisions';
COMMENT ON TABLE decision_comments IS 'Comments and notes added to decisions for collaboration';

