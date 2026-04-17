export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ApiMessage {
  message: string;
  user?: User;
}
