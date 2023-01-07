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

router.post('/:label(artist|album|track)/:id/like',isLogged, likeController.like);

router.get('/:label(artist|album|track)/:id/images',isLogged, imageController.getImages);

router.get('/album/:id', albumController.getAlbum);

router.get('/track/:id', trackController.getTrack);

router.get('/search', searchController.getSearch);

router.get('/advancedsearch', searchController.advancedSearch);

router.get('/me',isLogged, userController.getMyUser);

router.post('/me',isLogged, userController.postInfo);

router.get('/me/logout', userController.logout);

router.get('/recommend-strategy1', recommendStrategiesController.recommendSimilarTracks)

router.get('/recommend-strategy2', recommendStrategiesController.recommendArtistsBasedOnLocation)

router.get('/recommend-user-similarity', getUserBasedReccomendation);





module.exports = router;