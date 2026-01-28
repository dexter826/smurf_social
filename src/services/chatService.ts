import { conversationService } from './chat/conversationService';
import { messageService } from './chat/messageService';
import { groupService } from './chat/groupService';

export const chatService = {
  ...conversationService,
  ...messageService,
  ...groupService,
};
