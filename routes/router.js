const passport = require("../service/passport-facebook");
const express = require('express')
const isLogged = require('../middlewares/isLoggedIn')
const router = express.Router()
const db = require('../db/db')
const trackController = require('../controllers/track.controller')
const artistController = require('../controllers/artist.controller')
const albumController = require('../controllers/album.controller')
const userController = require('../controllers/user.controller')


router.get('/facebook', passport.authenticate('facebook', {scope:['email','user_friends']}));
router.get('/api/auth/facebook', passport.authenticate('facebook',
    {successRedirect:'/success',
        failureRedirect:'/failed'}));

router.get('/failed', (req,res) => {
    res.send('Authentification failed');
});

//po uspješnoj autentifikaciji šalje se session.id koji treba staviti u cookie
router.get('/success', (req,res) => {
    res.send(`session.id=${req.session.id}`);
})

router.get('/',(req,res)=>{
    res.render('index',{
        auth:req.isAuthenticated(),
        user:req.user
    })
})

router.get('/user/:fid', userController.getUser);

router.get('/artists', artistController.getArtists)

router.get('/artists/:id', isLogged, artistController.getArtist);

router.post('/artist/:id/like',isLogged, (req, res) => {
    let like = req.body.value;
    const id = req.params.id;
    if(like === 'true'){like = true}
    else if(like === 'false'){like = false}
    else{
        res.status(400).send('Value param can only be true or false')
    }
    const pUser = db.first('user','fid', req.user.fid);
    const pArtist = db.findById('artist',id);

    Promise.all([pUser, pArtist])
        .then(([user, artist]) => {

            if(like){
                user.relateTo(artist,'likes')
                    .then(()=>res.redirect('/artist/'+id) )
            } else {
                user.detachFrom(artist)
                    .then(()=>res.redirect('/artist/'+id))
            }
        })
})

router.get('/albums/:id', albumController.getAlbum);

router.get('/tracks/:id', trackController.getTrack);

router.get('/me',isLogged, userController.getMyUser);

router.get('/me/logout', userController.logout);





module.exports = router;