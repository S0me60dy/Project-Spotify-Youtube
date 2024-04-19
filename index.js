import express from "express"
import bodyParser from "body-parser"
import queryString from 'query-string'
import axios from 'axios'
import cors from "cors"
import session from "express-session"


const app = express();
const port = 5000;

const client_id = "c8c7c9e55b8643d2aafe5836521054ec";
const client_secret = "8dd6666c0de84430b47af93bb1005fcd";
const REDIRECT_URI = `http://localhost:${port}/callback`
const AUTH_URL = "https://accounts.spotify.com/authorize"
const TOKEN_URL = "https://accounts.spotify.com/api/token"
const API_BASE_URL = "https://api.spotify.com/v1"

app.set('view engine', 'ejs')
app.set('views', 'views');

app.use(bodyParser.urlencoded({extended:true}));
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

app.get('/playlists', async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).send('No access token available');
    }
    
    

    try {
        await axios.get(`${API_BASE_URL}/me/playlists`, {
            headers: {
              Authorization: 'Bearer ' + req.session.accessToken
            }
          })
        .then(resp2 => {
            //res.send(JSON.stringify(resp2.data.items));
            req.session.playlists = resp2.data.items.map(item => ({
                id: item.id,
                name: item.name
            }));

            res.render('index.ejs', { playlists: req.session.playlists });
            //res.redirect('/playlist-tracks');
        })
    } catch (error) {
        console.error('Error accessing Spotify API', error);
        res.status(500).send('Failed to fetch playlists');
    }
})

app.get('/playlist-tracks/:playlistId', async (req, res) => {

    if (!req.session.playlists){
        return res.status(401).send('No playlists received');
    }

    const playlistId = req.params.playlistId;

    try{
        await axios.get(`${API_BASE_URL}/playlists/${playlistId}/tracks`, {
            headers: {
              Authorization: 'Bearer ' + req.session.accessToken
            }
          })
        .then(resp3 => {
            //res.send(JSON.stringify(resp3.data.items[0]));

            req.session.tracks = resp3.data.items.map(item => ({
                name: item.track.name,
                artist: item.track.artists.map(artist => artist.name).join(', ')
            }));

            //console.log(req.session.tracks);
            
            res.render('tracks.ejs', {tracks: req.session.tracks});
        })
    } catch(error){
        console.error('Error accessing Spotify API', error);
        res.status(500).send('Failed to fetch tracks');
    }
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