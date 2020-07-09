import { nanoid } from 'nanoid';

import { SocketUser, ID, Maybe } from 'src/types';

/* -------------------------------------------------------------------------- */

const generateColor = (): string => '#000000'.replace(/0/g, () => Math.floor(Math.random() * 16).toString(16));

export const createUser = (socket: SocketIO.Socket): SocketUser => ({
  id: nanoid(),
  username: `User-${nanoid(6)}`,
  socketIds: [socket.id],
  color: generateColor(),
});

export const findUserBySocketId = (users: Map<ID, SocketUser>, socketId: ID): Maybe<SocketUser> => {
  for (const onlineUser of users.values()) {
    if (onlineUser.socketIds.includes(socketId)) {
      return onlineUser;
    }
  }

  return null;
};
