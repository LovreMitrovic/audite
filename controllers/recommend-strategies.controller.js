const db = require("../db/db");
const apiLastFm = require("../service/api-lastfm");
const lastFmApi = require("../service/api-lastfm");
const fbApi = require("../service/api-facebook");
const {Error} = require("mongoose");

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

module.exports = {recommendArtistsBasedOnLikes,recommendArtistsBasedOnLocation}