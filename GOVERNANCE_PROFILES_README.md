# Governance Profiles Feature

A comprehensive Governance Profiles feature for the AI governance and decision oversight platform. This feature allows administrators to define, version, and manage governance profiles that control decision workflows, risk thresholds, human review requirements, and data handling rules.

## Overview

Governance Profiles define the rules and controls for different use cases in the AI governance platform. Each profile specifies:
- Allowed actions (Approve, Reject, Escalate, Override)
- Risk thresholds (Low, Medium, High)
- Human review requirements (Required / Conditional / Optional)
- Assignment rules (roles, SLA)
- Data handling rules (tokenization, PII/PHI)
- Audit requirements (ledger, justification, timestamp)

## Database Setup

### 1. Run Migrations

Run the database migrations in order:

```bash
# 1. Main governance profiles tables
psql -U aigov -d ai_governance -f db/governance_profiles_migration.sql

# 2. Ledger entries table (optional, for ledger simulator)
psql -U aigov -d ai_governance -f db/ledger_entries_migration.sql

# 3. Seed example profiles
psql -U aigov -d ai_governance -f db/seed_governance_profiles.sql
```

Or via Docker:

```bash
docker exec -i ai-gov-postgres psql -U aigov -d ai_governance < db/governance_profiles_migration.sql
docker exec -i ai-gov-postgres psql -U aigov -d ai_governance < db/ledger_entries_migration.sql
docker exec -i ai-gov-postgres psql -U aigov -d ai_governance < db/seed_governance_profiles.sql
```

### 2. Database Tables

The migration creates the following tables:

- **governance_profiles**: Main profile table with versioning
- **governance_profile_rules**: Detailed rules for each profile
- **governance_profile_data_controls**: Data handling and security controls
- **governance_profile_audit**: Audit trail of all changes
- **ledger_entries**: Ledger simulator entries (optional)

## API Endpoints

All endpoints require authentication via JWT token.

### List Profiles
```
GET /api/governance-profiles
Query params: domain, status, name, limit, offset
Access: Admin, Governance
```

### Get Profile by ID
```
GET /api/governance-profiles/:id
Access: Admin, Governance
```

### Get Active Profile by Name (for workflow engine)
```
GET /api/governance-profiles/name/:name
Access: Authenticated users
```

### Create Profile
```
POST /api/governance-profiles
Body: { name, domain, description, allowed_actions, risk_thresholds, ... }
Access: Admin only
```

### Update Profile (draft only)
```
PUT /api/governance-profiles/:id
Body: { description, allowed_actions, risk_thresholds, ... }
Access: Admin only
```

### Activate Profile
```
POST /api/governance-profiles/:id/activate
Body: { justification? }
Access: Admin only
```

### Deprecate Profile
```
POST /api/governance-profiles/:id/deprecate
Body: { justification? }
Access: Admin only
```

### Get Audit History
```
GET /api/governance-profiles/:id/audit
Access: Admin, Governance
```

### Validate Action (for workflow engine)
```
POST /api/governance-profiles/validate-action
Body: { profile_name, action }
Access: Authenticated users
```

### Get Eligible Reviewers (for workflow engine)
```
GET /api/governance-profiles/:name/eligible-reviewers
Access: Authenticated users
```

## Workflow Engine Integration

The workflow engine can use the following hooks from `backend/src/services/workflowEngineHooks.js`:

```javascript
const workflowHooks = require('./services/workflowEngineHooks');

// Resolve profile for a decision
const profile = await workflowHooks.resolveProfileForDecision('workers-comp-ime-review');

// Validate an action
const isValid = await workflowHooks.validateActionForProfile('workers-comp-ime-review', 'approve');

// Get eligible reviewers
const reviewers = await workflowHooks.getEligibleReviewersForProfile('workers-comp-ime-review');

// Get SLA requirements
const sla = await workflowHooks.getSLARequirements('workers-comp-ime-review');

// Check if human review is required
const requiresReview = await workflowHooks.isHumanReviewRequired('workers-comp-ime-review', 'high');

// Get profile metadata for ledger
const metadata = await workflowHooks.getProfileMetadataForLedger('workers-comp-ime-review');
```

## Frontend Usage

### Access the Admin UI

Navigate to `/governance-profiles` in the frontend application.

### Features

1. **List Profiles**: View all profiles with filtering by domain, status, and search
2. **View Profile**: Read-only view of active profiles, full details for draft profiles
3. **Create Profile**: Create new draft profiles (Admin only)
4. **Edit Profile**: Edit draft profiles only (Admin only)
5. **Activate Profile**: Activate a draft profile (Admin only)
6. **Deprecate Profile**: Deprecate an active profile (Admin only)
7. **Audit History**: View complete audit trail for any profile

### Profile Lifecycle

1. **Draft**: Profile is being created/edited. Can be modified freely.
2. **Active**: Profile is in use by the workflow engine. Immutable. Only one active version per profile name.
3. **Deprecated**: Profile has been replaced by a newer version. Read-only.

## Example Profiles

The seed data includes three example profiles:

1. **Workers' Comp - IME Review** (`workers-comp-ime-review`)
   - Domain: `workers-comp`
   - Requires medical expert review for high-risk decisions
   - HIPAA and state medical board compliance

2. **Employment - Harassment Claim** (`employment-harassment-claim`)
   - Domain: `employment`
   - Requires HR and legal review for high-risk cases
   - EEOC and state employment law compliance

3. **AI Model Deployment** (`ai-model-deployment`)
   - Domain: `ai-model-deployment`
   - Requires technical and compliance review
   - GDPR, CCPA, and AI ethics guidelines compliance

## Security & RBAC

- **Admin**: Full access to create, edit, activate, and deprecate profiles
- **Governance**: Read-only access to view profiles and audit history
- **Reviewer/User**: Can view active profiles via workflow engine hooks only

All changes are logged to `governance_profile_audit` table with:
- Action performed
- User who performed it
- Timestamp
- Justification (if provided)
- Ledger hash (for active profile changes)

## Ledger Integration

When a profile is activated or deprecated, a ledger entry is created with:
- Profile ID
- Action (activated/deprecated)
- Version hash (SHA-256 hash of profile content)
- Entry hash (SHA-256 hash of the ledger entry)
- Timestamp
- Metadata

The ledger simulator stores entries in the `ledger_entries` table. In production, this would integrate with a distributed ledger or blockchain.

## Versioning

- Each profile has a version number that increments with each activation
- Only one active version per profile name at a time
- Activating a new version automatically deprecates the previous active version
- All versions are retained for audit purposes

## Development Notes

- The system uses raw SQL with `pg` library (not an ORM)
- JWT authentication via Supabase
- RBAC enforced at the API layer
- All profile changes are immutable once activated
- Hash computation uses SHA-256 via pgcrypto extension (with MD5 fallback)

## Troubleshooting

### Profile not found
- Ensure the profile name matches exactly (case-sensitive)
- Check that the profile status is 'active' for workflow engine lookups

### Cannot edit profile
- Only draft profiles can be edited
- Check user has 'admin' role

### Activation fails
- Ensure profile is in 'draft' status
- Check that all required fields are present
- Verify user has 'admin' role

### Hash computation fails
- Ensure pgcrypto extension is available, or the system will fall back to MD5
- Check database permissions

## Next Steps

1. Run the migrations
2. Seed the example profiles
3. Access the admin UI at `/governance-profiles`
4. Integrate workflow engine hooks into decision processing
5. Customize profiles for your specific use cases

