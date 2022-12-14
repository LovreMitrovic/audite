module.exports = {
    mbid: {
        type: 'string',
        optional: 'true',
        required: false
    },
    name:{
        type: 'string',
        unique: 'true',
    },
    playcount:{
        type: 'integer',
        optional:'true'
    },
    image_link:{
        type: 'string',
        optional: 'true'
    }
}
