const db = require("../db/db");
const toNumber = require("../utils/toNumber");
const {populateWithLyrics} = require('../service/populate');
async function populateLyrics() {
    let q = await db.query().match('artist', 'artist')
        .relationship('created_track', 'out', 'rel')
        .to('track', 'track')
        .return('track,artist').execute();
    let tracks = q.records.map((r)=>r.get('track'));
    let artists = q.records.map((t)=>t.get('artist'));
    for(let i = 0; i < tracks.length; i++){
        let track = tracks[i];
        let artist = artists[i];
        console.log(`Currently on track ${track.properties.name} by ${artist.properties.name}`);
        populateWithLyrics(track.properties.name, artist.properties.name)
            .then((lyrics)=>{
                track.update({lyrics})
                console.log('LYRICS POPULATE: Found lyrics for ' + track.properties.name);
            })
            .catch((err)=>{
                console.log('LYRICS POPULATE: Couldnt find lyrics for ' + track.properties.name);
            })
    }
    return tracks;
}
populateLyrics().then((tracks) => console.log('ok'));