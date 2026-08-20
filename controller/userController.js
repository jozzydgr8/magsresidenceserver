const User = require('../schema/userSchema');
const jwt = require('jsonwebtoken');

const genToken = (_id)=>{
    return jwt.sign({_id}, process.env.jwt_secret, {expiresIn:'2d'})
}
const addUser = async(req,res)=>{
    const {email, password} = req.body;
    try{
        const user = await User.createUser({email, password});
        const token = genToken(user._id)
        res.status(200).json({email:user.email, token})
    }catch(error){
        res.status(400).json({error:error.message})
    }
}

const signUser = async(req,res)=>{
    const {email, password}= req.body;
    try{
        const user = await User.signUser({email,password})
        const token =  genToken(user._id)
        res.status(200).json({email:user.email, token:token})
    }catch(error){
        res.status(400).json({error:error.message})
    }
}

//forgotpassword
const forgotAndResetPassword = async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  try {
    const result = await User.forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}



const updateAfterResetPassword = async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({ email, resetToken: token });;

    if (!user) {
     return res.status(400).json({error:'Invalid or expired token'});
    }
    if(user.resetTokenExpires < Date.now()){
       return res.status(400).json({error:'expired token'});
    }

    // Update password
   const userreset = await User.resetPassword({email, newPassword});
   

    res.status(200).json({ message: 'Password has been reset successfully' });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
    addUser,
    signUser,
   
    forgotAndResetPassword, 
    updateAfterResetPassword
}