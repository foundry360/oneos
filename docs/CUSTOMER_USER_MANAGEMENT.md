# Customer User Management

## Overview

This document describes the customer user management system that enables single-tenant customer implementations to track individual users within their systems.

## Problem Statement

Previously, the system only tracked customer accounts via API keys. When a customer's end-user submitted a prompt, the system could only identify the customer account, not the individual user. This was insufficient for single-tenant deployments where individual user tracking is required.

## Solution

The system now tracks individual users within each customer account:

1. **Customer Users Table**: Stores individual users from customer systems
2. **Required User ID**: SDK now requires `userId` parameter to identify the end-user
3. **Auto-Creation**: Customer users are automatically created on first use
4. **Assignment**: Review tasks can be assigned to customer users with appropriate roles
5. **Decision Tracking**: Decisions include submitter information (customer user email/ID)

## Database Schema

### `customer_users` Table

```sql
CREATE TABLE customer_users (
    id UUID PRIMARY KEY,
    customer_account_id UUID REFERENCES customer_accounts(id),
    customer_user_id VARCHAR(255) NOT NULL,  -- Customer's internal user ID
    customer_user_email VARCHAR(255),         -- Customer's internal user email
    display_name VARCHAR(255),
    role TEXT DEFAULT 'user',                -- For assignment purposes
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(customer_account_id, customer_user_id)
);
```

### Updated `llm_prompt_requests` Table

- `user_id` is now nullable (for customer users)
- `customer_user_id` added to reference `customer_users.id`
- Constraint ensures either `user_id` OR `customer_user_id` is set

## SDK Changes

### Before

```javascript
const response = await governLLM.complete({
  prompt: 'Hello',
  model: 'gpt-4'
});
```

### After

```javascript
const response = await governLLM.complete({
  prompt: 'Hello',
  userId: 'employee-123',        // REQUIRED: Customer's internal user ID
  userEmail: 'john@acme.com',    // Optional: User's email
  displayName: 'John Doe',        // Optional: Display name
  model: 'gpt-4'
});
```

## API Changes

### Authentication Middleware

The `customerApiKeyAuth` middleware now:
1. Validates API key (as before)
2. **Requires** `userId` in request body
3. Auto-creates customer user if it doesn't exist
4. Updates email/display name if provided
5. Attaches customer user (not customer account) to `req.user`

### Request Flow

1. Customer sends request with API key + `userId`
2. System validates API key → gets customer account
3. System looks up/creates customer user for that `userId`
4. System processes prompt with customer user context
5. Decisions show "Submitted by: john@acme.com (ACME Corp)"

## Assignment Logic

The `assignReviewer` function now checks both:
- **Internal platform users** (`profiles` table) - for platform admins/reviewers
- **Customer users** (`customer_users` table) - for customer-specific reviewers

Assignment prioritizes reviewers with:
1. Fewest pending tasks
2. Appropriate role (governance, reviewer, etc.)
3. Active status

## Decision Creation

When a prompt requires review, the system creates a decision with:
- **Title**: Includes submitter info: `LLM Prompt Review [john@acme.com (ACME Corp)]: ...`
- **Summary**: Includes submitter info: `Submitted by: john@acme.com (ACME Corp)\n\n[prompt text]`
- **Assigned To**: Auto-assigned reviewer (internal or customer user)

## Migration Steps

1. **Run customer_users migration**:
   ```bash
   psql $DATABASE_URL -f db/customer_users_migration.sql
   ```

2. **Update llm_prompt_requests table**:
   ```bash
   psql $DATABASE_URL -f db/update_llm_prompt_requests_for_customer_users.sql
   ```

3. **Restart backend server**:
   ```bash
   docker-compose restart backend
   ```

## Backward Compatibility

- **Internal users** (JWT auth) continue to work as before
- **Customer API key auth** now requires `userId` (breaking change for customers)
- Existing customer integrations need to update SDK calls to include `userId`

## Customer Integration Guide

Customers must update their SDK calls:

```javascript
// OLD (no longer works)
await governLLM.complete({ prompt: 'Hello' });

// NEW (required)
await governLLM.complete({ 
  prompt: 'Hello',
  userId: getCurrentUserId()  // Your internal user identifier
});
```

## Example: Customer User Lifecycle

1. **First Request**: Customer user `employee-123` submits prompt
   - System auto-creates `customer_users` record
   - Role defaults to `'user'`
   - Email/display name stored if provided

2. **Subsequent Requests**: Same `userId` used
   - System finds existing customer user
   - Updates email/display name if changed
   - Uses existing role

3. **Review Assignment**: If prompt requires review
   - System checks `customer_users` with role `'reviewer'` or `'governance'`
   - Assigns to customer user with fewest pending tasks
   - Decision shows submitter: `employee-123` or `john@acme.com`

## Role Management

Customer users have roles for assignment purposes:
- `'user'` - Default, can submit prompts
- `'reviewer'` - Can be assigned review tasks
- `'governance'` - Can be assigned review tasks (higher priority)
- `'admin'` - Can be assigned review tasks (highest priority)

Roles are managed per customer account. To update a customer user's role:

```sql
UPDATE customer_users 
SET role = 'reviewer' 
WHERE customer_account_id = '...' AND customer_user_id = 'employee-123';
```

## Troubleshooting

### Error: "userId required"
- **Cause**: Request missing `userId` in body
- **Fix**: Add `userId` parameter to SDK call

### Error: "User account inactive"
- **Cause**: Customer user exists but `is_active = false`
- **Fix**: Update `customer_users.is_active = true`

### Decisions not showing submitter info
- **Cause**: Old decisions created before this update
- **Fix**: New decisions will include submitter info automatically

