const axios = require("axios");
require('dotenv').config()
const instance = require('neode')
    .fromEnv();

const api = require('./service/api-lastfm');
const imageapi = require('./service/api-coverart');
const db = require('./db/db');
const {connectWithFriends } = require('./service/populate');
const {fid} = require("./db/models/user");


/*async function main(){
    const id = 157;
    console.log(user.get('likes'))
    /*const c = await db.query()
        .match('this','user')
        .relationship('likes','out','rel')
        .to('other','artist')
        .where('this.fid',fid)
        .return('other').execute();
    const c = await db.query()
        .match('this','artist')
        .relationship('created_album','out','rel')
        .to('other','album')
        .whereId('this',157)
        .return('other')
        .execute();
    console.log(c.records.map((r)=> r.get('other').properties.name));
}
*/
const apiimage = require('./service/api-coverart');
async function main(){
    const query =  await db.cypher(`MATCH (n:album) where n.image_link is not null return n`)
    const nodes = query.records.map((r) => r.get('n'));
    for (node of nodes){
        let id = node.identity.low;
        const album = await db.findById('album',id);
        const image_link = await apiimage.getCover(node.properties.mbid)
        console.log(image_link)
        await album.update({image_link})
    }
}

main().then(()=>console.log('OK'))


//populateArtist('Jennifer Lopez',2).then(()=>console.log('end'))
/*
db.cypher('MATCH (m:artist)-[:created_album]->(n:album) where m.name=\'AC/DC\' RETURN n LIMIT 25')
    .then((e)=> {
        for(r of e.records){
            //console.log(r._fields[0].properties)
            console.log(r._fields[0])
        }
    })

db.query().
/*
db.query().match('a','artist')
    .where('a.name', 'Magazin')
    .return('a')
    .execute()
    .then((r) => console.log(r))*/
/*
Artist.getByName('Magazin').then(
    (artist)=>{
        artist.save({image_link:'mbid0'})
            .then((x)=>console.log(x))
    }
)*/

/*
const db = require('./db/db');

db.all('artist').then((collection)=>{
    for (var node of collection){
        console.log(node.get('name'))
        imageapi.getCover(node.get('mbid'))
            .then((image_link)=>{
                console.log('then'+node.get('name'))
                //node.update({image_link})
            })
            .catch((e)=>console.log('error'+node.get('name')))


    }
})
*/
