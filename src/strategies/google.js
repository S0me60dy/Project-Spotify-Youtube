import passport from "passport"
import { Strategy as GoogleStrategy} from 'passport-google-oauth20'
import dotenv from 'dotenv'
import session from "express-session";

dotenv.config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: process.env.GOOGLE_REDIRECT_URL, 
    scope: [
      'https://www.googleapis.com/auth/userinfo.email', 
      'https://www.googleapis.com/auth/userinfo.profile', 
      'https://www.googleapis.com/auth/youtube'
    ]
}, async (accessToken , refreshToken, profile, done) => {
    session.access_token = accessToken;
    session.username = profile.displayName;
    done(null, {username: profile.displayName});
} ));

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });