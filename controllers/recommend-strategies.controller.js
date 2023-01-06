const db = require("../db/db");
const apiLastFm = require("../service/api-lastfm");
const lastFmApi = require("../service/api-lastfm");
const musicMatchApi = require("../service/api-musicmatch");
const fbApi = require("../service/api-facebook");
const {Error} = require("mongoose");
const {like} = require("./like.controller");
const stringSimilarity = require('string-similarity');


//Uzet iz baze lajkane artiste, uzet njihove 2 najpoznatije pjesme s api-ja
//lyricse, sentiment analiza
//naci top 20 slicnih artista, njihove 2 najpoznatije pjesme i po sentiment analizi uzet 5 najslicnijih pjesmi

//Uzet s drugog apija

//Iteracija po lajkanim artistima, traženje sličnih artista i njihovih podataka
const recommendArtistsBasedOnLikes = (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    if(limit > 100){
        res.status(400).send('Max limit is 100');
    }

    const pLikedArtists = db.query()
        .match('this','user')
        .relationship('likes','out','rel')
        .to('other','artist')
        .where('this.fid', req.user.fid)
        .return('other').execute()

    Promise.all([pLikedArtists])
        .then(async ([queryLikes]) => {
            let likedArtists = queryLikes.records.map((r) => ({
                name: r.get('other').properties.name
            }));

            let similarArtistsArray = Array()
            //100 sličnih po pozivu
            for (let likedArtist of likedArtists.values()) {
                let similarArtists = await apiLastFm.getSimilarArtists(likedArtist.name)

                for(simArtist of similarArtists){
                    let name=simArtist["name"]
                    let artist = await db.first('artist', 'name', name);
                    if (!artist) {
                        console.log('[POPULATE]: getting info for artist'+ name);
                        let artistInfo = await lastFmApi.getArtistInfo(name);
                        if(artistInfo === undefined){
                            throw new Error('Couldnt find information for artist: '+name);
                        }
                        artist = await db.create('artist', artistInfo);
                    } else{
                        console.log("Artist "+name+" found in DB")
                    }
                    similarArtistsArray.push({
                        name:artist.get("name"),
                        link:'/artist/'+artist.id()
                    })
                }
            }

            const count=similarArtistsArray.length
            if(skip >= count){
                res.status(404)
            }

            res.send({
                data: similarArtistsArray.slice(skip,skip+limit),
                _links: {
                    next: skip+limit <= count
                        ? `/recommend_strategy1/?limit=${limit}&skip=${skip+limit}`
                        : null,
                    back: skip-limit >= 0
                        ? `/recommend_strategy1/?limit=${limit}&skip=${skip-limit}`
                        : null,
                    count
                },
                _filter: null
            })
        });
}

//Artisti ovisno o facebook lokaciji
const recommendArtistsBasedOnLocation = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    if (limit > 100) {
        res.status(400).send('Max limit is 100');
    }

    let country = await new fbApi(req.user).getUserCountry()
        .catch((e)=> {
                console.log("Greška " + e)
                res.send(country)
            })

    let countryArtists = Array()
    let countryTopArtists = await apiLastFm.getTopArtistsFromGeo(country)
    for(cArtist of countryTopArtists){
        let name=cArtist["name"]
        let artist = await db.first('artist', 'name', name);
        if (!artist) {
            console.log('[POPULATE]: getting info for artist'+ name);
            let artistInfo = await lastFmApi.getArtistInfo(name);
            if(artistInfo === undefined){
                throw new Error('Couldnt find information for artist: '+name);
            }
            artist = await db.create('artist', artistInfo);
        } else{
            console.log("Artist "+name+" found in DB")
        }
        countryArtists.push({
            name:artist.get("name"),
            link:'/artist/'+artist.id()
        })
    }

    const count=countryArtists.length
    if(skip >= count){
        res.status(404)
    }

    res.send({
        data: countryArtists.slice(skip,skip+limit),
        _links: {
            next: skip+limit <= count
                ? `/recommend_strategy2/?limit=${limit}&skip=${skip+limit}`
                : null,
            back: skip-limit >= 0
                ? `/recommend_strategy2/?limit=${limit}&skip=${skip-limit}`
                : null,
            count
        },
        _filter: null
    })
}

