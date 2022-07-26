const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex')

const db = knex({
  // Enter your own database information here based on what you created
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port: 5432,
    user : 'postgres',
    password : '1234',
    database : 'smart-brains',
    
  }
})

// const { Client } = require('pg')
// const db = new Client({
//   user: 'postgres',
//   host: '127.0.0.1',
//   database: 'smart-brains',
//   password: '1234',
//   // port:"5432"
 
// })
// db.connect(function(err) {
//   if (err){
//     console.log(err);
//     throw err;
//   }
//   console.log("Connected!");
// });

const app = express();
// console.log(app);
app.use(cors())
app.use(express.json()); // latest version of exressJS now comes with Body-Parser!

app.get("/check",(req,res) => {
  res.json("Connected");
})
app.get('/', (req, res)=> {
  // db.select("*").from("users");
  
})

app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  if(!email || !password){
    return res.status(400).json("incorrect form submission")
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if(!email || !name || !password){
    return res.status(400).json("incorrect form submission")
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            // If you are using knex.js version 1.0.0 or higher this now returns an array of objects. Therefore, the code goes from:
            // loginEmail[0] --> this used to return the email
            // TO
            // loginEmail[0].email --> this now returns the email
            email: loginEmail[0].email,
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    // In knex.js version 1.0.0 or higher this now returns an array of objects. Therefore, the code goes from:
    // entries[0] --> this used to return the entries
    // TO
    // entries[0].entries --> this now returns the entries
    res.json(entries[0].entries);
  })
  .catch(err => res.status(400).json('unable to get entries'))
})

app.listen(3000, ()=> {
  console.log('app is running');
})
