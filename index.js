const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const phpExpress = require('php-express')({
  binPath: 'php'
});

app.set('views', __dirname + '/views');
app.engine('php', phpExpress.engine);
app.set('view engine', 'php');

app.all(/.+\.php$/, phpExpress.router);

app.set('view engine', 'ejs')
app.use('/public', express.static('public'));



app.get('/', (req, res) => {
  res.redirect('/login')
})

app.get('/room', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/login', (req, res) => {
  res.render('login')
})

app.get('/register', (req, res) =>{
  res.render('register')
})

app.get('/:room', (req, res) => {
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