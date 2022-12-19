const db = require("../db/db");
const like = (req, res) => {
    let like = req.body.value;//boolean
    let label = req.params.label;
    let isLabelValid = label === 'track' || label === 'artist' || label === 'album';
    const id = req.params.id;
    if(!isLabelValid){
        res.status(400).send('Value param can only be true or false. Label param can only be track, artist or album');
        return
    }
    const pUser = db.first('user','fid', req.user.fid);
    const pEntity = db.findById(label,id);//can be track artist or album

    Promise.all([pUser, pEntity])
        .then(([user, entity]) => {

            if(like){
                user.relateTo(entity,'likes')
                    .then(()=>res.send({message:'liked', link:`/${label}/${id}`}))
            } else {
                user.detachFrom(entity)
                    .then(()=>res.send({message:'unliked', link:`/${label}/${id}`}))
            }
        })
}

module.exports = {like}