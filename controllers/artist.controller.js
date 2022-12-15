const db = require("../db/db");
const toNumber = require("../utils/toNumber");
const getArtists = (req, res) => {
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

            //res.render('artists',{
            res.send({
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
}

const getArtist = (req,res) =>{
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
            res.send({id,mbid:null,...node.properties(),tracks,albums,liked});
            //res.render('artist',{id,mbid:null,...node.properties(),tracks,albums,liked})
        })
        .catch(()=>res.status(404).send('Not Found'));
}

module.exports = {getArtist, getArtists}