-- Verify Realtime is enabled for vendor_api_keys
-- Run this in your Supabase SQL Editor

-- Check if publication exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') 
        THEN '✅ Publication exists'
        ELSE '❌ Publication does not exist'
    END as publication_status;

-- Check if vendor_api_keys is in the publication
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'vendor_api_keys'
        )
        THEN '✅ vendor_api_keys is enabled for Realtime'
        ELSE '❌ vendor_api_keys is NOT enabled for Realtime'
    END as realtime_status;

-- Show all tables in the publication
SELECT 
    schemaname,
    tablename,
    'Enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

