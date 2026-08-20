const { signUser, addUser, getUsers, forgotAndResetPassword, 
    updateAfterResetPassword } = require('../controller/userController');
const User = require('../schema/userSchema');
const router = require('express').Router();
const authenticator = require('../middleware/authenticator')

router.post('/createuser',authenticator, addUser);
router.post('/signuser', signUser);
//route to send reset for password
router.post('/forgot-password',forgotAndResetPassword );


//route to reset password after forgetting
router.post('/reset-password',updateAfterResetPassword );
module.exports=router;