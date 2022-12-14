const axios = require("axios");

class ApiFacebook {
    constructor(user){
        this.user = user
    }

    /* returns array of objects [Object]
    example of object:
     {
        name: 'AC/DC',
        id: '6750402929',
        category: 'Glazbenik/grupa',
        cover: {
          cover_id: '263012381947161',
          offset_x: 48,
          offset_y: 50,
          source: 'https://scontent-vie1-1.xx.fbcdn.net/v/t1.6435-9/159215308_263012388613827_5062088160891309185_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=1091cb&_nc_eui2=AeEjjhvWwqrU7DK_wBXMAOLVXv95E1SZExte_3kTVJkTG4p-7iyfV5P87ALXS6zaIySB2BSNOjwq9Y4VT0Ib8kNn&_nc_ohc=nD6PTeT07z0AX9Rctak&_nc_ht=scontent-vie1-1.xx&edm=AJy-VTAEAAAA&oh=00_AfChzzFnjUxKL_jXbTnCjgEtHVBwRzsYmTgYiUQ15_pmsQ&oe=638FE004',
          id: '263012381947161'
        }
     */
    async getLikedMusic() {
        const options = {
            method: 'GET',
            url: 'https://graph.facebook.com/v15.0/me/music',
            params: {
                fields: 'name,id,created_time,category,cover',
                access_token: this.user.token
            }
        }
        const response = await axios.request(options);
        return response.data.data
    }

    /* returns array of objects [Object]
    */
    async getFriends(){
        const options = {
            method: 'GET',
            url: 'https://graph.facebook.com/v15.0/me/friends',
            params: {
                access_token: this.user.token
            }
        }
        const response = await axios.request(options);
        return response.data.data
    }
}

module.exports = ApiFacebook