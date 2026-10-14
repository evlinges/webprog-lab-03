const { Router } = require('express');
const ctrl = require('../controllers/orderItem.controller');
const validate = require('../utils/validate');
const v = require('../validators/orderItem.validator');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', validate(v.list), ctrl.list);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate(v.byId), ctrl.getById);
router.put('/:id', validate(v.update), ctrl.update);
router.patch('/:id', validate(v.update), ctrl.update);
router.delete('/:id', authorize('admin'), validate(v.byId), ctrl.remove);

module.exports = router;
