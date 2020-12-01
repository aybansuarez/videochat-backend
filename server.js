const express = require('express');
const db = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const socket = require("socket.io");
const Room = require('./models/room');
const Caller = require('./models/caller');
const Callee = require('./models/callee');

dotenv.config();

const io = socket(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

// DATABASE
db.connect(process.env.MONGODB_URI, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
})
  .then(() => {
    console.log('MongoDB database connection established successfully');
    server.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => console.log(err));

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

// ROUTES
app.post('/add-caller-candidates', async (req, res) => {
  try {
    const caller = new Caller({
      room: db.Types.ObjectId(req.body.room),
      ...req.body.candidate
    })

    res.json(caller);
  } catch (err) {
    res.status(400).send(err);
  }
});

// app.post('/add-callee-candidates', async (req, res) => {
//   try {
//     const roomRef = await db.collection('rooms').doc(req.body.room);
//     const calleeCandidates = roomRef.collection('calleeCandidates');
//     calleeCandidates.add(req.body.candidate);

//     res.json(calleeCandidates);
//   } catch (err) {
//     res.status(400).send(err);
//   }
// });

app.post('/add-room-reference', async (req, res) => {
  try {
    const room = new Room(req.body.data)
    await room.save();

    res.json(room._id);
  } catch (err) {
    res.status(400).send(err);
  }
});

// app.post('/update-room-reference', async (req, res) => {
//   try {
//     const roomRef = await db.collection('rooms').doc(req.body.room);
//     await roomRef.update(req.body.data);

//     res.json(roomRef);
//   } catch (err) {
//     res.status(400).send(err);
//   }
// });

// app.get('/join-room-reference/:id', async (req, res) => {
//   try {
//     const roomRef = await db.collection('rooms').doc(req.params.id);
//     const roomSnapshot = await roomRef.get();

//     res.json({ offer: roomSnapshot.data().offer, exists: roomSnapshot.exists });
//   } catch (err) {
//     res.status(400).send(err);
//   }
// });

// app.post('/delete-room-reference', async (req, res) => {
//   try {
//     const roomRef = db.collection('rooms').doc(req.body.room);
//     const calleeCandidates = await roomRef.collection('calleeCandidates').get();
//     calleeCandidates.forEach(async candidate => {
//       await candidate.ref.delete();
//     });
//     const callerCandidates = await roomRef.collection('callerCandidates').get();
//     callerCandidates.forEach(async candidate => {
//       await candidate.ref.delete();
//     });
//     await roomRef.delete();

//     res.status(200).send();
//   } catch (err) {
//     res.status(400).send(err);
//   }
// });

// SOCKET
// socket.io is used to send realtime updates to client when onSnapShot is fired
io.on('connection', socket => {
  console.log('connected');

  socket.on('create room', async ({ roomId }) => {
    try {
      const roomStream = Room.watch({ $match: { _id: roomId } });
      roomStream.on('change', (change) => {
        io.emit('caller snapshot', change);
      });
    } catch (err) {
      console.log(err)
    }
    // roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    //   snapshot.docChanges().forEach(change => {
    //     if (change.type === 'added') {
    //       io.emit('callee snapshot', change.doc.data());
    //     }
    //   });
    // });
  })

  // socket.on('join room', async ({ room }) => {
  //   const roomRef = await db.collection('rooms').doc(room);
  //   roomRef.collection('callerCandidates').onSnapshot(snapshot => {
  //     io.emit('caller snapshot v2', snapshot.docChanges());
  //   });
  // })

  socket.on('disconnect', () => {
    console.log('disconnected')
  });

});
