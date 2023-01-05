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
    duration:{
        type: 'integer',
        optional:'true'
    },
    listeners:{
        type: 'integer',
        optional:'true'
    },
    rank:{
        type: 'integer',
        optional:'true'
    },
    image_link:{
        type: 'string',
        optional: 'true'
    },
    lyrics:{
        type: 'string',
        optional: 'true'
    }
}
