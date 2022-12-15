const db = require('../db/db');
const toNumber = require('../utils/toNumber');
const getAlbum = (req,res) =>{
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
            res.send({mbid:null,playcount:null,image_link:null,...node.properties(),tracks, authors})
            //res.render('album',{
            //    mbid:null,playcount:null,image_link:null,...node.properties(),tracks, authors})
        })
        .catch(()=>res.status(404).send('Not Found'));
}

module.exports = {getAlbum}