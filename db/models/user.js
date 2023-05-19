module.exports = {
    fid: {
        type: 'string',
        unique: 'true', // Creates a Unique Constraint
    },
    email:'string',
    last_name:'string',
    first_name:'string',
    middle_name:{
        type:'string',
        optional: true
    },
    token:'string',
    photo:'string',
    age:'integer'
}