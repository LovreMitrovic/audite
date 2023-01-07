require('dotenv').config()
const api = require("./api-lastfm");
const db = require("../db/db");
const imageapi = require("./api-coverart");
const fbApi = require("./api-facebook");
const {Error} = require("mongoose");
const apiMusicMatch = require("./api-musicmatch");

function sterilaze(obj){
    if (obj.mbid === '') {
        return {...obj, mbid:null};
    }
    return obj;
}

//Params: name of artist and track Returns: string contains 30% of lyrics
async function populateWithLyrics(artistName,trackName){
    const tracks = await apiMusicMatch.searchTrack(trackName,artistName);
    //I wont try iterating because of very limited number of api calls
    const track = tracks[0].track
    const mmid = track['track_id'];
    const lyrics = await apiMusicMatch.getLyrics(mmid);
    return lyrics;
}

async function populateTrack(trackName, artistNode, albumNode){
    const artistName = artistNode.get('name');
    let track = await db.first('track', 'name', trackName);
    if (!track) {
        let trackInfo = await api.getTrackInfo(artistName,trackName)
        track = await db.create('track', trackInfo)
    }
    populateWithLyrics(artistName, trackName)
        .then((lyrics)=>{
            if(lyrics){
                track.update({lyrics})
                console.log('LYRICS POPULATE: Found lyrics for '+artistName + ' ' + trackName);
            }
        })
        .catch((err)=>{
            console.log('LYRICS POPULATE: Couldnt find lyrics for '+artistName + ' ' + trackName);
        })
    if(albumNode){
        await albumNode.relateTo(track, 'contains_track');
    }
    await artistNode.relateTo(track, 'created_track');
    return track;
}

async function populateWithSImilarArtists(artist,limitAlbum){
    //if(current > limit){return}
    let artistInfo = await api.getArtistInfo(artist.get('name'));
    for (let similar of artistInfo.similar.artist){
        let sartist = await db.first('artist', 'name', similar.name);
        if(!sartist){
            populateArtist(similar.name,limitAlbum,false)
                .then(()=>console.log('[POPULATED WITH SIMILAR ARTISTS]: getting info for artist'+ similar.name))
            let sinfo = await api.getArtistInfo(similar.name);
            sartist = await db.create('artist', sinfo);
            console.log('[SIMILAR ARTIST]:Adding '+similar.name)

        }
        artist.relateTo(sartist, 'similar_artist');
        sartist.relateTo(artist, 'similar_artist');
        //populateWithSImilarArtists(sartist, current+1, limit)
        //    .then(()=>console.log('Populated similar '+similar.name))
    }
}

//async function populateTrack(trackName, artist)

async function populateArtist(name,limitAlbum, populateSimilar = true){
    let artist = await db.first('artist', 'name', name);
    if (!artist) {
        console.log('[POPULATE]: getting info for artist'+ name);
        let artistInfo = await api.getArtistInfo(name);
        if(artistInfo === undefined){
            throw new Error('Couldnt find information for artist: '+name);
        }
        artist = await db.create('artist', artistInfo);
    }

    console.log('[POPULATE]: getting albums for artist'+ name);
    let albumList = await api.getTopAlbumsFromArtist(name);
    let num = 0;
    for (let albumData of albumList) {
        if (num >= limitAlbum) {
            break
        }
        if(!albumData.name){
            continue;
        }
        let albumInfo = await api.getAlbumInfo(name, albumData.name);
        let album = await db.first('album', 'name', albumData.name)
        if (!album) {
            album = await db.create('album', sterilaze(albumInfo))
        }
        imageapi.getCover(albumInfo.mbid)
            .then((link) => {
                console.log('IMAGE API: Link for '+albumInfo.name+' is '+link)
                album.update({image_link:link})
            })
            .catch(()=>console.log('IMAGE API: There is no image for '+albumInfo.name))
        try{
            for (let trackData of albumInfo.tracks.track) {
                    await populateTrack(trackData.name,artist,album);
            }
        } catch(e){console.log('[POPULATE ERROR]:count populate with single tracks')}

        await artist.relateTo(album, 'created_album');
        console.log('Connecting ' + name + ' and ' + albumData.name);
        if(populateSimilar){
            await populateWithSImilarArtists(artist,limitAlbum)
                .then(()=>console.log('[POPULATED WITH SIMILAR ARTISTS]'))
                .catch(()=>console.log('[ERROR POPULATED WITH SIMILAR ARTISTS]'))
        }
    }
    return artist;
}

async function populateWithFacebookLikes(userObj){
    const userNode = await db.first('user','fid',userObj.fid);
    const list = await new fbApi(userObj).getLikedMusic();
    for(let page of list){
        let artist = await db.first('artist','name',page.name);
        if (!artist){
            try{
                artist = await populateArtist(page.name, 3,true);
            } catch(e) {
                console.log(e);
                continue;
            }
        }
        userNode.relateTo(artist, 'likes')
            .then(()=>console.log('Connected '+userObj.fid+' and '+page.name))
            .catch((e)=>console.log(e));
    }
}

async function connectWithFriends(userObj){
    const userNode = await db.first('user','fid',userObj.fid);
    const friendList = await new fbApi(userObj).getFriends();
    for (let friend of friendList){
        let friendNode = await db.first('user','fid', friend.id);
        await userNode.relateTo(friendNode,'friends_with');
        await friendNode.relateTo(userNode,'friends_with');
    }
}

module.exports = {populateArtist, populateWithSImilarArtists, populateWithFacebookLikes, connectWithFriends, populateTrack, populateWithLyrics}