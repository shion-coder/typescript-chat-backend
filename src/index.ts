import { createServer } from 'http';
import socketIo from 'socket.io';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

import { app } from 'src/app';
import { NOTIFICATIONS, notify } from 'src/notifications';

import { PORT, JWT_SECRET, JWT_EXPIRE } from 'src/config';
import { ID, SocketUser, SocketEvent, Maybe, TokenPayload, Message } from 'src/types';
import {
  createUser,
  getRoomUsers,
  getSocketRoomIds,
  isUserAlreadyInRoom,
  handleUserLeavingTheRoom,
  trimSpaces,
  isImageFile,
} from 'src/utils';

/* -------------------------------------------------------------------------- */

const server = createServer(app);
const io = socketIo(server);

const appUsers = new Map<ID, SocketUser>();

io.use((socket, next) => {
  const { token } = socket.handshake.query;
  let user: Maybe<SocketUser> = null;

  try {
    if (token) {
      const verified = jwt.verify(token, JWT_SECRET) as TokenPayload;
      const { id } = verified;
      user = appUsers.get(id);

      if (!user) {
        throw Error('User not found');
      } else {
        user.socketIds.push(socket.id);
      }
    } else {
      throw Error('Token not found');
    }
  } catch (err) {
    user = createUser(socket);
  }

  appUsers.set(user.id, user);
  socket.user = user;

  next();
});

io.on(SocketEvent.CONNECTION, (socket) => {
  socket.on('who am i', (callback) => {
    const token = jwt.sign({ id: socket.user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
    });
    callback(socket.user, token);
  });

  socket.on('create room', (callback) => {
    const roomId = nanoid();
    callback(roomId);
  });

  socket.on('join room', (roomId, callback) => {
    socket.join(roomId, (err) => {
      if (!err) {
        const roomUsers = getRoomUsers(io, appUsers, roomId);
        // Send current room users to sender
        callback(roomUsers);
        if (!isUserAlreadyInRoom(io, roomId, socket)) {
          // Send the newly joined user to other room users (except sender)
          socket.to(roomId).emit('joined to room', socket.user);
          notify({
            socket,
            roomId,
            notification: NOTIFICATIONS.joinedToRoom(socket.user),
          });
        }
      }
    });
  });

  socket.on('leave room', (roomId) => {
    socket.leave(roomId, (err: unknown) => {
      if (!err) {
        handleUserLeavingTheRoom(io, socket, roomId);
      }
    });
  });

  socket.on('chat message', async (roomId, { body, file }, callback) => {
    const trimmedBody = body ? trimSpaces(body) : null;
    if (!trimmedBody && !file) {
      return;
    }
    if (file) {
      const isImage = await isImageFile(file);
      if (!isImage) {
        return;
      }
    }
    const newMessage: Message = {
      id: nanoid(),
      author: socket.user,
      body: trimmedBody,
      timestamp: Date.now(),
      file,
    };
    socket.to(roomId).emit('chat message', newMessage);
    callback(newMessage);
  });

  socket.on('started typing', (roomId: ID) => {
    socket.to(roomId).emit('started typing', socket.user);
  });

  socket.on('finished typing', (roomId: ID) => {
    socket.to(roomId).emit('finished typing', socket.user);
  });

  socket.on('edit user', (roomId: string, input: SocketUser) => {
    const editedUser = appUsers.get(input.id);
    if (editedUser) {
      const newUsername = trimSpaces(input.username);
      if (newUsername) {
        const oldUsername = editedUser.username;
        if (newUsername && oldUsername !== newUsername) {
          editedUser.username = newUsername;
          notify({
            socket,
            roomId,
            notification: NOTIFICATIONS.editedUsername(oldUsername, newUsername),
          });
        }
      }

      const newColor = input.color;
      if (newColor) {
        const oldColor = editedUser.color;
        if (oldColor !== newColor) {
          editedUser.color = newColor;
          notify({
            socket,
            roomId,
            notification: NOTIFICATIONS.editedColor(editedUser.username, newColor),
          });
        }
      }

      // eslint-disable-next-line no-param-reassign
      socket.user = editedUser;
      appUsers.set(editedUser.id, editedUser);
      io.to(roomId).emit('edit user', editedUser);
    }
  });

  socket.on('disconnecting', () => {
    // User leaves all of the rooms before "disconnected".
    // So, if we want to get the rooms those the user joined,
    // we need to do this in "disconnecting" event.
    // https://stackoverflow.com/a/52713972/10876256
    const roomIds = getSocketRoomIds(socket);

    roomIds.forEach((roomId) => {
      handleUserLeavingTheRoom(io, socket, roomId);
    });

    // Remove the leaving socket from users socketId list.
    // eslint-disable-next-line no-param-reassign
    socket.user.socketIds = socket.user.socketIds.filter((socketId) => socketId !== socket.id);

    appUsers.set(socket.user.id, socket.user);
  });
});

/**
 * Setup server
 */

server.listen(PORT, () => {
  console.log('\x1b[32m' + `Server listening on port ${PORT}`);
});
