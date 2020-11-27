const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-account.json');
const socket = require("socket.io");
const io = socket(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ["GET", "POST"]
  }
});

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

// ROUTES
app.post('/add-caller-candidates', async (req, res) => {
  try {
    const roomRef = await db.collection('rooms').doc(req.body.room);
    const callerCandidates = roomRef.collection('callerCandidates');
    callerCandidates.add(req.body.candidate);

    res.json(callerCandidates);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/add-callee-candidates', async (req, res) => {
  try {
    const roomRef = await db.collection('rooms').doc(req.body.room);
    const calleeCandidates = roomRef.collection('calleeCandidates');
    calleeCandidates.add(req.body.candidate);

    res.json(calleeCandidates);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/add-room-reference', async (req, res) => {
  try {
    const roomRef = await db.collection('rooms').doc();
    roomRef.set(req.body.data);

    res.json(roomRef.id);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/update-room-reference', async (req, res) => {
  try {
    const roomRef = await db.collection('rooms').doc(req.body.room);
    await roomRef.update(req.body.data);

    res.json(roomRef);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.get('/join-room-reference/:id', async (req, res) => {
  try {
    const roomRef = await db.collection('rooms').doc(req.params.id);
    const roomSnapshot = await roomRef.get();

    res.json({ offer: roomSnapshot.data().offer, exists: roomSnapshot.exists });
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/delete-room-reference', async (req, res) => {
  try {
    const roomRef = db.collection('rooms').doc(req.body.room);
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    calleeCandidates.forEach(async candidate => {
      await candidate.ref.delete();
    });
    const callerCandidates = await roomRef.collection('callerCandidates').get();
    callerCandidates.forEach(async candidate => {
      await candidate.ref.delete();
    });
    await roomRef.delete();

    res.status(200).send();
  } catch (err) {
    res.status(400).send(err);
  }
});

// SOCKET
// socket.io is used to send realtime updates to client when onSnapShot is fired
io.on('connection', socket => {
  console.log('connected');

  socket.on('create room', ({ room }) => {
    const roomRef = db.collection('rooms').doc(room);
    roomRef.onSnapshot(snapshot => {
      io.emit('caller snapshot', snapshot.data());
    });
    roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          io.emit('callee snapshot', change.doc.data());
        }
      });
    });
  })

  socket.on('join room', async ({ room }) => {
    const roomRef = await db.collection('rooms').doc(room);
    roomRef.collection('callerCandidates').onSnapshot(snapshot => {
      io.emit('caller snapshot v2', snapshot.docChanges());
    });
  })

  socket.on('disconnect', () => {
    console.log('disconnected')
  });

});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
