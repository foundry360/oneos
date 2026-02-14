# Building a Custom Blockchain Visualization

## You Don't Need Explorer!

**Explorer is just a pre-built web UI.** If you're building your own custom visualization, you can query the blockchain directly through your backend API.

## How to Query Blockchain Data

### Option 1: Via Your Backend API (Recommended)

Your backend already has `fabricService.js` that connects to Fabric. You can:

1. **Add new API endpoints** to query blockchain data
2. **Use existing endpoints** that already write to blockchain
3. **Build a React/Next.js component** that calls your backend

### Example: Add Blockchain Query Endpoint

Add this to `backend/src/routes/governanceProfiles.js` or create a new route:

```javascript
// Get blockchain entries for a profile
router.get('/:id/blockchain', authenticate, async (req, res) => {
  try {
    const fabricService = require('../services/fabricService');
    
    if (!await fabricService.isAvailable()) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    // Query all ledger entries for this profile
    const entries = await fabricService.queryChaincode('GetAllEntries', [req.params.id]);
    
    res.json({
      profileId: req.params.id,
      entries: entries,
      count: entries.length
    });
  } catch (error) {
    logger.error('Failed to query blockchain', { error: error.message });
    res.status(500).json({ error: 'Failed to query blockchain' });
  }
});
```

### Option 2: Direct Fabric SDK Calls

You can call Fabric directly from your backend:

```javascript
const fabricService = require('../services/fabricService');

// Query chaincode
const result = await fabricService.queryChaincode('GetAllEntries', ['entity-id']);

// Get specific entry
const entry = await fabricService.queryChaincode('GetLedgerEntry', ['entity-id', 'entry-id']);
```

### Option 3: Frontend Component

Create a React component in your frontend:

```typescript
// components/BlockchainViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';

export default function BlockchainViewer({ profileId }: { profileId: string }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/governance-profiles/${profileId}/blockchain`)
      .then(res => res.json())
      .then(data => {
        setEntries(data.entries || []);
        setLoading(false);
      });
  }, [profileId]);

  if (loading) return <Box>Loading blockchain data...</Box>;

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Entry ID</Th>
          <Th>Action</Th>
          <Th>Timestamp</Th>
          <Th>Hash</Th>
        </Tr>
      </Thead>
      <Tbody>
        {entries.map((entry: any) => (
          <Tr key={entry.id}>
            <Td>{entry.id}</Td>
            <Td>{entry.action}</Td>
            <Td>{new Date(entry.timestamp).toLocaleString()}</Td>
            <Td>{entry.hash}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
```

## Available Chaincode Functions

Based on your `governance-ledger` chaincode, you can query:

1. **GetAllEntries(entityId)** - Get all entries for an entity
2. **GetLedgerEntry(entityId, entryId)** - Get a specific entry
3. **GetEntityHistory(entityId)** - Get full history for an entity

## What Data You Can Visualize

- **Transaction History** - All blockchain transactions for a profile
- **Timeline View** - Chronological view of all actions
- **Block Details** - Individual block information
- **Chaincode Invocations** - All chaincode calls
- **Audit Trail** - Complete immutable audit log

## Benefits of Custom Visualization

✅ **Full Control** - Design exactly what you need  
✅ **Integrated** - Works seamlessly with your existing UI  
✅ **Customizable** - Add filters, search, charts, etc.  
✅ **No Dependencies** - Don't need Explorer setup  
✅ **Better UX** - Match your app's design system  

## Example: Full Implementation

### Backend Route (`backend/src/routes/blockchain.js`)

```javascript
const express = require('express');
const router = express.Router();
const fabricService = require('../services/fabricService');
const { authenticate } = require('../middleware/auth');

// Get blockchain entries for entity
router.get('/entries/:entityId', authenticate, async (req, res) => {
  try {
    if (!await fabricService.isAvailable()) {
      return res.status(503).json({ error: 'Blockchain not available' });
    }

    const entries = await fabricService.queryChaincode('GetAllEntries', [req.params.entityId]);
    res.json({ entries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blockchain stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Query multiple entities, aggregate data, etc.
    res.json({ totalTransactions: 0, lastBlock: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Frontend Hook (`frontend/hooks/useBlockchain.ts`)

```typescript
import { useQuery } from '@tanstack/react-query';

export function useBlockchainEntries(entityId: string) {
  return useQuery({
    queryKey: ['blockchain', entityId],
    queryFn: async () => {
      const res = await fetch(`/api/blockchain/entries/${entityId}`);
      return res.json();
    }
  });
}
```

## Summary

**You don't need Explorer!** Build your own visualization using:
- Your existing backend API
- Fabric SDK (already integrated)
- Your frontend framework (React/Next.js)
- Custom charts/visualizations (Chart.js, D3.js, etc.)

This gives you complete control and a better integrated experience! 🎨



