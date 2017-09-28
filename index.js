'use strict';

const Twit = require('twit');
const promptly = require('promptly');
const fs = require('fs');

const consumer_key = process.env.TWITTER_KEY;
const consumer_secret = process.env.TWITTER_SECRET;

var TwitterPinAuth = require('twitter-pin-auth');

const target_user = process.argv[2];

let have_credentials = Promise.resolve();

if ( ! fs.existsSync('credentials.json')) {
  let twitterPinAuth = new TwitterPinAuth(consumer_key, consumer_secret, target_user, false);

  have_credentials = twitterPinAuth.requestAuthUrl()
      .then(function(url) {
          console.log(url);
      }).catch(function(err) {
          console.error(err);
      })
      .then( () => {
        return promptly.prompt('Pin:');
      }).then(key => {
        return twitterPinAuth.authorize(key);
      });

  have_credentials.then( creds => {
    fs.writeFileSync('credentials.json', JSON.stringify(creds));
  });
} else {
  have_credentials = Promise.resolve(require('./credentials.json'));
}

have_credentials.then(credentials => {
  let access_token = credentials.accessTokenKey;
  let access_secret = credentials.accessTokenSecret;
  var T = new Twit({
    consumer_key: consumer_key, 
    consumer_secret: consumer_secret,
    access_token: access_token,
    access_token_secret: access_secret
  }); 

  var stream = T.stream('statuses/filter', { track: `@${target_user}` });
  stream.on('tweet', tweet => console.log(tweet.text));
  stream.on('error', err => console.log(err));
});


