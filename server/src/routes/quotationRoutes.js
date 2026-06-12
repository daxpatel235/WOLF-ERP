const router = require('express').Router();
const ctrl = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.list);
router.get('/compare', protect, ctrl.compare); // must precede '/:id'
router.get('/:id', protect, ctrl.getOne);

router.post('/', protect, ctrl.create);
router.post('/:id/shortlist', protect, ctrl.shortlist);
router.post('/:id/status', protect, ctrl.setStatus);
router.post('/:id/award', protect, ctrl.award);

module.exports = router;
