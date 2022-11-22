// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';

const MessageStatus = {
  "SENT": "SENT",
  "DELIVERED": "DELIVERED",
  "READ": "READ"
};

const { ChatRoom, User, Message, ChatRoomUser, Location } = initSchema(schema);

export {
  ChatRoom,
  User,
  Message,
  ChatRoomUser,
  MessageStatus,
  Location
};