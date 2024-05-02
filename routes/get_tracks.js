// will contain my get_tracks request to Spotify Web Api after playlist info has been received

import express from "express"
import axios from "axios"
import session from "express-session";

const getTracksRouter = express.Router()

getTracksRouter.use(session({
    secret: '123',
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

            //console.log(req.session.tracks);

            res.render('tracks.ejs', {tracks: req.session.tracks});
        })
    } catch(error){
        console.error('Error accessing Spotify API', error);
        res.status(500).send('Failed to fetch tracks');
    }
})

export default getTracksRouter;