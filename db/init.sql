-- AI Governance Platform Database Schema

-- Raw data table for uploaded files
CREATE TABLE IF NOT EXISTS raw_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    upload_status VARCHAR(50) DEFAULT 'pending',
    uploaded_by UUID,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokenized data table
CREATE TABLE IF NOT EXISTS tokenized_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_data_id UUID REFERENCES raw_data(id) ON DELETE CASCADE,
    tokenized_content TEXT NOT NULL,
    token_count INTEGER,
    tokenization_method VARCHAR(50),
    encryption_key_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI inference results
CREATE TABLE IF NOT EXISTS ai_inference (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tokenized_data_id UUID REFERENCES tokenized_data(id) ON DELETE CASCADE,
    model_name VARCHAR(100),
    inference_type VARCHAR(50),
    input_tokens INTEGER,
    output_tokens INTEGER,
    result JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Human review tasks
CREATE TABLE IF NOT EXISTS review_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inference_id UUID REFERENCES ai_inference(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID,
    status VARCHAR(50) DEFAULT 'pending',
    review_notes TEXT,
    approved_at TIMESTAMP,
    approved_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metadata table for workflow tracking
CREATE TABLE IF NOT EXISTS workflow_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    step VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_data_uploaded_at ON raw_data(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_raw_data_status ON raw_data(upload_status);
CREATE INDEX IF NOT EXISTS idx_tokenized_data_raw_id ON tokenized_data(raw_data_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_tokenized_id ON ai_inference(tokenized_data_id);
CREATE INDEX IF NOT EXISTS idx_ai_inference_status ON ai_inference(status);
CREATE INDEX IF NOT EXISTS idx_review_tasks_status ON review_tasks(status);
CREATE INDEX IF NOT EXISTS idx_review_tasks_assigned_to ON review_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_metadata_status ON workflow_metadata(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_raw_data_updated_at BEFORE UPDATE ON raw_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tokenized_data_updated_at BEFORE UPDATE ON tokenized_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_inference_updated_at BEFORE UPDATE ON ai_inference
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_tasks_updated_at BEFORE UPDATE ON review_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_metadata_updated_at BEFORE UPDATE ON workflow_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();








