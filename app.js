//jshint esversion:6
require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const flash = require("connect-flash");
const passportLocalMongoose = require('passport-local-mongoose');
const FacebookAuthorizationError = require('passport-facebook/lib/errors/facebookauthorizationerror');
const Strategy = require('passport-facebook/lib');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
findOrCreate = require('mongoose-findorcreate')
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const app = express();
const port = 3000;



app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs')
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})
// express session flash
app.use(flash());
app.use(session({
    secret: 'keyboard of the DG',
    resave: false,
    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());
// connect mongoose database
mongoose.set('strictQuery', false);
mongoose.connect(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.imnaepp.mongodb.net/usersDB`, {
    useNewUrlParser: true,
  }).then(() => console.log("connent database"))

const userSchema = new mongoose.Schema({
    name :{
      type:String
    },
    email:{
        type: String,
    },
    password:{
        type: String,
    },
    secrets:Array
});





// user schema plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User',userSchema);
// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


// GOOGLE AUTHENTICATION 2.0
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/Secrets-Starting",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  // console.log(profile);
  User.findOrCreate({ username: profile.id,name:profile.displayName }, function (err, user) {
    console.log(profile)
    return cb(err, user);
  });
}
));

// LINKEDIN Strategy-------------------------
passport.use(new LinkedInStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "http://localhost:3000/auth/linkedin/Secrets-Starting",
  scope: ['r_emailaddress', 'r_liteprofile'],
  state: true
}, function(accessToken, refreshToken, profile, done) {
  // asynchronous verification, for effect...
  // console.log(profile);
  process.nextTick(function () {
    // To keep the example simple, the user's LinkedIn profile is returned to
    // represent the logged-in user. In a typical application, you would want
    // to associate the LinkedIn account with a user record in your database,
    // and return that user instead.
    User.findOrCreate({ username: profile.id }, function (err, user) {
      // return done(err, user);
    });
    return done(null, profile);
  });
}));


app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
    const message = req.flash("error");
    res.render('login',{message});
  });

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
  );
app.get('/auth/google/Secrets-Starting',
  passport.authenticate('google', { failureRedirect: '/register' }),
  function(req, res) {

    // Successful authentication, redirect home.
    res.redirect('/secrets');

  });

// linkedin routing call back register
app.get('/auth/linkedin',
  passport.authenticate('linkedin'),
  function(req, res){
    // The request will be redirected to LinkedIn for authentication, so this
    // function will not be called.
  });

  app.get('/auth/linkedin/Secrets-Starting', passport.authenticate('linkedin', {
    successRedirect: '/secrets',
    failureRedirect: '/register'
  }));



app.get('/register', (req, res) => {
    const message = req.flash("error");
    res.render('register',{message});
});

app.get('/logout',function(req,res){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
})

app.get('/secrets',function(req,res){
    if(req.isAuthenticated()){
      User.findOne({_id:req.user._id}, (err, foundUser) => {
        if(!err) {
            if(foundUser) {
              res.render('secrets',{secretMsg:foundUser.secrets});

            }else{
              try {
                throw new Error('BROKEN')
              } catch (error) {
                User.findOne({username:req.user._json.id}, (err, foundUser) => {
                  if(!err) {
                      if(foundUser) {
                        res.render('secrets',{secretMsg:foundUser.secrets});

                      }else{
                        try {
                          throw new Error('BROKEN')
                        } catch (error) {
                          console.log(err);
                        }
                      }
                    }});

              }
            }
          }});

    }else{
        res.redirect('/login');
    }
})

app.get('/submit',function(req,res){
  if(req.isAuthenticated()){
    res.render('submit');
}else{
    res.redirect('/login');
}
})

app.post('/submit',function(req,res){
  const secret = req.body.secret;

  User.findOne({_id:req.user._id}, (err, foundUser) => {
      if(!err) {
          if(foundUser) {
              foundUser.secrets.push(secret);
              foundUser.save(() => {
                  res.redirect("/secrets")
              });

          } else {
            console.log(err+'frhgbdrhg');
            User.findOne({username:req.user._json.id}, (err, foundUser) => {
              if(!err) {
                  if(foundUser) {
                      foundUser.secrets.push(secret);
                      foundUser.save(() => {
                          res.redirect("/secrets")
                      });

                  } else {
                    console.log(err);

                  }
                }
                });


          }
        }
    });

})

app.post("/register",function(req,res){
    console.log(req.body.username);
    console.log((req.body.password));
    const new_user = {
      name:req.body.name,
      username:req.body.username
    }

    User.register(new_user,req.body.password , function(err, user) {
        console.log(user);
        if(err){
            console.log(err);
            req.flash("error", "User name already exists");
            res.redirect('/login')
        }else{
            passport.authenticate('local')(req,res,function(){
                res.redirect('/secrets')
            })
        }

    });
});

app.post('/login',function(req,res){
    console.log(req.body.username);
    console.log(req.body.password);
    const user = new User({
        username:req.body.username,
        password:req.body.password
    })
    passport.authenticate("local", function(err, user, info) {
        console.log(user);
        if (user) {
          req.login(user, function(err) {
            if (!err) {
              res.redirect("/secrets");
            } else {
              req.flash("error", "Error login in");
              res.redirect("/login");
            }
          });
        } else {
          req.flash("error", "Username and/or Password is invalid");
          res.redirect("/login");
        }
      })(req, res);

})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
