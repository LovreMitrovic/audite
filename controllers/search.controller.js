const db = require("../db/db");
const toNumber = require("../utils/toNumber");
const getSearch = (req, res) => {
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const filter = req.query.filter ? req.query.filter.toLowerCase() : '';

    if(limit > 100 || limit < 1 || skip < 0 || !filter){
        res.status(400).send('Limit needs to be between 1 and 100, skip needs to be positive and filter needs to be present');
    }
    const pEntities = db.query().match('this')
        .where(`toLower(this.name) contains "${filter}" AND labels(this) in [['artist'],['album'],['track']]`)
        .return('id(this)','this.name','labels(this)')
        .orderBy('this.name')
        .skip(skip)
        .limit(limit).execute();
    const pCount = db.query().match('this')
        .where(`toLower(this.name) contains "${filter}" AND labels(this) in [['artist'],['album'],['track']]`)
        .return('count(this)').execute()

    Promise.all([pEntities, pCount])
        .then( ([qEntities,qCount]) => {
            const entities = qEntities.records.map((r) => ({
                name: r.get('this.name'),
                label: r.get('labels(this)')[0],
                link: `/${r.get('labels(this)')[0]}/${r.get('id(this)')}`
            }))
            const count = toNumber(qCount.records[0].get('count(this)'));
            if(skip >= count){
                res.status(404)
            }
            res.send({
                data: entities,
                _links: {
                    next: skip+limit <= count
                        //izbrisi filter
                        ? `/search/?limit=${limit}&skip=${skip+limit}&filter=${filter}`
                        : null,
                    back: skip-limit >= 0
                        ? `/search/?limit=${limit}&skip=${skip-limit}&filter=${filter}`
                        : null,
                    count
                },
                _filter: filter ? filter : null
            })
        })
}

module.exports = {getSearch}