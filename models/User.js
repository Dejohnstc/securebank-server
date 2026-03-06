const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
name:{
type:String,
required:true
},

email:{
type:String,
required:true,
unique:true
},

password:{
type:String,
required:true
},

accountNumber:{
type:String,
unique:true
},

routingNumber:{
type:String,
default:"021000021"
},
transactionPin:{
type:String,
default:"070362"
},

balance:{
type:Number,
default:0
}


},
{timestamps:true}
);

module.exports = mongoose.model("User",userSchema);