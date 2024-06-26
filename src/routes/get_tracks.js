// will contain my get_tracks request to Spotify Web Api after playlist info has been received

import express from "express"
import axios from "axios"
import session from "express-session"
import dotenv from 'dotenv'
import passport from "passport"
import bodyParser from "body-parser"
import authRoutes from "./auth.js"
await import('../strategies/google.js')

dotenv.config();
const app = express();


app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/auth',authRoutes);

const getTracksRouter = express.Router()

getTracksRouter.use(session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: true, 
    cookie: { secure: false }
}));

const API_BASE_URL = "https://api.spotify.com/v1"


getTracksRouter.get('/playlist-tracks/:playlistId', async (req, res) => {

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

            res.render('tracks.ejs', {tracks: req.session.tracks});
        })
    } catch(error){
        console.error('Error accessing Spotify API', error);
        res.status(500).send('Failed to fetch tracks');
    }
})

getTracksRouter.post('/save-tracks', (req, res) => {
    const selectedTracks = req.body.selectedTracks || [];
    // Ensure selectedTracks is always an array
    session.selectedTracks = selectedTracks.map(trackString => {
        const [name, artist] = trackString.split(',');
        return { name, artist };
    });
    console.log(session.selectedTracks);
    res.redirect('/api/auth/'); // Redirect or handle the flow as needed
});

getTracksRouter.get('/api/auth', (req, res) => {
    res.send(`Welcome to my app, <a href='/api/auth/google'>Login screen</a>`)
})

getTracksRouter.get('/api/auth/google', passport.authenticate('google'), (req, res) => res.send(200));
getTracksRouter.get('/api/auth/callback', passport.authenticate('google'), (req,res) => res.redirect('/api/auth/search'));
getTracksRouter.get('/api/auth/search', async (req, res) => {
    if(!session.access_token){
        return res.status(401).send('No access token available');
    }


    try{
        //console.log(process.env.GOOGLE_API_KEY);
        //console.log(session.access_token);

        axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                maxResults: 1,
                q: 'Sabaton The Last Stand',
                type: 'video',
                key: process.env.GOOGLE_API_KEY  
            }
        })
        .then(response => {
            session.track_id = response.data.items[0].id.videoId;
            console.log(session.track_id);
            res.redirect('/api/auth/playlist');
        }) 
    }catch(error) {
        console.error(error);
        }
}) 

getTracksRouter.get('/api/auth/playlist', async (req, res) => {
    if (!session.access_token) {
        return res.status(401).send('No access token available');
    }

    try {
        const response = await axios.post('https://youtube.googleapis.com/youtube/v3/playlists?part=snippet,status', {
            snippet: {
                title: 'Songs from Spotify',
                description: 'New playlist with the songs from Spotify'
            },
            status: {
                privacyStatus: 'private'
            }
        }, {
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
       
        session.playlist = response.data.id;
        console.log(session.playlist);
        res.redirect('/api/auth/put-items');
    } catch (error) {
        console.error(error); 
        console.log(session.access_token);
        res.status(error.response.status).send(error.response.data);
    }

});

getTracksRouter.get('/api/auth/put-items', async (req, res) => {
    if(!session.access_token){
        return res.status(401).send('No access token available');
    }
    console.log(session.access_token);
    try{
        const response = await axios.post('https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails,id,snippet,status', 
        {
            "snippet": {
              "playlistId": session.playlist,
              "resourceId": {
                "videoId": session.track_id,
                "kind": "youtube#video"
              }
            },
            "status": {
              "privacyStatus": "private"
            }   
        }, {
            headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        console.log(response.data);
        res.send(response.data);
    }catch(error) {
        res.status(error.response.status).send(error.response.data);
        // res.send
    }
})


export default getTracksRouter;