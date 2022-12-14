const passport = require("../service/passport-facebook");
const axios = require("axios");
const express = require('express')
const isLogged = require('../middlewares/isLoggedIn')
const router = express.Router()
const path = require('path')
const db = require('../db/db')
const toNumber = require('../utils/toNumber')
const {fid} = require("../db/models/user");



router.get('/facebook', passport.authenticate('facebook', {scope:['email','user_friends']}));
router.get('/api/auth/facebook', passport.authenticate('facebook',
    {successRedirect:'/me',
        failureRedirect:'/failed'}));

router.get('/',(req,res)=>{
    res.render('index',{
        auth:req.isAuthenticated(),
        user:req.user
    })
})

router.get('/user/:fid', (req,res) =>{
    const pUser = db.first('user','fid',req.params.fid);
    pUser.then((user) => {
        console.log(user);
        const {first_name, last_name, ...other} = user.properties();
        res.send({first_name, last_name})
    })
        .catch(()=>res.status(404).send('Not Found'));
});

router.get('/artists', (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 1;
    const filter = req.query.filter ? req.query.filter.toLowerCase() : '';
    if(limit > 100){
        res.status(400).send('Max limit is 100');
    }
    let pCount;
    let pArtists
    if(filter){
        pArtists = db.query().match('this','artist')
            .where(`toLower(this.name) contains "${filter}"`)
            .return('id(this)','this.name')
            .orderBy('this.name')
            .skip(skip)
            .limit(limit).execute();
        pCount = db.query().match('this','artist')
            .where(`toLower(this.name) contains "${filter}"`)
            .return('count(this)').execute()
    } else {
        pArtists = db.query().match('this','artist')
            .return('id(this)','this.name')
            .orderBy('this.name')
            .skip(skip)
            .limit(limit).execute();
        pCount = db.query().match('this','artist')
            .return('count(this)').execute()
    }

    Promise.all([pArtists, pCount])
        .then( ([qArtists,qCount]) => {
            const artists = qArtists.records.map((r) => ({
                name: r.get('this.name'),
                link: `/artist/${r.get('id(this)')}`
            }))
            const count = toNumber(qCount.records[0].get('count(this)'));
            if(skip >= count){
                res.status(404)
            }
            //res.send({
            res.render('artists',{
                data: artists,
                _links: {
                    next: skip+limit <= count
                        //izbrisi filter
                        ? `/artists/?limit=${limit}&skip=${skip+limit}&filter=${filter}`
                        : null,
                    back: skip-limit >= 0
                        ? `/artists/?limit=${limit}&skip=${skip-limit}&filter=${filter}`
                        : null
                },
                _filter: filter ? filter : null
            })
        })
})

router.get('/artist/:id', isLogged,(req,res) =>{
    const id = parseInt(req.params.id);
    const fid = req.user.fid;
    const pArtist = db.findById('artist',req.params.id);
    const pAlbums =db.query()
        .match('this','artist')
        .relationship('created_album','out','rel')
        .to('other','album')
        .whereId('this', id)
        .return('other')
        .execute();
    const pTracks =db.query()
        .match('this','artist')
        .relationship('created_track','out','rel')
        .to('other','track')
        .whereId('this', id)
        .return('other')
        .execute();
    const pLiked = db.cypher(`MATCH  (user:user), (artist:artist)
WHERE user.fid=$fid and id(artist)=$id
RETURN EXISTS((user)-[:likes]->(artist))`,{fid,id})

    Promise.all([pArtist,pAlbums,pTracks, pLiked])
        .then(([node,quaryAlbums,quaryTracks,qLiked]) => {
            let albums = quaryAlbums.records.map((r) => ({
                link:'/album/' + toNumber(r.get('other').identity),
                name: r.get('other').properties.name
            }));
            let tracks = quaryTracks.records.map((r)=> ({
                link:'/track/' + toNumber(r.get('other').identity),
                name: r.get('other').properties.name
            }))
            let liked = qLiked.records[0].get('EXISTS((user)-[:likes]->(artist))');
            //res.send({...node.properties(),tracks,albums,liked});
            res.render('artist',{id,mbid:null,...node.properties(),tracks,albums,liked})
        })
        .catch(()=>res.status(404).send('Not Found'));
});

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

router.get('/album/:id', (req,res) =>{
    //dodaj funkciju za validaciju req.params.id
    const pAlbum = db.findById('album',req.params.id);
    const pTracks =db.query()
        .match('this','album')
        .relationship('contains_track','out','rel')
        .to('other','track')
        .whereId('this', req.params.id)
        .return('other')
        .execute();
    const pArtist = db.query().match('this','artist')
        .relationship('created_album','out','rel')
        .to('other','album')
        .whereId('other', req.params.id)
        .return('this')
        .execute();

    Promise.all([pAlbum,pTracks,pArtist])
        .then(([node,quaryTracks,quaryArtist]) => {
            let tracks = quaryTracks.records.map((r)=> ({
                link:'/track/' + toNumber(r.get('other').identity),
                name: r.get('other').properties.name
            }))
            let authors = quaryArtist.records.map((r) => ({
                link:'/artist/' + toNumber(r.get('this').identity),
                name: r.get('this').properties.name
            }))
            //res.send({...node.properties(),tracks, authors})
            res.render('album',{
                mbid:null,playcount:null,image_link:null,...node.properties(),tracks, authors})
        })
        .catch(()=>res.status(404).send('Not Found'));
});

router.get('/track/:id', (req,res) =>{
    const pTrack = db.findById('track',req.params.id);
    const pArtist = db.query().match('this','artist')
        .relationship('created_track','out','rel')
        .to('other','track')
        .whereId('other', req.params.id)
        .return('this')
        .execute();

    Promise.all([pTrack,pArtist])
        .then(([node, queryArtist]) => {
            let authors = queryArtist.records.map((r) => ({
                link:'/artist/' + toNumber(r.get('this').identity),
                name: r.get('this').properties.name
            }))
            //res.send({...node.properties(), creators})
            res.render('track',{mbid:null,playcount:null,...node.properties(), authors})
        })
        .catch(()=>res.status(404).send('Not Found'));
});

router.get('/me',isLogged, (req,res) =>{
    const pLikedArtists = db.query()
        .match('this','user')
        .relationship('likes','out','rel')
        .to('other','artist')
        .where('this.fid', req.user.fid)
        .return('other').execute()

    const pFriends = db.query()
        .match('me','user')
        .relationship('friends_with','both','friendship')
        .to('friend','user')
        .where('me.fid', req.user.fid)
        .return('friend').execute();

    Promise.all([pLikedArtists, pFriends])
        .then(([queryLikes, queryFriends])=>{
            let likedArtists = queryLikes.records.map((r)=> ({
                link:'/artist/' + toNumber(r.get('other').identity),
                name:r.get('other').properties.name
            }));
            let friends = queryFriends.records.map((r)=> ({
                link:'/user/' + r.get('friend').properties.fid,
                first_name: r.get('friend').properties.first_name,
                last_name: r.get('friend').properties.last_name
            }));
            const { token, ...userInfo } = req.user;
            //res.send({...userInfo, likedArtists, friends});
            res.render('profile',{...userInfo, likedArtists, friends})
        });
});

router.get('/failed', (req,res) => {
    res.send('failed');
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/')
    })
    /*
    req.logout(()=>{
        res.redirect('/');
    })*/
})

module.exports = router