/*
 * Governance Ledger Chaincode
 * Stores immutable ledger entries for governance profile exports and other events
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class GovernanceLedger extends Contract {
    /**
     * Initialize the chaincode
     */
    async InitLedger(ctx) {
        console.info('Governance Ledger Chaincode initialized');
    }

    /**
     * Store a ledger entry
     * @param {string} entityId - Entity ID (profile ID, review task ID, etc.)
     * @param {string} action - Action type (PROFILE_EXPORTED, REVIEW_APPROVED, etc.)
     * @param {string} hashValue - Hash value (version hash, artifact hash, etc.)
     * @param {string} metadataJson - JSON string of additional metadata
     */
    async StoreLedgerEntry(ctx, entityId, action, hashValue, metadataJson) {
        const timestamp = new Date().toISOString();
        
        // Create composite key: entityId + action + timestamp
        const key = ctx.stub.createCompositeKey('ledger', [entityId, action, timestamp]);
        
        const entry = {
            entityId,
            action,
            hashValue,
            timestamp,
            metadata: JSON.parse(metadataJson || '{}')
        };
        
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(entry)));
        
        // Emit event
        ctx.stub.setEvent('LedgerEntryStored', Buffer.from(JSON.stringify({
            entityId,
            action,
            hashValue,
            timestamp
        })));
        
        return JSON.stringify({
            success: true,
            key: key,
            timestamp
        });
    }

    /**
     * Query a ledger entry
     * @param {string} entityId - Entity ID
     * @param {string} action - Action type (optional, empty string for all)
     */
    async QueryLedgerEntry(ctx, entityId, action) {
        const results = [];
        const iterator = await ctx.stub.getStateByPartialCompositeKey('ledger', [entityId, action || '']);
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                record = strValue;
            }
            results.push(record);
            result = await iterator.next();
        }
        await iterator.close();
        
        return JSON.stringify(results);
    }

    /**
     * Get all entries for an entity
     * @param {string} entityId - Entity ID
     */
    async GetAllEntries(ctx, entityId) {
        return await this.QueryLedgerEntry(ctx, entityId, '');
    }
}

module.exports = GovernanceLedger;
module.exports.contracts = [GovernanceLedger];

