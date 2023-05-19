const db = require("../db/db");
const toNumber = require("../utils/toNumber");
const getTrack = (req,res) =>{
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
            res.send({mbid:null,playcount:null,...node.properties(), authors})
            //res.render('track',{mbid:null,playcount:null,...node.properties(), authors})
        })
        .catch(()=>res.status(404).send('Not Found'));
}

module.exports = {getTrack}