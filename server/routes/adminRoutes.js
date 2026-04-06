const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { listUsers, inviteUser, deleteUser } = require('../controllers/adminController');

router.use(verifyToken);
router.use(requireAdmin);

router.get('/users', listUsers);
router.post('/invite', inviteUser);
router.delete('/users/:uid', deleteUser);

module.exports = router;
