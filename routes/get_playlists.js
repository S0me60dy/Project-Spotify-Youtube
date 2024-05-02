// will contain my get_playlist request to Spotify Web Api

import express from "express"
import axios from "axios"
import session from "express-session";

const router = express.Router()
router.use(session({
    secret: '123',
    saveUninitialized: false,
    resave: true, 
    cookie: { secure: false }
}));
const API_BASE_URL = "https://api.spotify.com/v1"

router.get('/playlists', async (req, res) => {
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

export default router;