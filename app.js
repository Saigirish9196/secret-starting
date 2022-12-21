//jshint esversion:6
require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser'); 
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');
const app = express();
const port = 3000;
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs')

// connect mongoose database
mongoose.set('strictQuery', false);
mongoose.connect("mongodb://localhost:27017/usersDB", {
    useNewUrlParser: true,
  });

const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required:true
    },
    password:{
        type: String,
        required:true
    }
});

const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret ,encryptedFields: ['password']});

const User = new mongoose.model('User',userSchema);


app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
  });

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/logout',function(req,res){
    res.redirect("/");
})


app.post("/register",function(req,res){
    console.log(req.body.username);
    console.log(req.body.password);
    const newUser = new User({
        email:req.body.username,
        password:req.body.password
    })

    newUser.save(function(err){
        if(!err){
            res.render('secrets')
        }
    })
})
  
app.post('/login',function(req,res){
    console.log(req.body.username);
    console.log(req.body.password);
    User.findOne({email:req.body.username},function(err,foundUser){
        if(foundUser){
            if(req.body.password===foundUser.password){
                res.render('secrets');
            }else{
                res.send("Password will be Wrong");
            }
        }else{
            res.send("No user Found");
        }
    })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})