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
const ADMIN_USER_VALIDATE = 'validateUserAdmin';
const IS_ADMIN_USER = 'isAdminUser';
const filtersDatabase = new Filters();
const messagesDatabase = new Messages();

// io.use(
//   socketioJwt.authorize({
//     secret: process.env.AUTH0_CLIENT_SECRET,
//     handshake: false,
//   })
// );

io.use((socket, next) => {
  const adminList = ['nitsancohen770@gmail.com'];
  if (adminList.includes(socket.handshake.query.email)) {
    socket.emit(
      IS_ADMIN_USER,
      adminList.includes(socket.handshake.query.email)
    );
  }
  console.log(socket);

  next();
});

io.on('connection', socket => {
  console.log('connected!');
  socket.on(NEW_CHAT_MESSAGE_EVENT, data => {
    const newMessage = new Messages({ ...data });
    newMessage.save().then(res =>
      Filters.find().then(allFilters => {
        if (allFilters.length === 0) {
          Messages.find().then(allMessages =>
            io.emit(NEW_CHAT_MESSAGE_EVENT, allMessages)
          );
        }
        const filters = allFilters.map(filter => filter.keywords);
        const regex = filters.join('|');
        Messages.find({
          body: { $not: { $regex: regex, $options: 'i' } },
        }).then(filteredMessages =>
          io.emit(NEW_CHAT_MESSAGE_EVENT, filteredMessages)
        );
      })
    );
  });

  socket.on(NEW_FILTER_QUERY_EVENT, filterQuery => {
    const newFilter = new Filters({ ...filterQuery });
    newFilter.save().then(res =>
      Filters.find().then(allFilters => {
        const filters = allFilters.map(filter => filter.keywords);
        const regex = filters.join('|');
        Messages.find({
          body: { $not: { $regex: regex, $options: 'i' } },
        }).then(filteredMessages =>
          io.emit(NEW_CHAT_MESSAGE_EVENT, filteredMessages)
        );
      })
    );
  });

  socket.on(ADMIN_USER_VALIDATE, ({ userEmail }) => {
    console.log(userEmail);
    io.emit(IS_ADMIN_USER, adminList.includes(userEmail));
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
