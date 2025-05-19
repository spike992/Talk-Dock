//Vnos knjižnjic!
const express = require('express')
const app = express()

const { v4: uuidV4 } = require('uuid')
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
let ime = "";
const https = require('https');
const fs = require('fs');
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)


const privateKey = fs.readFileSync('/etc/letsencrypt/live/talkdock.duckdns.org/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/talkdock.duckdns.org/fullchain.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/talkdock.duckdns.org/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate, ca: ca};

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(3000, () => {
  console.log(`Server is running on port ${3000}`);
});

const io = require('socket.io').listen(httpsServer)

app.use(session({
  secret: 'dfcghgfhfhnfcxf',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.set('view engine', 'ejs')
app.use('/public', express.static('public'));

// MYSQL Povezava!
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'gaspr',
  password: 'your_password',
  database: 'talk_dock',
  port: '3306'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database!');
});
const table = `CREATE TABLE IF NOT EXISTS uporabniki (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ime VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  geslo VARCHAR(255) NOT NULL
  );`

connection.query(table, (err, result) =>{
  if (err){
    console.log(err);
  }
  else{
  }
})

//mysql zapis
app.get('/register', function(req, res) {
  res.render('register')
});

app.post('/register', function(req, res){
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const sql = `INSERT INTO uporabniki (ime, email, geslo) VALUES ('${username}', '${email}', '${password}')`;

  connection.query(sql, (err, result) => {
    if (err) {
      io.emit('registerFail', '');
    } else {
      res.redirect('/login');
    }
  });
});


app.post('/login', function(req, res){
  const username = req.body.user;
  const password = req.body.passw;
  const sql = `SELECT * FROM uporabniki WHERE ime = '${username}' AND geslo = '${password}'`;

  connection.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      req.session.user = username;

      ime = username;
      res.redirect('/roomjoin');
    } else {
      io.emit('userLoginResult', result.length);
      io.emit('loginFail', '');
    }
  });
});

function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    io.emit('prijavise', 'Prosim prijavi se!');
    res.redirect('/login');
  }
}


//podstrani
app.get('/', (req, res) => {
  res.redirect('/login')
})

app.get('/roomjoin', requireLogin, function(req, res) {
  res.render('roomjoin');
});

app.post('/roomjoin', requireLogin, function(req, res) {
  const koda1 = req.body.koda;
  res.redirect(`/room/${koda1}`);
});


app.get('/login', (req, res) => {
  res.render('login')
})

app.get('/room', requireLogin, (req, res) => {
  res.redirect(`/room/${uuidV4()}`)
})

app.get('/forgotpass', (req, res) =>{
  res.render('forgotpass');
});

app.get('/newpass', (req, res) =>{
  res.render('newpass');
});

app.post('/newpass', (req, res) =>{
  const mail = req.body.email;
  const geslo1 = req.body.password1;
  const geslo2 = req.body.password2;
  const sql = `UPDATE uporabniki SET geslo = '${geslo1}' WHERE email = '${mail}';`;
  if (geslo1 == geslo2){
    connection.query(sql, (err, result) => {
      if (err) {
        io.emit('spremembaFail', '');
      } else {
        res.redirect('/login');
      }
    });
  }
});

app.post('/forgotpass', (req, res) =>{
  const mail = req.body.email;
  const sql = `SELECT email from uporabniki where email = '${mail}';`;
  const msg = {
    to: mail, // Change to your recipient
    from: 'gapihokej@gmail.com', // Change to your verified sender
    subject: 'Spremenite geslo',
    text: 'Pojdite na http://localhost:3000/newpass, da zamenjate geslo!',
    html: '<strong>Pojdite na http://localhost:3000/newpass, da zamenjate geslo!</strong>',
  }
  connection.query(sql, (err, result) =>{
    if (err) throw err;
    if (result) {
      sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent')
        res.redirect('../login')
      })
      .catch((error) => {
        console.error(error)
      })
    } else {
      io.emit('mailneobstaja', mail)
    }
  })
})

app.get('/room/:room', requireLogin, (req, res) => {
  res.render('room', { roomId: req.params.room })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) =>{
    socket.join(roomId);
    socket.to(roomId).broadcast.emit('user-connected', userId);

    const imeFromServer = ime; // Set the value based on your server-side logic

    socket.emit('ime', imeFromServer); // Emit the value to the client


    socket.on('chat message', (data) => {
      console.log(data.ime);
      console.log(data.msg);
      io.emit('chat message', data);
    });

    socket.on('disconnect', () =>{
      socket.to(roomId).broadcast.emit('user-disconnected', userId);
    })
  })
});
app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/');
  });
});

