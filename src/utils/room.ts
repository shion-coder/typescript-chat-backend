import { NOTIFICATIONS, notify } from 'src/notifications';

import { SocketUser, ID } from 'src/types';
import { findUserBySocketId } from 'src/utils';

/* -------------------------------------------------------------------------- */

const getRoomSocketIds = (io: SocketIO.Server, roomId: ID): ID[] => {
  const room = io.sockets.adapter.rooms[roomId];
  if (!room) {
    return [];
  }
  const { sockets } = io.sockets.adapter.rooms[roomId];
  const roomSocketIds = Object.keys(sockets);
  return roomSocketIds;
};

export const getRoomUsers = (io: SocketIO.Server, appUsers: Map<string, SocketUser>, roomId: ID): SocketUser[] => {
  const roomSocketIds = getRoomSocketIds(io, roomId);
  let roomUsers = roomSocketIds
    .map((socketId) => findUserBySocketId(appUsers, socketId))

    .filter((user) => !!user) as SocketUser[];

  roomUsers = [...new Set(roomUsers)];
  return roomUsers;
};

export const isUserAlreadyInRoom = (io: SocketIO.Server, roomId: ID, joiningSocket: SocketIO.Socket): boolean => {
  // Getting user's socket ids other than
  // the current one joining to the room.
  const { socketIds } = joiningSocket.user as SocketUser;

  const otherUserSocketIds = socketIds.filter((socketId) => socketId !== joiningSocket.id);
  // If user has no other sockets,
  // it means it's the first time they are joining
  if (!otherUserSocketIds.length) {
    return false;
  }
  const roomSocketIds = getRoomSocketIds(io, roomId);
  // If any of the user's other socket ids is in room
  // it means, they are already in the room.
  return otherUserSocketIds.some((socketId) => roomSocketIds.includes(socketId));
};

export const getSocketRoomIds = (socket: SocketIO.Socket): ID[] => {
  const socketRoomIds = Object.keys(socket.rooms);
  return socketRoomIds;
};

const didUserLeaveTheRoomCompletely = (io: SocketIO.Server, roomId: ID, leavingSocket: SocketIO.Socket): boolean => {
  const leavingUser = leavingSocket.user as SocketUser;
  const leavingSocketId = leavingSocket.id;
  // Getting user's socket ids other than the current one
  // leaving the room.
  const remainingUserSocketIds = leavingUser.socketIds.filter((socketId) => socketId !== leavingSocketId);
  // If user has no other socket id, it means they
  // completely disconnecting.
  if (!remainingUserSocketIds.length) {
    return true;
  }
  const roomSocketIds = getRoomSocketIds(io, roomId);
  // If none of the user's remaining socket ids is in the room,
  // it means they left the room completely.
  return remainingUserSocketIds.every((socketId) => !roomSocketIds.includes(socketId));
};

export const handleUserLeavingTheRoom = (io: SocketIO.Server, socket: SocketIO.Socket, roomId: ID): void => {
  const socketUser = socket.user as SocketUser;
  socket.to(roomId).emit('finished typing', socketUser);
  // One of the sockets of user may leave the room.
  // But user's other socket may still be in the room.
  // So, we check if there are any remaining sockets of user
  // in the room or not.
  if (didUserLeaveTheRoomCompletely(io, roomId, socket)) {
    socket.to(roomId).emit('left the room', socketUser);
    notify({
      socket,
      roomId,
      notification: NOTIFICATIONS.leftTheRoom(socketUser),
    });
  }
};
