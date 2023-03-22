//Vnos knjižnjic!
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

// MYSQL Povezava!
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'gaspr',
  password: 'gasper991',
  database: 'talk_dock'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database!');
});

//mysql zapis
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/register', function(req, res) {
  res.render('register')
});
app.post('/register', function(req, res) {
  const ime = req.body.username;
  const email = req.body.email;
  const geslo = req.body.password;
  const sql = `INSERT INTO uporabniki (ime, email, geslo) VALUES ('${ime}', '${email}', '${geslo}')`;

  connection.query(sql, (err, result) => {
    if (err) throw err;
    console.log(`New user created with username ${ime}`);
    res.send(`New user created with username ${ime}`);
  });
});

app.post('/login', function(req, res){
  const ime = req.body.user;
  const geslo = req.body.passw;
  const sql = `SELECT * FROM uporabniki WHERE ime = '${ime}' AND geslo = '${geslo}'`;

  connection.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.redirect('/roomjoin');
    } else {
      io.emit('userLoginResult', result.length);
    }
  });
});


app.set('view engine', 'ejs')
app.use('/public', express.static('public'));


//podstrani
app.get('/', (req, res) => {
  res.redirect('/login')
})

app.get('/roomjoin', (req, res) => {
  res.render('roomjoin');
});

app.post('/roomjoin', function(req, res) {
  const koda1 = req.body.koda;
  res.redirect(`/room/${koda1}`);
});


app.get('/login', (req, res) => {
  res.render('login')
})

app.get('/room', (req, res) => {
  res.redirect(`/room/${uuidV4()}`)
})

app.get('/room/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) =>{
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

    socket.on('disconnect', () =>{
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

server.listen(3000)