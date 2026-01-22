const express = require('express');
const router = express.Router();

const filesRouter = require('./files');
const tokenizationRouter = require('./tokenization');
const aiRouter = require('./ai');
const reviewRouter = require('./review');
const dashboardRouter = require('./dashboard');
const governanceProfilesRouter = require('./governanceProfiles');

router.use('/files', filesRouter);
router.use('/tokenization', tokenizationRouter);
router.use('/ai', aiRouter);
router.use('/review', reviewRouter);
router.use('/dashboard', dashboardRouter);
router.use('/governance-profiles', governanceProfilesRouter);

module.exports = router;

