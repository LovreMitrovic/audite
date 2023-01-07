const passport = require('passport');
const facebookStrategy = require('passport-facebook').Strategy;
const db = require('../db/db');
const { populateWithFacebookLikes, connectWithFriends } = require('./populate');
const { ApiFacebook } = require('./api-facebook');
require('dotenv').config();

passport.serializeUser( function(user,done){
    done(null,user.fid);
})

passport.deserializeUser(function(fid, done){
    db.first('user','fid',fid)
        .then((u) => done(null, u.properties()))
        .catch((e) => console.log('Deserialise error'))
})

passport.use(new facebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL:process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ['id', 'name', 'email', 'displayName', 'gender', 'picture.type(large)'],
        auth_type: "reauthenticate"
    },
    function(token, refreshToken, profile, done){
        const user = {fid:profile.id,
            email:profile._json.email,
            last_name: profile.name.familyName,
            first_name:profile.name.givenName,
            middle_name:profile.name.middleName ? profile.name.middleName : null,
            token:token,
            photo:profile.photos.length>0 ? profile.photos[0].value :null
        }
        //console.log(user)
        db.first('user','fid',user.fid)
            .then((u) => {
                u.update(user)
                    .then((u)=>{
                        done(null, u.properties());
                    })
            })
            .catch(()=> {
                db.create('user',user)
                    .then((u) => {
                         connectWithFriends(user)
                            .then(()=>console.log('[FRIENDS CONNECTED]'))
                             .catch(()=>console.log('[ERROR CONNECTING FRIENDS]'))
                        populateWithFacebookLikes(user)
                         .then(()=>console.log('[POPULATED DB WITH USER LIKES]'))
                            .catch(()=>console.log('[ERROR POPULATING DB WITH USER LIKES]'))
                        done(null, u.properties());
                    })
            })
            .catch((e) => console.log('[PASSPORT FACEBOOK:]'+e.message))
    }));

module.exports = passport