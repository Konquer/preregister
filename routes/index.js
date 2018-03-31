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

  res.render('index', { title: 'Preregister' });

});

router.post('/prereg', (req, res) => {
  const adapter = new FileSync('db.json');
  const db = low(adapter);

  db.defaults({ preregistrations: [] })
  .write();

  // Check if username and email was sent
  if(!req.body.username || !req.body.email) {
    return res.status(400).json({"error": config.outputs.errors.missing_input});
  }

  // Check if the email is valid
  if(!validator.isEmail(req.body.email)) {
    return res.status(400).json({"error": config.outputs.errors.email_invalid});
  }

  // Check if the username is valid
  if(!req.body.username.match(/^\w+-?\w+(?!-)$/) || req.body.username.length < 3 || req.body.username > 15){
    return res.status(400).json({"error": config.outputs.errors.username_invalid});
  }

  let entries = db.get("preregistrations").value();

  // Loop through all our preregistrations
  for(let i = 0; i < entries.length; i++) {

    let entry = entries[i];

    // Check if this IP address have already preregistered
    if(config.ip_restricted) {
      return res.status(400).json({"error": config.outputs.errors.ip_used});
    }

    // Only check against verified preregistrations
    if(entry.verified) {

      // Check if username is taken
      if(entry.username.toLowerCase() == req.body.username.toLowerCase()) {
        return res.status(400).json({"error": config.outputs.errors.username_taken});
      }

      // Check if email is taken
      if(entry.email.toLowerCase() == req.body.email.toLowerCase()) {
        return res.status(400).json({"error": config.outputs.errors.email_already_used});
      }

    } else {

      // If this email have already tried preregistering this username
      if(entry.username.toLowerCase() == req.body.username.toLowerCase() && entry.email.toLowerCase() == req.body.email.toLowerCase()) {
        return res.status(400).json({"error": config.outputs.errors.already_asked_for_username});
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
    verified: false,
    ip: req.connection.remoteAddress
  })
  .write();

  // Send email
  let maildata = {
    from: config.mail_templates.verification_sent.from,
    to: req.body.email,
    subject: config.mail_templates.verification_sent.subject.replace("#{username}", req.body.username).replace("#{email}", req.body.email).replace("#{link}", rndstr),
    text: config.mail_templates.verification_sent.html_disabled_text,
    html: config.mail_templates.verification_sent.body.replace("#{username}", req.body.username).replace("#{email}", req.body.email).replace("#{link}", rndstr)
  };

  mailgun.messages().send(maildata, function (error, body) {
    if(error) {
      res.status(400).json({"error": config.outputs.errors.mailgun_error});
    } else {
      res.status(200).json({"success": config.outputs.success.preregistered.replace("#{email}", req.body.email)});
    }
  });

});

router.get('/activate/:link', (req, res, next) => {

  const adapter = new FileSync('db.json');
  const db = low(adapter);
  let found = false;

  db.defaults({ preregistrations: [] })
  .write();

  let entries = db.get("preregistrations").value();

  // Loop through all our preregistrations
  for(let i = 0; i < entries.length; i++) {

    let entry = entries[i];

    // If the link exists
    if(entry.link == req.params.link) {
      found = true;

      if(entry.verified) {
        return res.status(400).json({"error": config.outputs.errors.already_verified});
      }

      entry.verified = true;
      db.write();

      // Send email
      let maildata = {
        from: config.mail_templates.preregister_activated.from,
        to: entry.email,
        subject: config.mail_templates.preregister_activated.subject.replace("#{username}", entry.username).replace("#{email}", entry.email).replace("#{link}", entry.link).replace("#{token}", entry.token),
        text: config.mail_templates.preregister_activated.html_disabled_text,
        html: config.mail_templates.preregister_activated.body.replace("#{username}", entry.username).replace("#{email}", entry.email).replace("#{link}", entry.link).replace("#{token}", entry.token)
      };

      mailgun.messages().send(maildata, function (error, body) {
        if(error) {
          res.status(400).json({"error": config.outputs.errors.mailgun_error});
        } else {
          // replace the render below with this if we want to use it as an api
          // res.status(200).json({"success": config.outputs.success.verified.replace("#{username}", entry.username)});
        }
      });

      return res.render('activated', {
        username: entry.username,
        token: entry.token
      });

    }

  }

  if(!found)
    return res.json({"error": config.outputs.errors.link_not_found});

});

module.exports = router;
