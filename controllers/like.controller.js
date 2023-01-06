const db = require("../db/db");
const like = (req, res) => {
    let like = req.body.value;//boolean
    let label = req.params.label;
    const id = req.params.id;
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