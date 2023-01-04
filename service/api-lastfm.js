const axios = require("axios");
require('dotenv').config()

class ApiLastfm {

    //returns [Object]
    static async getTopArtistsFromGeo(country) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'geo.gettopartists',
                country: country,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.topartists.artist
    }

    //returns [Object]
    static async getTopTracksFromGeo(country) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'geo.gettoptracks',
                country: country,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.tracks.track
    }

    //returns Object
    static async getArtistInfo(artistName) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'artist.getinfo',
                artist: artistName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.artist
    }

    //returns [Object]
    static async getSimilarArtists(artistName) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'artist.getsimilar',
                artist: artistName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.similarartists.artist
    }

    //returns [Object]
    static async getTopAlbumsFromArtist(artistName) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'artist.gettopalbums',
                artist: artistName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.topalbums.album
    }

    //returns [Object]
    static async getTopTracksFromArtist(artistName) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'artist.gettoptracks',
                artist: artistName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data
    }

    //returns Object
    static async getAlbumInfo(artistName, albumName) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'album.getinfo',
                artist: artistName,
                album: albumName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.album
    }

    //returns Object
    static async getTrackInfo(artistName, trackName) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'track.getinfo',
                artist: artistName,
                track: trackName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.track
    }

    //returns [Object]
    static async getSimilarTracks(artistName, trackName) {
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'track.getsimilar',
                artist: artistName,
                track: trackName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.similartracks.track;

    }

    static async searchTrack(trackName){
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'track.search',
                track: trackName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.results;
    }

    static async searchArtist(artistName){
        const options = {
            method: 'GET',
            url: process.env.LASTFM_API_URL,
            params: {
                method: 'artist.search',
                artist: artistName,
                api_key: process.env.LASTFM_API_KEY,
                format: 'json'
            }
        }
        const response = await axios.request(options);
        return response.data.results;
    }
}

module.exports = ApiLastfm