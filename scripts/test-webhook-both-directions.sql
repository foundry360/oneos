-- Test webhook updates in both directions
-- This simulates what the webhook should do

-- First, check current status
SELECT 
  'BEFORE UPDATE' as test_phase,
  ca.id as customer_id,
  ca.customer_code,
  ca.status as customer_status,
  cak.id as api_key_id,
  cak.is_active,
  cak.api_key_hash
FROM customer_accounts ca
JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
WHERE cak.api_key_hash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498';

-- Test 1: Set to inactive (simulating webhook)
UPDATE customer_accounts 
SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
WHERE id = (
  SELECT ca.id 
  FROM customer_accounts ca
  JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
  WHERE cak.api_key_hash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498'
);

UPDATE customer_api_keys 
SET is_active = false
WHERE customer_account_id = (
  SELECT ca.id 
  FROM customer_accounts ca
  JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
  WHERE cak.api_key_hash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498'
);

-- Check after inactive update
SELECT 
  'AFTER INACTIVE UPDATE' as test_phase,
  ca.id as customer_id,
  ca.customer_code,
  ca.status as customer_status,
  cak.id as api_key_id,
  cak.is_active
FROM customer_accounts ca
JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
WHERE cak.api_key_hash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498';

-- Test 2: Set to active (simulating webhook)
UPDATE customer_accounts 
SET status = 'active', updated_at = CURRENT_TIMESTAMP
WHERE id = (
  SELECT ca.id 
  FROM customer_accounts ca
  JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
  WHERE cak.api_key_hash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498'
);

UPDATE customer_api_keys 
SET is_active = true
WHERE customer_account_id = (
  SELECT ca.id 
  FROM customer_accounts ca
  JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
  WHERE cak.api_key_hash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498'
);

-- Check after active update
SELECT 
  'AFTER ACTIVE UPDATE' as test_phase,
  ca.id as customer_id,
  ca.customer_code,
  ca.status as customer_status,
  cak.id as api_key_id,
  cak.is_active
FROM customer_accounts ca
JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
WHERE cak.api_key_hash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498';

