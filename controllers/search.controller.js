const db = require("../db/db");
const toNumber = require("../utils/toNumber");
const apiLastFm = require("../service/api-lastfm");
const {populateArtist, populateTrack} = require("../service/populate");
const getSearch = (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const filter = req.query.filter ? req.query.filter.toLowerCase() : '';

    if(limit > 100 || limit < 1 || skip < 0 || !filter){
        res.status(400).send('Limit needs to be between 1 and 100, skip needs to be positive and filter needs to be present');
    }
    const pEntities = db.query().match('this')
        .where(`toLower(this.name) contains "${filter}" AND labels(this) in [['artist'],['album'],['track']]`)
        .return('id(this)','this.name','labels(this)')
        .orderBy('this.name')
        .skip(skip)
        .limit(limit).execute();
    const pCount = db.query().match('this')
        .where(`toLower(this.name) contains "${filter}" AND labels(this) in [['artist'],['album'],['track']]`)
        .return('count(this)').execute()

    Promise.all([pEntities, pCount])
        .then( ([qEntities,qCount]) => {
            const entities = qEntities.records.map((r) => ({
                name: r.get('this.name'),
                label: r.get('labels(this)')[0],
                link: `/${r.get('labels(this)')[0]}/${r.get('id(this)')}`
            }))
            const count = toNumber(qCount.records[0].get('count(this)'));
            if(skip >= count){
                res.status(404)
            }
            res.send({
                data: entities,
                _links: {
                    next: skip+limit <= count
                        //izbrisi filter
                        ? `/search/?limit=${limit}&skip=${skip+limit}&filter=${filter}`
                        : null,
                    back: skip-limit >= 0
                        ? `/search/?limit=${limit}&skip=${skip-limit}&filter=${filter}`
                        : null,
                    count
                },
                _filter: filter ? filter : null
            })
        })
}

async function broadSearchArtist(artistName,skip,limit){

    const dataArtists = await apiLastFm.searchArtist(artistName);
    const artists = dataArtists.artistmatches.artist.filter((artist) => artist.mbid !== '').map((artist) => artist.name).slice(skip,limit);
    const promises = artists.map((artistName) => {
        return populateArtist(artistName, 1);
    })

    return await Promise.all(promises);
}
async function broadSearchTrack(trackName,skip,limit){
    const dataTracks = await apiLastFm.searchTrack(trackName);
    const tracks = dataTracks.trackmatches.track.filter((track) => track.mbid !== '').slice(skip,limit);
    for(let artist of tracks.map((track) => track.artist)){
        await populateArtist(artist,1)
    }
    let nodes = [];
    for(let track of tracks){
        const artistNode = await db.first('artist','name',track.artist);
        const node = await populateTrack(track.name,artistNode,null);
        nodes.push(node)
    }
    return nodes

}

const advancedSearch = async (req,res) => {
    const myQuery = req.query.query ? req.query.query.toLowerCase() : '';
    const artistSkip = req.query.artistskip ? req.query.artistskip : 0;
    const artistLimit = req.query.artistlimit ? req.query.artistlimit : 1;

    const trackSkip = req.query.trackskip ? req.query.trackskip : 0;
    const trackLimit = req.query.tracklimit ? req.query.tracklimit : 1;

    if(!myQuery){
        res.status(400).send('Limit needs to be between 1 and 100, skip needs to be positive and filter needs to be present');
    }

    let artists = await broadSearchArtist(myQuery,artistSkip,artistLimit);
    let tracks = await broadSearchTrack(myQuery,trackSkip,trackLimit);

    res.send({
        data: tracks.concat(artists).map((node) => ({
            name: node.get('name'),
            label: node.labels()[0],
            link: `/${node.labels()[0]}/${toNumber(node.identity())}`
        }))
    })

}


module.exports = {getSearch, advancedSearch}