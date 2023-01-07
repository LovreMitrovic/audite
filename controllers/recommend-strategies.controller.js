const db = require("../db/db");
const apiLastFm = require("../service/api-lastfm");
const lastFmApi = require("../service/api-lastfm");
const musicMatchApi = require("../service/api-musicmatch");
const fbApi = require("../service/api-facebook");
const {Error} = require("mongoose");
const {like} = require("./like.controller");
const stringSimilarity = require('string-similarity');


//Iteracija po lajkanim artistima, traženje sličnih artista
const recommendArtistsBasedOnLikes = (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    if (limit > 100) {
        res.status(400).send('Max limit is 100');
    }

    var similarArtistsArray=Array()
    const pLikedArtists = db.query()
        .match('this', 'user')
        .relationship('likes', 'out', 'rel')
        .to('other', 'artist')
        .where('this.fid', req.user.fid)
        .return('other').execute()

    Promise.all([pLikedArtists])
        .then(async ([queryLikes]) => {
            let likedArtists = queryLikes.records.map((r) => ({
                name: r.get('other').properties.name
            }));

            for (let likedArtist of likedArtists.values()) {
                const similarArtists = db.query()
                    .match('this', 'artist')
                    .relationship('similar_artist', 'out', 'rel')
                    .to('other', 'artist')
                    .where('this.name', likedArtist.name)
                    .return('other')
                    .execute()

                await Promise.all([similarArtists])
                    .then(async ([queryArtists]) => {
                        let similarArtists = queryArtists.records.map((r) => ({
                            name: r.get('other').properties.name,
                            id: r.get('other').identity.low,
                            tracks: Array()
                        }))

                        for (simArtist of similarArtists.values()) {
                            similarArtistsArray.push({
                                name: simArtist.name,
                                link: '/artist/' + simArtist.id
                            })
                        }
                    })
            }

            const count = similarArtistsArray.length
            if (skip >= count) {
                res.status(404)
            }

            res.send({
                data: similarArtistsArray.slice(skip, skip + limit),
                _links: {
                    next: skip + limit <= count
                        ? `/recommend_strategy1/?limit=${limit}&skip=${skip + limit}`
                        : null,
                    back: skip - limit >= 0
                        ? `/recommend_strategy1/?limit=${limit}&skip=${skip - limit}`
                        : null,
                    count
                },
                _filter: null
            })
        });
}