//Za svakog lajkanog artista iz baze uzima se najpopularnija pjesma i njezin tekst
//Onda se uzima x (3) slicnih artista i po 2 njihove pjesme i gleda se koje su 2 najslicnije pjesme
//Od 2 najslicnije pjesme se uzimaju podaci o artistu, ime pjesme i lyricsi
const recommendSimilarTracks= async (req, res) =>  {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    if(limit > 100){
        res.status(400).send('Max limit is 100');
    }

    const pLikedArtists = db.query()
        .match('this','user')
        .relationship('likes','out','rel')
        .to('other','artist')
        .where('this.fid', req.user.fid)
        .return('other').execute()

    var recommendedArtistTracks=Array()
    var artistArray=Array()

    Promise.all([pLikedArtists])
        .then(async ([queryLikes]) => {
            let likedArtists = queryLikes.records.map((r) => ({
                name: r.get('other').properties.name
            }));

            for (let likedArtist of likedArtists.values()) {
                let artistTracks=new Map()
                let topTracks=await lastFmApi.getTopTracksFromArtist(likedArtist.name)
                let track=await musicMatchApi.searchTrack(topTracks.toptracks.track[0].name,likedArtist.name)

                /* for(i=0;i<1 || i==topTracks.toptracks.track.length;i++){
                     let track=await musicMatchApi.searchTrack(topTracks.toptracks.track[i].name,likedArtist.name)
                     let lyrics= await musicMatchApi.getLyrics(topTracks.toptracks.track[i].track_id)
                     top3Tracks.push({
                         rank: i+1,
                         name:topTracks.toptracks.track[i].name,
                         lyrics:lyrics
                     })
                 }*/
                let lyrics= await musicMatchApi.getLyrics(track[0].track.track_id)

               // artistTracks.set(likedArtist.name, topTracksWithLyrics)
                artistTracks.set(likedArtist.name, lyrics)

                //Top 2 tracka od 3 slicnih artista lajkanima
                let similarArtists = await apiLastFm.getSimilarArtists(likedArtist.name)
                let similarArtistTracks=new Map()
                let allSimilarLyrics=Array()
                for(i2=0;i2<3;i2++){
                    let name=similarArtists[i2].name
                    let topTracks=await lastFmApi.getTopTracksFromArtist(name)
                    let topTracksSimilarWithLyrics=Array()
                    for(i3=0;i3<2 || i3==topTracks.toptracks.track.length;i3++){
                        let track=await musicMatchApi.searchTrack(topTracks.toptracks.track[i3].name, name)
                        let lyrics=""
                        try {
                            lyrics = await musicMatchApi.getLyrics(track[0].track.track_id)
                        }catch (e) {
                        }
                        allSimilarLyrics.push(lyrics)
                        topTracksSimilarWithLyrics.push({
                            rank: i3+1,
                            name:topTracks.toptracks.track[i3].name,
                            lyrics:lyrics
                        })
                    }
                    similarArtistTracks.set(name, topTracksSimilarWithLyrics)
                }

                for (let [key,value] of artistTracks){
                    let artist=key
                    let textLyrics=value
                    let result=stringSimilarity.findBestMatch(textLyrics,allSimilarLyrics)
                    let ratings=result.ratings
                    ratings = ratings.sort((r1, r2) => (r1.rating > r2.rating) ? -1 : (r1.rating < r2.rating) ? 1 : 0);
                    //Uzimam dva najslicnija teksta i stavljam Autora i tu pjesmu u polje
                    for(i=0;i<2;i++){
                        let lyrics=ratings[i].target
                        for (let [key,value] of similarArtistTracks){
                            for(song of value){
                                if(song.lyrics===lyrics){
                                    recommendedArtistTracks.push({artistName:key,track:song.name, lyrics:lyrics})
                                }
                            }
                        }
                    }
            }
            }

            for(artistTrack of recommendedArtistTracks){
                let name=artistTrack.artistName
                let artist = await db.first('artist', 'name', name);
                if (!artist) {
                    console.log('[POPULATE]: getting info for artist'+ name);
                    let artistInfo = await lastFmApi.getArtistInfo(name);
                    if(artistInfo === undefined){
                        throw new Error('Couldnt find information for artist: '+name);
                    }
                    artist = await db.create('artist', artistInfo);
                } else{
                    console.log("Artist "+name+" found in DB")
                }

                artistArray.push({
                    name:name,
                    track:artistTrack.track,
                    lyrics:artistTrack.lyrics,
                    link:'/artist/'+artist.id()
                })
            }

            const count=artistArray.length
            if(skip >= count){
                res.status(404)
            }

            res.send({
                data: artistArray.slice(skip,skip+limit),
                _links: {
                    next: skip+limit <= count
                        ? `/recommend_strategy3/?limit=${limit}&skip=${skip+limit}`
                        : null,
                    back: skip-limit >= 0
                        ? `/recommend_strategy3/?limit=${limit}&skip=${skip-limit}`
                        : null,
                    count
                },
                _filter: null
            })
        });

}

module.exports = {recommendArtistsBasedOnLikes,recommendArtistsBasedOnLocation,recommendSimilarTracks}