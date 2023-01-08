require('dotenv').config()
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
const approuter = require('./routes/router');
const bodyParser = require('body-parser');

const session = require('express-session');
const { Cookie } = require('express-session');

const app = express();

const neo4jSessionStore = require('neo4j-sessionstore');

// static files (for css, images, etc)
app.use(express.static(__dirname + '/public'));

//decalare middlewares
app.set('view engine', 'ejs');

//body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
	secret:process.env.SESSION_SECRET,
	store: new neo4jSessionStore({
		table: {
			name: "sessions",
			hashKey: "sessionId",
			hashPrefix: "sessions:",
		},
		neo4jConfig: {
			neo4jurl: process.env.NEO4J_URL,
			neo4juser: process.env.NEO4J_USER,
			neo4jpwd: process.env.NEO4J_PASSWORD,
		},
		touchInterval: 0,
	}),
	resave: true,
	saveUninitialized: true,
	cookie:{
		secure: true,
		maxAge: 1000 * 60 * 60 * 24
	}}));

const passport = require('./service/passport-facebook')
app.use(passport.initialize());
app.use(passport.session());

app.use(approuter)

/* GET React App */
app.use(function(req, res, next) {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
 });

const httpsOptions = {
	cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem')),
	key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
}

https.createServer(httpsOptions, app).listen(3000, ()=>{
	console.log('App listeing')
});