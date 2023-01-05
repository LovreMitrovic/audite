const passport = require("../service/passport-facebook");
const express = require('express')
const isLogged = require('../middlewares/isLoggedIn')
const router = express.Router()
const db = require('../db/db')
const trackController = require('../controllers/track.controller')
const artistController = require('../controllers/artist.controller')
const albumController = require('../controllers/album.controller')
const userController = require('../controllers/user.controller')
const likeController = require('../controllers/like.controller')
const searchController = require('../controllers/search.controller')
const recommendStrategiesController = require("../controllers/recommend-strategies.controller");

router.get('/facebook', passport.authenticate('facebook', {scope:['email','user_friends']}));
router.get('/api/auth/facebook', passport.authenticate('facebook',
    {successRedirect:'/me',
        failureRedirect:'/failed'}));

router.get('/failed', (req,res) => {
    res.send('Authentification failed');
});

router.get('/',(req,res)=>{
    res.render('index',{
        auth:req.isAuthenticated(),
        user:req.user
    })
})

router.get('/user/:fid', userController.getUser);

router.get('/artists', artistController.getArtists)

router.get('/artist/:id', isLogged, artistController.getArtist);

router.post('/:label/:id/like',isLogged, likeController.like)

router.get('/album/:id', albumController.getAlbum);

router.get('/track/:id', trackController.getTrack);

router.get('/search', searchController.getSearch);

router.get('/me',isLogged, userController.getMyUser);

router.get('/me/logout', userController.logout);

router.get('/recommend_strategy1', recommendStrategiesController.recommendArtistsBasedOnLikes)

router.get('/recommend_strategy2', recommendStrategiesController.recommendArtistsBasedOnLocation)





module.exports = router;