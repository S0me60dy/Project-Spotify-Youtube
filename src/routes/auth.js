import { Router } from "express"
import passport from 'passport'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()
import session from "express-session"


const router = Router();

router.use(session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: true, 
    cookie: { secure: false }
}))


router.get('/google', passport.authenticate('google'), (req, res) => res.send(200));
router.get('/callback', passport.authenticate('google'), (req,res) => res.redirect('/api/auth/search'));
router.get('/search', async (req, res) => {
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

router.get('/playlist', async (req, res) => {
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

router.get('/put-items', async (req, res) => {
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

export default router;