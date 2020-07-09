import { ID, Maybe, SocketUser } from 'src/types';

/* -------------------------------------------------------------------------- */

export interface Message {
  id: ID;
  author: SocketUser;
  body: Maybe<string>;
  timestamp: number;
  file?: ArrayBuffer;
}
