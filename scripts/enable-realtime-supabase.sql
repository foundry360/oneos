-- Enable Realtime for vendor_api_keys table in Supabase
-- Run this in your Supabase SQL Editor

-- Method 1: Check if supabase_realtime publication exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') 
        THEN 'Publication exists'
        ELSE 'Publication does not exist'
    END as publication_status;

-- Method 2: If publication exists, add the table (only if not already added)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Check if table is already in the publication
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'vendor_api_keys'
        ) THEN
            -- Add table to existing publication
            ALTER PUBLICATION supabase_realtime ADD TABLE vendor_api_keys;
            RAISE NOTICE 'Added vendor_api_keys to supabase_realtime publication';
        ELSE
            RAISE NOTICE 'vendor_api_keys is already in supabase_realtime publication - Realtime is enabled!';
        END IF;
    ELSE
        -- Create publication if it doesn't exist
        CREATE PUBLICATION supabase_realtime FOR TABLE vendor_api_keys;
        RAISE NOTICE 'Created supabase_realtime publication and added vendor_api_keys';
    END IF;
END $$;

-- Method 3: Verify the table is in the publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename = 'vendor_api_keys';

-- Expected result: Should show vendor_api_keys if successful

