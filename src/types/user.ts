export type ID = string;

export type Maybe<T> = T | null | undefined;

export interface TokenPayload {
  id: ID;
}

export interface SocketUser {
  id: ID;
  username: string;
  socketIds: ID[];
  color: string;
}

declare global {
  namespace SocketIO {
    export interface Socket {
      user: SocketUser;
    }
  }
}
