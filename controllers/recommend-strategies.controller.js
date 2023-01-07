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

            let similarArtistsArray = Array()
            //100 sličnih po pozivu
            for (let likedArtist of likedArtists.values()) {
                let similarArtists = await apiLastFm.getSimilarArtists(likedArtist.name)

                for (simArtist of similarArtists) {
                    let name = simArtist["name"]
                    let artist = await db.first('artist', 'name', name);
                    if (!artist) {
                        console.log('[POPULATE]: getting info for artist' + name);
                        let artistInfo = await lastFmApi.getArtistInfo(name);
                        if (artistInfo === undefined) {
                            throw new Error('Couldnt find information for artist: ' + name);
                        }
                        artist = await db.create('artist', artistInfo);
                    } else {
                        console.log("Artist " + name + " found in DB")
                    }
                    similarArtistsArray.push({
                        name: artist.get("name"),
                        link: '/artist/' + artist.id()
                    })
                }
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

//Artisti ovisno o facebook lokaciji
const recommendArtistsBasedOnLocation = async (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    if (limit > 100) {
        res.status(400).send('Max limit is 100');
    }

    let country = await new fbApi(req.user).getUserCountry()
        .catch((e) => {
            console.log("Greška " + e)
            res.send(country)
        })

    let countryArtists = Array()
    let countryTopArtists = await apiLastFm.getTopArtistsFromGeo(country)
    for (cArtist of countryTopArtists) {
        let name = cArtist["name"]
        let artist = await db.first('artist', 'name', name);
        if (!artist) {
            console.log('[POPULATE]: getting info for artist' + name);
            let artistInfo = await lastFmApi.getArtistInfo(name);
            if (artistInfo === undefined) {
                throw new Error('Couldnt find information for artist: ' + name);
            }
            artist = await db.create('artist', artistInfo);
        } else {
            console.log("Artist " + name + " found in DB")
        }
        countryArtists.push({
            name: artist.get("name"),
            link: '/artist/' + artist.id()
        })
    }

    const count = countryArtists.length
    if (skip >= count) {
        res.status(404)
    }

    res.send({
        data: countryArtists.slice(skip, skip + limit),
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
                                            lyrics: record.get('other').properties.lyrics
                                        })
                                    }
                                })
                        }

                        //Ako pjesma lajkanog artista nema lyricse, stavlja se na prazni string, onda sličnost nema smisla ali se bar dobi neki output
                        let likedArtistLyrics = topTrackOfLikedArtist[0].lyrics
                        if (likedArtistLyrics === undefined) {
                            likedArtistLyrics = ""
                        }
                        let result = stringSimilarity.findBestMatch(likedArtistLyrics, allSimilarArtistLyrics)
                        let ratings = result.ratings
                        ratings = ratings.sort((r1, r2) => (r1.rating > r2.rating) ? -1 : (r1.rating < r2.rating) ? 1 : 0);
                        for (i = 0; i < numOfRecommendationsPerLikedArtist; i++) {
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
                        ? `/recommend_strategy3/?limit=${limit}&skip=${skip + limit}`
                        : null,
                    back: skip - limit >= 0
                        ? `/recommend_strategy3/?limit=${limit}&skip=${skip - limit}`
                        : null,
                    count
                },
                _filter: null
            })
        });

}

module.exports = {recommendArtistsBasedOnLikes, recommendArtistsBasedOnLocation, recommendSimilarTracks}