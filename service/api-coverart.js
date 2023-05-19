require('dotenv').config()
const axios = require("axios");

class ApiCoverart{

    //returns [Object]
    static async getCover(mbid){
        const options = {
            method: 'GET',
            url: process.env.COVERART_API_URL+mbid,
            accept: 'application/json'
        }
        const response = await axios.request(options);
        const data = response.data;
        return data.images[0].thumbnails.small;//mozda implementirati dohvati više linkova za veličine
    }
}

module.exports = ApiCoverart