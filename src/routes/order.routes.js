const { Router } = require('express');
const ctrl = require('../controllers/order.controller');
const validate = require('../utils/validate');
const v = require('../validators/order.validator');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', validate(v.list), ctrl.list);
router.post('/', validate(v.create), ctrl.create);
router.get('/:id', validate(v.byId), ctrl.getById);
router.put('/:id', validate(v.update), ctrl.update);
router.patch('/:id', validate(v.update), ctrl.update);
router.delete('/:id', authorize('admin'), validate(v.byId), ctrl.remove);

// Керування звʼязком M:N «замовлення ↔ працівники»
router.post('/:id/assignments', validate(v.addAssignment), ctrl.addAssignment);
router.delete('/:id/assignments/:assignmentId', validate(v.removeAssignment), ctrl.removeAssignment);

module.exports = router;
