#!/usr/bin/env node
const fs = require('fs');
const {populateArtist} = require('../service/populate')
const args = process.argv.slice(2);
if (args.length != 1){
    console.log('Use as: ./populate-script.js /path/to/txt/file');
    process.exit();
}

const data = fs.readFileSync(args[0], {encoding:'utf8', flag:'r'});
data.split('\n').forEach((value, index, array) => {
    let [name, limitAlbum, limitSimilar] = value.split(';');
    limitAlbum = parseInt(limitAlbum) ? parseInt(limitAlbum) : 1;
    limitSimilar = parseInt(limitSimilar) ? parseInt(limitSimilar) : 0;
    populateArtist(name, limitAlbum, limitSimilar)
        .then(()=>console.log('Success for '+name))
        .catch(()=>console.log('Fail for '+name))
})