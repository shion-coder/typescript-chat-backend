import { ID } from 'src/types';

/* -------------------------------------------------------------------------- */

export interface NotifyArgs {
  socket: SocketIO.Socket;
  roomId: ID;
  notification: string;
}
