const db = require("../db/db");
const toNumber = require("../utils/toNumber");
const getUserBasedReccomendation = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const userId = req.user.fid;
    let similarUserTracks = await db.query().match('me','user').where('me.fid', userId)
        .with('me').match('similar','user')
        .relationship('likes','out','rel_artist')
        .to('artist','artist')
        .relationship('created_track','out','rel_track')
        .to('track','track')
        .where('similar.fid', '<>', userId)
        .return('DISTINCT track, (me.age- similar.age)^2 AS distance')
        .orderBy('distance, track.playcount')
        .limit(10000)
        .execute();

    similarUserTracks = similarUserTracks.records.map((r)=> r.get('track'));

    similarUserTracks = similarUserTracks.filter((value, index, self) =>
            index === self.findIndex((t) => (
                toNumber(t.identity) === toNumber(value.identity)
            ))
    );

    similarUserTracks = similarUserTracks.map((t)=>({
        link: '/track/' + toNumber(t.identity),
        name: t.properties.name,
        label: 'track'
    }));

    const count = similarUserTracks.length;
    if(skip >= count){
        res.status(404)
    }
    similarUserTracks = similarUserTracks.slice(skip, skip+limit);

    res.send({
        data: similarUserTracks,
        _links: {
            next: skip+limit < count
                ? `/recommend-user-similarity/?limit=${limit}&skip=${skip+limit}`
                : null,
            back: skip-limit >= 0
                ? `/recommend-user-similarity/?limit=${limit}&skip=${skip-limit}`
                : null,
            count
        }
    })

}

module.exports = {getUserBasedReccomendation}