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
const imageController = require('../controllers/image.controller');
const {getUserBasedReccomendation} = require('../controllers/recommend-userbased-strategies');

router.get('/api/facebook', passport.authenticate('facebook', {scope:['email','user_friends']}));
router.get('/api/auth/facebook', passport.authenticate('facebook',
    {successRedirect:'/app/recommended-by-profile',
        failureRedirect:'/api/failed'}));

router.get('/api/failed', (req,res) => {
    res.send('Authentification failed');
});
/*
router.get('/',(req,res)=>{
    res.render('index',{
        auth:req.isAuthenticated(),
        user:req.user
    })
})*/

router.get('/api/user/:fid', userController.getUser);

router.get('/api/artists', artistController.getArtists)

router.get('/api/artist/:id', isLogged, artistController.getArtist);

router.post('/api/:label(artist|album|track)/:id/like',isLogged, likeController.like);

router.get('/api/:label(artist|album|track)/:id/images',isLogged, imageController.getImages);

router.get('/api/album/:id', albumController.getAlbum);

router.get('/api/track/:id', trackController.getTrack);

router.get('/api/search', searchController.getSearch);

router.get('/api/advancedsearch', searchController.advancedSearch);

router.get('/api/me',isLogged, userController.getMyUser);

router.post('/api/me',isLogged, userController.postInfo);

router.get('/api/me/logout', userController.logout);

router.get('/api/recommend-similar-track', recommendStrategiesController.recommendSimilarTracks)

router.get('/api/recommend-likes', recommendStrategiesController.recommendArtistsBasedOnLikes)

router.get('/api/recommend-similar-user', getUserBasedReccomendation);





module.exports = router;