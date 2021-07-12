const server = require('http').createServer();
const mongoose = require('mongoose');
const socketioJwt = require('socketio-jwt');
const fs = require('fs');
const ca = [fs.readFileSync(__dirname + '/cert.pem')];
const Messages = require('./models/messages');
const Filters = require('./models/filters');
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});

const PORT = 5000;
const NEW_CHAT_MESSAGE_EVENT = 'newChatMessage';
const NEW_FILTER_QUERY_EVENT = 'newFilterAdded';
const filtersDatabase = new Filters();
const messagesDatabase = new Messages();

io.use(
  socketioJwt.authorize({
    secret: process.env.AUTH0_CLIENT_SECRET,
    handshake: true,
  })
);

io.on('connection', socket => {
  console.log('connected!');
  const adminList = ['nitsancohen770@gmail.com'];
  socket.on(NEW_CHAT_MESSAGE_EVENT, data => {
    messagesDatabase.messages.push(data);
    messagesDatabase
      .save() //first find if the filter array is empty if not filter messages and then send expect admin
      .then(res => io.emit(NEW_CHAT_MESSAGE_EVENT, res.messages));
  });

  socket.on(NEW_FILTER_QUERY_EVENT, filterQuery => {
    filtersDatabase.filters.push(filterQuery);
    filtersDatabase.save().then(res => console.log(res));
  });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}${process.env.MONGO_URI}}`,
    {
      sslValidate: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      sslCA: ca,
    }
  )
  .then(result => {
    server.listen(process.env.PORT || PORT, () => {
      console.log(`Server listening on PORT:${PORT}`);
    });
  });
