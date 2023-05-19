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
    image_link:{
        type: 'string',
        optional: 'true'
    }
}