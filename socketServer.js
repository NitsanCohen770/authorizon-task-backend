const server = require('http').createServer();
const mongoose = require('mongoose');
const socketioJwt = require('socketio-jwt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const ca = [fs.readFileSync(__dirname + '/cert.pem')];
const Messages = require('./models/messages');
const Filters = require('./models/filters');
const Users = require('./models/users');
const Admins = require('./models/admins');
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});

const PORT = 5000;
const NEW_CHAT_MESSAGE_EVENT = 'newChatMessage';
const NEW_FILTER_QUERY_EVENT = 'newFilterAdded';
const ADMIN_INVITATION_EVENT = 'inviteAdmin';
const ADMIN_INVITATION_ACCEPTED = 'acceptedInvitation';
const IS_ADMIN_USER = 'isAdminUser';

// io.use(
//   socketioJwt.authorize({
//     secret: process.env.AUTH0_CLIENT_SECRET,
//     handshake: false,
//   })
// );
// socket.emit(
//   IS_ADMIN_USER,
//   adminList.includes(socket.handshake.query.email));

io.use((socket, next) => {
  const userEmail = socket.handshake.query.userEmail;
  const userSessionId = socket.id;
  Admins.find().then(adminList => {
    const adminsEmail = adminList.map(adminData => adminData.email);
    if (adminsEmail.includes(userEmail)) {
      Admins.updateOne(
        { email: userEmail },
        { $set: { socketSessionId: userSessionId } },
        { upsert: true }
      ).then(res => socket.join('Admins'));
      socket.emit(IS_ADMIN_USER, true);
    } else {
      Users.updateOne(
        { email: userEmail },
        { $set: { socketSessionId: userSessionId } },
        { upsert: true }
      ).then(res => socket.join('Users'));
    }
  });

  // const jwtkeys = await axios(
  //   'https://dev-dpdxnfxc.eu.auth0.com/.well-known/jwks.json'
  // );
  // // console.log(jwtkeys.data);
  // const decodedToken = jwt.decode(socket.handshake.query.token, {
  //   complete: true,
  // });
  // console.log(decodedToken);
  // console.log(socket.handshake.query.token);
  // // const varif = jwt.verify(socket.handshake.query.token, jwtkeys.data.kid);
  // // console.log(socket);

  next();
});

io.on('connection', socket => {
  console.log('connected!');
  console.log(socket.id);

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
        const regexFilters = filters.map(filter => new RegExp(filter));
        const regex = filters.join('|');
        Messages.find({
          body: { $not: { $regex: regex, $options: 'i' } },
        }).then(filteredMessages => {
          io.to('Users').emit(NEW_CHAT_MESSAGE_EVENT, filteredMessages);
          if (regexFilters.some(filter => filter.test(data.body))) {
            socket.emit(NEW_CHAT_MESSAGE_EVENT, [
              {
                body: 'This word is forbidden. Please behave!',
                senderId: 'System',
                timeSent: new Date(),
              },
            ]);
          }
          Messages.find().then(allMessages =>
            io.to('Admins').emit(NEW_CHAT_MESSAGE_EVENT, allMessages)
          );
        });
      })
    );
  });

  socket.on(ADMIN_INVITATION_EVENT, userEmail => {
    Users.findOneAndUpdate(
      { email: userEmail },
      { $set: { invited: true } }
    ).then(userData => {
      socket.to(userData.socketSessionId).emit(NEW_CHAT_MESSAGE_EVENT, [
        {
          body: 'Congrats! You have been invited to be an Admin! Press on your Avatar to accept.',
          senderId: 'System',
          timeSent: new Date(),
        },
      ]);
    });
  });

  socket.on(ADMIN_INVITATION_ACCEPTED, () => {
    console.log('begin');
    const userEmail = socket.handshake.query.userEmail;
    Users.findOneAndDelete({ email: userEmail }).then(userData => {
      if (userData?.invited) {
        const adminUser = new Admins({
          email: userData.email,
          socketSessionId: socket.id,
        });
        adminUser.save().then(res => {
          socket.emit(NEW_CHAT_MESSAGE_EVENT, [
            {
              body: 'Congrats! You Are now an admin user! Please refresh the page.',
              senderId: 'System',
              timeSent: new Date(),
            },
          ]);
        });
      }
    });
  });

  socket.on(NEW_FILTER_QUERY_EVENT, filterQuery => {
    Admins.findOne({ socketSessionId: socket.id }).then(adminExists => {
      if (!adminExists) {
        socket.disconnect(true);
      }
    });

    const newFilter = new Filters({ ...filterQuery });
    newFilter.save().then(res =>
      Filters.find().then(allFilters => {
        const filters = allFilters.map(filter => filter.keywords);
        const regex = filters.join('|');

        Messages.find({
          body: { $not: { $regex: regex, $options: 'i' } },
        }).then(filteredMessages => {
          io.to('Users').emit(NEW_CHAT_MESSAGE_EVENT, filteredMessages);
          Messages.find().then(allMessages =>
            io.to('Admins').emit(NEW_CHAT_MESSAGE_EVENT, allMessages)
          );
        });
      })
    );
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
