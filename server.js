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
app.post('/add-callers', async (req, res) => {
  try {
    const caller = new Caller({
      room: db.Types.ObjectId(req.body.room),
      ...req.body.candidate
    })
    await caller.save();
    res.json(caller);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/add-callees', async (req, res) => {
  try {
    const callee = new Callee({
      room: db.Types.ObjectId(req.body.room),
      ...req.body.candidate
    })
    await callee.save();
    res.json(callee);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/create-room', async (req, res) => {
  try {
    const room = new Room()
    await room.save();

    res.json(room._id);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/set-room-offer/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    room.offer = req.body.data;
    await room.save();
    res.json(room._id);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/set-room-answer', async (req, res) => {
  try {
    const room = await Room.findById(req.body.room);
    room.answer = req.body.data;
    await room.save();
    res.json(room._id);
  } catch (err) {
    res.status(400).send(err);
  }
});

app.get('/join-room/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    res.json({ offer: room.offer });
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/delete-room', async (req, res) => {
  try {
    await Callee.deleteMany({ room: req.body.room });
    await Caller.deleteMany({ room: req.body.room });
    await Room.findByIdAndDelete(req.body.room);
    console.log('yes')
    res.status(200).send()
  } catch (err) {
    res.status(400).send(err);
  }
});

// SOCKET
// socket.io is used to send realtime updates to client when onSnapShot is fired
io.on('connection', socket => {
  socket.on('create room', ({ roomId }) => {
    try {
      const roomStream = Room.watch({ $match: { _id: roomId } });
      roomStream.on('change', (change) => {
        if (change.updateDescription) {
          io.emit('caller snapshot', change.updateDescription);
        }
      });
      const calleeStream = Callee.watch({ $match: { room: roomId } })
      calleeStream.on('change', (change) => {
        if (change.fullDocument) {
          const candidate = {
            candidate: change.fullDocument.candidate,
            sdpMid: change.fullDocument.sdpMid,
            sdpMLineIndex: change.fullDocument.sdpMLineIndex,
          }
          setTimeout(() => {
            io.emit('callee snapshot', candidate);
          }, 1000);
        }
      });
    } catch (err) {
      console.log(err)
    }
  })

  socket.on('join room', ({ roomId }) => {
    const callerStream = Caller.watch({ $match: { room: roomId } })
    callerStream.on('change', (change) => {
      if (change.fullDocument) {
        const candidate = {
          candidate: change.fullDocument.candidate,
          sdpMid: change.fullDocument.sdpMid,
          sdpMLineIndex: change.fullDocument.sdpMLineIndex,
        }
        io.emit('caller snapshot v2', candidate);
      }
    });
  })

  socket.on('disconnect', () => {
    console.log('disconnected')
  });
});
