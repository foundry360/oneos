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

module.exports = router;

