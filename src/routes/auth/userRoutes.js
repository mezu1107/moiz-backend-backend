const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const {
  getAllUsers, getUserById, updateUser, deleteUser
} = require('../../controllers/auth/userController');

router.use(auth, role('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;