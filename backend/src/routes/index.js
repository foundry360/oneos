const express = require('express');
const router = express.Router();

const authRouter = require('./auth');
const filesRouter = require('./files');
const tokenizationRouter = require('./tokenization');
const aiRouter = require('./ai');
const reviewRouter = require('./review');
const dashboardRouter = require('./dashboard');
const governanceProfilesRouter = require('./governanceProfiles');
const blockchainRouter = require('./blockchain');
const llmRouter = require('./llm');
const customersRouter = require('./customers');
const usersRouter = require('./users');
const decisionsRouter = require('./decisions');
const installationRouter = require('./installation');
const webhooksRouter = require('./webhooks');
const licenseKeysRouter = require('./licenseKeys');
const { checkLicenseActive } = require('../middleware/licenseCheck');

router.use('/auth', authRouter);
router.use('/files', filesRouter);
router.use('/tokenization', tokenizationRouter);
router.use('/ai', aiRouter);
router.use('/review', reviewRouter);
router.use('/dashboard', dashboardRouter);
router.use('/governance-profiles', governanceProfilesRouter);
router.use('/blockchain', blockchainRouter);
router.use('/llm', llmRouter);
router.use('/customers', customersRouter);
router.use('/users', usersRouter);
router.use('/decisions', decisionsRouter);
router.use('/installation', installationRouter);
router.use('/webhooks', webhooksRouter);
router.use('/license-keys', licenseKeysRouter);

// Apply license check to all API routes (after authentication)
// Note: This will be applied per-route since authenticate middleware is route-specific

module.exports = router;

