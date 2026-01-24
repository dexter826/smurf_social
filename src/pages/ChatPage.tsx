import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MoreHorizontal, Phone, Video, Image as ImageIcon, 
  Paperclip, Smile, Send, ArrowLeft, Users, Info
} from 'lucide-react';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { Conversation, Message, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Input, Button, Spinner } from '../components/ui';
import { MessageBubble } from '../components/chat/MessageBubble';
import { format } from 'date-fns';

const ChatPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [inputText, setInputText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [participantsMap, setParticipantsMap] = useState<Record<string, User>>({});

  useEffect(() => {
    if (!currentUser) return;
    const fetchChats = async () => {
        setLoadingChats(true);
        try {
            const data = await chatService.getConversations(currentUser.id);
            setConversations(data);
            const users: Record<string, User> = {};
            data.forEach(c => c.participants.forEach(p => users[p.id] = p));
            setParticipantsMap(users);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingChats(false);
        }
    };
    fetchChats();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedChatId || !currentUser) return;
    
    // Sử dụng onSnapshot để nhận tin nhắn realtime
    const unsubscribe = chatService.getMessages(selectedChatId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedChatId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, selectedChatId]);

  const activeConversation = conversations.find(c => c.id === selectedChatId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChatId || !currentUser) return;
    
    try {
        await chatService.sendMessage(selectedChatId, currentUser.id, inputText);
        setInputText('');
    } catch (error) {
        console.error("Failed to send", error);
    }
  };

  const getPartner = (conv: Conversation) => {
      if (conv.isGroup) return null;
      return conv.participants.find(p => p.id !== currentUser?.id);
  };

  const getChatName = (conv: Conversation) => {
      if (conv.isGroup) return conv.groupName;
      return getPartner(conv)?.name;
  };

  return (
    <div className="flex h-full w-full bg-white relative">
      
      {/* --- SIDEBAR LIST --- */}
      <div className={`
        flex flex-col border-r border-gray-200 bg-bg-main h-full
        ${selectedChatId ? 'hidden md:flex md:w-[320px] lg:w-[360px]' : 'w-full md:w-[320px] lg:w-[360px]'}
      `}>
        {/* Search Header */}
        <div className="p-4 flex items-center gap-2">
            <Input 
                icon={<Search size={18} />} 
                placeholder="Tìm kiếm" 
                className="bg-gray-100 border-none h-9 text-sm"
            />
            <button className="p-2 text-text-secondary hover:bg-gray-100 rounded-md">
                <Users size={20} />
            </button>
            <button className="p-2 text-text-secondary hover:bg-gray-100 rounded-md">
                <MoreHorizontal size={20} />
            </button>
        </div>

        {/* Tab Filter (Optional but good UX) */}
        <div className="flex px-4 border-b border-gray-100 text-sm font-medium text-text-secondary">
            <button className="pb-2 border-b-2 border-primary-500 text-primary-500 mr-4">Tất cả</button>
            <button className="pb-2 hover:text-text-main mr-4">Chưa đọc</button>
            <button className="pb-2 hover:text-text-main">Phân loại</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loadingChats ? <Spinner /> : conversations.map(conv => {
                const partner = getPartner(conv);
                const isSelected = selectedChatId === conv.id;
                
                return (
                    <div 
                        key={conv.id}
                        onClick={() => setSelectedChatId(conv.id)}
                        className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-colors
                            ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'}
                        `}
                    >
                        <Avatar src={partner?.avatar} name={getChatName(conv)} size="md" status={partner?.status} />
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="font-medium text-text-main truncate text-[15px]">{getChatName(conv)}</h3>
                                <span className="text-xs text-text-secondary">
                                    {conv.lastMessage && format(new Date(conv.lastMessage.timestamp), 'HH:mm')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className={`text-sm truncate pr-2 ${conv.unreadCount > 0 ? 'font-semibold text-text-main' : 'text-text-secondary'}`}>
                                    {conv.lastMessage?.senderId === 'me' ? 'Bạn: ' : ''}
                                    {conv.lastMessage?.type === 'text' ? conv.lastMessage?.content : `[${conv.lastMessage?.type}]`}
                                </p>
                                {conv.unreadCount > 0 && (
                                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div className={`flex-col h-full bg-bg-secondary flex-1 relative ${selectedChatId ? 'flex' : 'hidden md:flex'}`}>
         {activeConversation ? (
             <>
                {/* Header */}
                <header className="h-16 bg-bg-main border-b border-gray-200 px-4 flex justify-between items-center shadow-sm z-20">
                    <div className="flex items-center gap-3">
                         <button onClick={() => setSelectedChatId(null)} className="md:hidden p-1 text-text-secondary">
                             <ArrowLeft size={24} />
                         </button>
                         <Avatar src={getPartner(activeConversation)?.avatar} size="md" status={getPartner(activeConversation)?.status} />
                         <div>
                             <h2 className="font-bold text-text-main text-base">{getChatName(activeConversation)}</h2>
                             <div className="text-xs text-text-secondary flex items-center gap-1">
                                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                 Vừa truy cập
                             </div>
                         </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" className="p-2" icon={<Phone size={20} />} />
                        <Button variant="ghost" className="p-2" icon={<Video size={20} />} />
                        <Button variant="ghost" className="p-2 border-l ml-1" icon={<Info size={20} />} />
                    </div>
                </header>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 bg-[#eef0f1] dark:bg-gray-900 scroll-smooth">
                    {messages.map((msg, idx) => {
                        const isMe = msg.senderId === 'me';
                        const showAvatar = !isMe && (idx === 0 || messages[idx-1].senderId !== msg.senderId);
                        const showName = activeConversation.isGroup && !isMe && showAvatar;
                        const sender = participantsMap[msg.senderId];

                        return (
                            <MessageBubble 
                                key={msg.id}
                                message={msg}
                                isMe={isMe}
                                sender={sender}
                                showAvatar={showAvatar}
                                showName={showName || false}
                            />
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-bg-main p-3 border-t border-gray-200 z-20">
                    <div className="flex items-center gap-4 mb-2 px-2">
                        <button className="text-text-secondary hover:text-primary-500 transition-colors"><ImageIcon size={22} /></button>
                        <button className="text-text-secondary hover:text-primary-500 transition-colors"><Paperclip size={22} /></button>
                    </div>
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                className="w-full bg-gray-50 border border-gray-200 rounded text-sm py-2.5 pl-3 pr-10 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                                placeholder={`Nhập tin nhắn tới ${getChatName(activeConversation)}`}
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                            />
                            <button type="button" className="absolute right-2 top-2.5 text-text-secondary hover:text-yellow-500">
                                <Smile size={20} />
                            </button>
                        </div>
                        <Button 
                            type="submit"
                            className={`w-11 h-10 p-0 rounded transition-all ${!inputText.trim() ? 'bg-gray-100 text-gray-400' : 'bg-primary-500 text-white'}`}
                            disabled={!inputText.trim()}
                        >
                            <Send size={20} className={inputText.trim() ? "ml-0.5" : ""} />
                        </Button>
                    </form>
                </div>
             </>
         ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center">
                <img src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" className="w-32 opacity-20 mb-4 mix-blend-multiply dark:mix-blend-normal" />
                <h3 className="text-xl font-medium text-text-main">Chào mừng đến với Smurfy</h3>
                <p className="text-text-secondary mt-2 max-w-sm">Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè.</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default ChatPage;