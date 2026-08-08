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

module.exports = {
    addUser,
    signUser
}