//Za svakog lajkanog artista iz baze uzima se najslušanija pjesma i njezin tekst
//Onda se uzimaju svih slični artisti njihove pjesme i gleda se koje su 2 najsličnije pjesme po svakom artistu
//Od 2 najslicnije pjesme se uzimaju podaci o artistu, ime pjesme i lyricsi
const recommendSimilarTracks = async (req, res) => {
    const numOfRecommendationsPerLikedArtist = 2
    var recommendedArtistTracks = Array()

    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    if (limit > 100) {
        res.status(400).send('Max limit is 100');
    }

    const pLikedArtists = db.query()
        .match('this', 'user')
        .relationship('likes', 'out', 'rel')
        .to('other', 'artist')
        .where('this.fid', req.user.fid)
        .return('other').execute()

    Promise.all([pLikedArtists])
        .then(async ([queryLikes]) => {
            let likedArtists = queryLikes.records.map((r) => ({
                name: r.get('other').properties.name
            }));

            for (let likedArtist of likedArtists.values()) {
                var allSimilarArtistLyrics = Array()

                const topTrack = db.query()
                    .match('this', 'artist')
                    .relationship('created_track', 'out', 'rel')
                    .to('other', 'track')
                    .where('this.name', likedArtist.name)
                    .return('other')
                    .limit(1)
                    .orderBy('other.playcount DESC')
                    .where('other.lyrics is not null')
                    .execute()
                const similarArtists = db.query()
                    .match('this', 'artist')
                    .relationship('similar_artist', 'out', 'rel')
                    .to('other', 'artist')
                    .where('this.name', likedArtist.name)
                    .return('other')
                    .execute()

                await Promise.all([topTrack, similarArtists])
                    .then(async ([queryTracks, queryArtists]) => {
                        let topTrackOfLikedArtist = queryTracks.records.map((r) => ({
                            name: r.get('other').properties.name,
                            lyrics: r.get('other').properties.lyrics
                        }));

                        let similarArtists = queryArtists.records.map((r) => ({
                            name: r.get('other').properties.name,
                            id: r.get('other').identity.low,
                            tracks: Array()
                        }))

                        //Ako lajkani artist ima bar jednu pjesmu s lyricsima, inace ga preskoci
                        if(topTrackOfLikedArtist.length!==0) {
                            for (similarArtist of similarArtists) {
                                const topTracks2 = db.query()
                                    .match('this', 'artist')
                                    .relationship('created_track', 'out', 'rel')
                                    .to('other', 'track')
                                    .where('this.name', similarArtist.name)
                                    .return('other')
                                    .orderBy('other.playcount DESC')
                                    .execute()

                                await Promise.all([topTracks2])
                                    .then(async ([queryTracks]) => {
                                        for (record of queryTracks.records) {
                                            //Uspoređivat ce se samo s pjesmama koje imaju lyricse
                                            if (record.get('other').properties.lyrics !== undefined) {
                                                allSimilarArtistLyrics.push(record.get('other').properties.lyrics)
                                            }
                                            similarArtist.tracks.push({
                                                name: record.get('other').properties.name,
                                                lyrics: record.get('other').properties.lyrics,
                                                id:record.get('other').identity.low
                                            })
                                        }
                                    })
                            }

                            //Ako pjesma lajkanog artista nema lyricse, stavlja se na prazni string, onda sličnost nema smisla ali se bar dobi neki output
                            let likedArtistLyrics = topTrackOfLikedArtist[0].lyrics
                            /*if (likedArtistLyrics === undefined) {
                                likedArtistLyrics = ""
                            }*/
                            let result = stringSimilarity.findBestMatch(likedArtistLyrics, allSimilarArtistLyrics)
                            let ratings = result.ratings
                            ratings = ratings.sort((r1, r2) => (r1.rating > r2.rating) ? -1 : (r1.rating < r2.rating) ? 1 : 0);

                            it = 0
                            foundRecomm = 0
                            while (foundRecomm < numOfRecommendationsPerLikedArtist && it < ratings.length) {
                                let lyrics = ratings[it].target
                                it++;
                                for (similarArtist of similarArtists) {
                                    //Provjerava dal vec postoji isti track
                                    if (recommendedArtistTracks.filter(function (e) {
                                        return e.lyrics === lyrics;
                                    }).length === 0) {
                                        for (similarTrack of similarArtist.tracks) {
                                            if (similarTrack.lyrics === lyrics) {
                                                recommendedArtistTracks.push({
                                                    artistName: similarArtist.name,
                                                    track: similarTrack.name,
                                                    lyrics: similarTrack.lyrics,
                                                    link: '/track/' + similarTrack.id
                                                })
                                                foundRecomm++;
                                            }
                                        }
                                    }
                                }
                            }
                            /*  for (i = 0; i < numOfRecommendationsPerLikedArtist; i++) {
                                  let lyrics = ratings[i].target
                                  for (similarArtist of similarArtists) {
                                      for (similarTrack of similarArtist.tracks) {
                                          if (similarTrack.lyrics === lyrics) {
                                              recommendedArtistTracks.push({
                                                  artistName: similarArtist.name,
                                                  track: similarTrack.name,
                                                  lyrics: similarTrack.lyrics,
                                                  link: '/artist/' + similarArtist.id
                                              })
                                          }
                                      }
                                  }
                              }*/

                        }
                    })
            }


            const count = recommendedArtistTracks.length
            if (skip >= count) {
                res.status(404)
            }

            res.send({
                data: recommendedArtistTracks.slice(skip, skip + limit),
                _links: {
                    next: skip + limit <= count
                        ? `/recommend_strategy2/?limit=${limit}&skip=${skip + limit}`
                        : null,
                    back: skip - limit >= 0
                        ? `/recommend_strategy2/?limit=${limit}&skip=${skip - limit}`
                        : null,
                    count
                },
                _filter: null
            })
        });

}

module.exports = {recommendArtistsBasedOnLikes, recommendSimilarTracks}