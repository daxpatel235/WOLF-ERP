const router = require('express').Router();
const ctrl = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Whether AI is configured (used by the client to show/hide AI affordances).
router.get('/status', ctrl.status);

// Level 1 — assistive
router.post('/rfq/draft', protect, ctrl.draftRfq);
router.post('/quotations/insight', protect, ctrl.comparisonInsight);
router.get('/reports/summary', protect, ctrl.reportSummary);

// Level 2 — analytical
router.post('/extract', protect, ctrl.extractDocument);
router.get('/vendors/:id/risk', protect, ctrl.vendorRisk);
router.get('/invoices/:id/audit', protect, ctrl.invoiceAudit);

// Level 3 — conversational / RAG
router.post('/chat', protect, ctrl.chat);
router.post('/chat/act', protect, ctrl.chatAct); // execute a confirmed agent action
router.post('/chat/reindex', protect, authorize('admin', 'manager'), ctrl.reindex);

module.exports = router;
