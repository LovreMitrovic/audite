const db = require("../db/db");
const toNumber = require("../utils/toNumber");
const getMyUser = (req,res) =>{
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
            res.send({...userInfo, likedArtists, friends});
            //res.render('profile',{...userInfo, likedArtists, friends})
        });
}

const getUser = (req,res) =>{
    const pUser = db.first('user','fid',req.params.fid);
    pUser.then((user) => {
        //console.log(user);
        const {first_name, last_name, photo,...other} = user.properties();
        res.send({first_name, last_name, photo})
    })
        .catch(()=>res.status(404).send('Not Found'));
}

const logout = (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/')
    })
}

module.exports = {getUser, getMyUser, logout}