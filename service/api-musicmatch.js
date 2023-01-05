require('dotenv').config()
const axios = require("axios");

class ApiMusicmatch{

    //returns [Object]
    static async searchTrack(queryTrack, queryArtist){
        const options = {
            method: 'GET',
            url: process.env.MUSICMATCH_API_URL+'track.search',
            params: {
                q_track: queryTrack,
                q_artist: queryArtist,
                apikey: process.env.MUSICMATCH_API_KEY,
            }
        }
        const response = await axios.request(options);
        if(response.data.message.header['status_code'] != 200){
            throw new Error('Error status code is '+response.data.message.header['status_code']);
        }
        return response.data.message.body['track_list']
    }

    static async getLyrics(musicmatchTrackId){
        const options = {
            method: 'GET',
            url: process.env.MUSICMATCH_API_URL+'track.lyrics.get',
            params: {
                track_id: musicmatchTrackId,
                apikey: process.env.MUSICMATCH_API_KEY,
            }
        }
        const response = await axios.request(options);
        if(response.data.message.header['status_code'] != 200){
            throw new Error('Error status code is '+response.data.message.header['status_code']);
        }
        return response.data.message.body.lyrics['lyrics_body']
    }
}

module.exports = ApiMusicmatch;