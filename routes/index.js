let express = require('express');
let router = express.Router();
let low = require('lowdb');
let FileSync = require('lowdb/adapters/FileSync');
let validator = require('validator');

router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.post('/prereg', (req, res) => {
  const adapter = new FileSync('db.json');
  const db = low(adapter);

  db.defaults({ preregistrations: [], activation_links: [] })
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

    // Check if username is taken
    if(entry.username.toLowerCase() == req.body.username.toLowerCase()) {
      return res.status(400).json({"error": "Username already taken"});
    }

    // Check if email is taken
    if(entry.email.toLowerCase() == req.body.email.toLowerCase()) {
      return res.status(400).json({"error": "Email has already been used to preregister a username"});
    }

  }

  return res.send("went through");
  
});

module.exports = router;
