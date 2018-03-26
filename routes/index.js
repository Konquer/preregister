const express = require('express');
const router = express.Router();
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const validator = require('validator');
const cryptoRandomString = require('crypto-random-string');
const shortid = require('shortid');
const config = require('../config');
const mailgun = require('mailgun-js')({apiKey: config.mailgun.api_key, domain: config.mailgun.domain});

router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.post('/prereg', (req, res) => {
  const adapter = new FileSync('db.json');
  const db = low(adapter);

  db.defaults({ preregistrations: [] })
  .write();

  // Check if username and email was sent
  if(!req.body.username || !req.body.email) {
    return res.status(400).json({"error": "Username and email must be set"});
  }

  // Check if the email is valid
  if(!validator.isEmail(req.body.email)) {
    return res.status(400).json({"error": "Email is not in a valid format"});
  }

  // Check if the username is valid
  if(!req.body.username.match(/^\w+-?\w+(?!-)$/) || req.body.username.length < 3 || req.body.username > 15){
    return res.status(400).json({"error": "Username contains illegal characters, is formatted in an illegal way or is too short/long"});
  }

  let entries = db.get("preregistrations").value();

  // Loop through all our preregistrations
  for(let i = 0; i < entries.length; i++) {
    
    let entry = entries[i];

    // Only check against verified preregistrations
    if(entry.verified) {

      // Check if username is taken
      if(entry.username.toLowerCase() == req.body.username.toLowerCase()) {
        return res.status(400).json({"error": "Username already taken"});
      }

      // Check if email is taken
      if(entry.email.toLowerCase() == req.body.email.toLowerCase()) {
        return res.status(400).json({"error": "Email has already been used to preregister a username"});
      }

    } else {

      // If this email has already tried preregistering this username
      if(entry.username.toLowerCase() == req.body.username.toLowerCase() && entry.email.toLowerCase() == req.body.email.toLowerCase()) {
        return res.status(400).json({"error": "You have already requested to preregister this username. Please check your email for a verification link."});
      }

    } 

  }

  // Generate a verification link
  let rndstr = cryptoRandomString(100);
  
  db.get('preregistrations')
  .push({
    username: req.body.username,
    email: req.body.email,
    link: rndstr,
    token: shortid.generate(),
    verified: false
  })
  .write();

  // Send email
  let maildata = {
    from: 'Test sender <preregister@noreply.ubbo.no>',
    to: 'slungaards@gmail.com',
    subject: 'Hello3',
    text: 'Bob :) <b>test</b>'
  };

  mailgun.messages().send(maildata, function (error, body) {
    if(error) {
      res.status(400).json({"error": "Failed to send email"});
    } else {
      res.status(200).json({"success": "You successfully preregistered! An email has been sent to " + req.body.email + " with further instructions."});
    }
  });
  
});

router.get('/activate/:link', (req, res, next) => {

  const adapter = new FileSync('db.json');
  const db = low(adapter);

  db.defaults({ preregistrations: [] })
  .write();

  let entries = db.get("preregistrations").value();

  // Loop through all our preregistrations
  for(let i = 0; i < entries.length; i++) {

    let entry = entries[i];

    // If the link exists
    if(entry.link == req.params.link) {
      
      if(entry.verified) {
        return res.status(400).json({"error": "This activation link has already been verified"});
      }

      entry.verified = true;
      db.write();

      // TODO: Send new email

      return res.status(200).json({"success": "You successfully locked the username " + entry.username});
    }

  }

  return res.status(400).json({"error": "Activation link not found"});

});

module.exports = router;
