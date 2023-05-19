const db = require("../db/db");

async function findImages(label,id){
    let dbquery;
    switch(label){
        case 'album':
            const node = await db.findById(label,id);
            return [node.get('image_link')];
        case 'track':
            dbquery = await db.query()
                .match('album','album')
                .relationship('contains_track','out','rel')
                .to('track','track')
                .where(`id(track)=${id} and album.image_link is not null`)
                .return('album.image_link').execute();
            return dbquery.records.map((r)=>r.get('album.image_link'));
        case 'artist':
            dbquery = await db.query()
                .match('album','album')
                .relationship('created_album','in','rel')
                .to('artist','artist')
                .where(`id(artist)=${id} and album.image_link is not null`)
                .return('album.image_link')
                .orderBy('album.plycount').execute();
            return dbquery.records.map((r)=>r.get('album.image_link'));
        default: return null;
    }
}

const getImages = (req,res) => {
    const label = req.params.label;
    const id = req.params.id;
    findImages(label,id)
        .then((data) => {
            res.send({data})
        })
}

module.exports = {getImages};