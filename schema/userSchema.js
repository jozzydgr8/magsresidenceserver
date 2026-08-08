const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');
const bcrypt = require('bcrypt')

const UserSchema = new Schema({
    email:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true
    },
    admin:{
        type:Boolean,
        default:false,
    }
})
UserSchema.statics.createUser = async function({email, password}){
    if(!email || !password){
        throw Error('Fields required')
    }
    if(!validator.isEmail(email)){
        throw Error('invalid email')
    }if(!validator.isStrongPassword(password)){
        throw Error('password not strong enough')
    }
    try{
        const exist = await this.findOne({email:email});
        if(exist){
            throw Error('email already in use')
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const user = await this.create({email, password:hash});
        return user; 

    }catch(error){
        throw Error(error)
    }
}

UserSchema.statics.signUser = async function ({email, password}){
     if(!email || !password){
        throw Error('Fields required')
    }
    if(!validator.isEmail(email)){
        throw Error('invalid email')
    }if(!validator.isStrongPassword(password)){
        throw Error('password not strong enough')
    }
    try{
        const user = await this.findOne({email:email})
        if(!user){
            throw Error('Account does not exist')
        }
        const compare = await bcrypt.compare(password, user.password);
        if(!compare){
            throw Error('incorrect email or password');
        }
        return user;


    }catch(error){
        throw Error(error)
    }

}
module.exports=mongoose.model('user', UserSchema);