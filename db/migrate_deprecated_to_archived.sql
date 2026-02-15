-- ============================================================================
-- Migration: Update deprecated status to archived
-- ============================================================================
-- This script updates all governance profiles with status 'deprecated' 
-- to 'archived' to match the new status naming convention
-- ============================================================================

-- Update all profiles with 'deprecated' status to 'archived'
UPDATE governance_profiles
SET status = 'archived',
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(status) = 'deprecated';

-- Also handle any case variations (Deprecated, DEPRECATED, etc.)
UPDATE governance_profiles
SET status = 'archived',
    updated_at = CURRENT_TIMESTAMP
WHERE status NOT IN ('draft', 'active', 'archived')
  AND LOWER(status) LIKE '%deprecat%';

-- Verify the update
SELECT 
    status,
    COUNT(*) as count
FROM governance_profiles
GROUP BY status
ORDER BY status;

-- Show any remaining invalid statuses (if any)
SELECT 
    id,
    name,
    status,
    version
FROM governance_profiles
WHERE status NOT IN ('draft', 'active', 'archived');







