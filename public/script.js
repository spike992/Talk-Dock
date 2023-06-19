const socket = io('/')
const videoGrid = document.getElementById('video-grid')
let imeFromServer;
socket.on('ime', (ime1) => {
    imeFromServer = ime1;
});
const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
})
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream)

    myPeer.on('call', call =>{
        peers[call.peer] = call
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream =>{
            addVideoStream(video, userVideoStream)
        })
    })

    socket.on('user-connected', (userId) => {
        connectToNewUser(userId, stream)
    })
})
.catch(error => {
    // Handle permission error or provide feedback to the user
    console.error('Error accessing microphone and camera:', error);
  });

var messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');

form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value) {
      console.log(input.value);
      socket.emit('chat message', { ime: imeFromServer, msg: input.value });
    }
  });
  
  

socket.on('chat message', (data) => {
    console.log(data.ime);
    console.log(data.msg);
    var item = document.createElement('li');
    item.textContent = `${data.ime}: ${data.msg}`;
    messages.appendChild(item);
});


socket.on('user-disconnected', userId =>{
    if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id)
})



function addVideoStream(video, stream)
{
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
}

function connectToNewUser(userId, stream){
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream =>{
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        video.remove()
    })


    peers[userId] = call
}