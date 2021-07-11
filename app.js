const server = require('http').createServer();
const mongoose = require('mongoose');
const fs = require('fs');
const ca = [fs.readFileSync(__dirname + '/cert.pem')];
const Messages = require('./models/messages');
const Messages = require('./models/filters');
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});

const PORT = 4000;
const NEW_CHAT_MESSAGE_EVENT = 'newChatMessage';
const messagesDatabase = new Messages();
filtersDataBase = new Filter();
io.on('connection', socket => {
  const adminList = ['nitsancohen770@gmail.com'];
  socket.on(NEW_CHAT_MESSAGE_EVENT, data => {
    messagesDatabase.messages.push(data);
    messagesDatabase
      .save() //first find if the filter array is empty if not filter messages and then send expect admin
      .then(res => io.emit(NEW_CHAT_MESSAGE_EVENT, res.messages));
  });
  socket.on(NEW_FILTER_QUERY_EVENT, filterQuery => {
    messagesDatabase
      .find({ name: { $regex: 'ok', $options: 'i' } })
      .then(res => io.emit(NEW_CHAT_MESSAGE_EVENT, res.messages));
  });
});

mongoose
  .connect(
    'mongodb+srv://nitsancohen:ua3ddcs3@cluster0.fnu3q.mongodb.net/chatApp?retryWrites=true&w=majority?ssl=true',
    {
      sslValidate: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      sslValidate: false,
      sslCA: ca,
    }
  )
  .then(result => {
    server.listen(process.env.PORT || PORT, () => {
      console.log(`Server listening on PORT:${PORT}`);
    });
  });
