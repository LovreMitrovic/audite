const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const db = require('neode')
    .fromEnv();

db.withDirectory(__dirname+'/models');

db.model('user').relationship('friends_with', 'relationship', 'friends_with', 'direction_both', 'user', {});
db.model('artist').relationship('similar_artist', 'relationship', 'similar_artist', 'direction_both', 'artist', {});
db.model('track').relationship('similar_track', 'relationship', 'similar_track', 'direction_both', 'track', {});
db.model('album').relationship('similar_album', 'relationship', 'similar_album', 'direction_both', 'album', {});

db.model('artist').relationship('created_album', 'relationship', 'created_album', 'direction_out', 'album', {});
db.model('artist').relationship('created_track', 'relationship', 'created_track', 'direction_out', 'track', {});
db.model('album').relationship('contains_track', 'relationship', 'contains_track', 'direction_out', 'track', {});

db.model('user').relationship('likes', 'relationship', 'likes', 'direction_out', 'track', {});
db.model('user').relationship('likes', 'relationship', 'likes', 'direction_out', 'album', {});
db.model('user').relationship('likes', 'relationship', 'likes', 'direction_out', 'artist', {});


module.exports = db