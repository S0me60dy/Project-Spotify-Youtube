import express from "express"
import bodyParser from "body-parser"
import queryString from 'query-string'
import axios from 'axios'
import cors from "cors"
import session from "express-session"
import router from "./routes/get_playlists.js"
import getTracksRouter from './routes/get_tracks.js'
import dotenv from 'dotenv'

dotenv.config();

const app = express();
const port = 5000;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${port}/callback`
const AUTH_URL = "https://accounts.spotify.com/authorize"
const TOKEN_URL = "https://accounts.spotify.com/api/token"

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({extended:true}));
app.use(router);
app.use(getTracksRouter);
app.use(cors());
app.use(express.static('public'));
app.use(session({
    secret: '123',
    saveUninitialized: false,
    resave: true, 
    cookie: { secure: false }
}));



app.get("/", (req, res) => {
    res.send(`Welcome to my app, <a href='/login'>Login screen</a>`);
})

app.get("/login", (req, res) => {
    let scope = "user-read-private user-read-email";
    let state = generateRandomString(16);

    res.redirect(`${AUTH_URL}?${queryString.stringify(
        {
            response_type: "code",
            client_id: client_id,
            scope: scope,
            redirect_uri: REDIRECT_URI,
            state: state
        }
    )}`);
})

app.get('/callback', async (req, res) => {
    
    const code = req.query.code;

    await axios.post(
        TOKEN_URL,
        new URLSearchParams({
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI,
            'code': code
        }).toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
                'grant_type': 'client_credentials'
            },
            auth: {
                username: client_id,
                password: client_secret
            }
        })
        .then(resp1 => {
            req.session.accessToken = resp1.data.access_token;
            req.session.refreshToken = resp1.data.refresh_token;
            //console.log(req.session.accessToken);
            return res.redirect('/playlists');
        });
})

function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})

export default router;