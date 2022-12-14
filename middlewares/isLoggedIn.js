function isLogged(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }
    //res.status(401).send('Not Logged In');
    res.render('index',{auth:false,user:null})
}

module.exports = isLogged