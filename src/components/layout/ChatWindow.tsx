import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, User, Loader2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function ChatWindow() {
  const { user } = useAuth();
  const { activeChatId, messages, sendMessage, activeChats, setActiveChatId } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChatId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 h-[450px] bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                   <h4 className="text-sm font-black">Live Chat</h4>
                   <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Online</span>
                   </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
               {/* Chat List if no active chat */}
               {!activeChatId ? (
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">My Conversations</h5>
                    {activeChats.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-xs text-gray-500">No active chats yet. Start chatting from a product or order!</p>
                      </div>
                    ) : (
                      activeChats.map(chat => (
                        <button 
                          key={chat.id}
                          onClick={() => setActiveChatId(chat.id)}
                          className="w-full text-left p-3 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-all flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                             <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">Store Support</span>
                                <span className="text-[8px] text-gray-400 font-bold uppercase">Today</span>
                             </div>
                             <p className="text-[11px] text-gray-500 truncate">{chat.lastMessage || 'Start a conversation'}</p>
                          </div>
                        </button>
                      ))
                    )}
                 </div>
               ) : (
                 /* Individual Chat Window */
                 <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                    <div className="absolute top-[60px] left-0 right-0 z-10 bg-white/80 backdrop-blur-md px-4 py-1.5 border-b border-gray-100 flex items-center justify-between">
                       <button onClick={() => setActiveChatId(null)} className="text-[10px] font-black text-blue-600 underline">Back</button>
                       <span className="text-[10px] font-black italic">Store Chat</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 mt-8 space-y-4" ref={scrollRef}>
                       {messages.map((msg) => (
                         <div 
                           key={msg.id} 
                           className={cn(
                             "flex flex-col max-w-[85%]",
                             msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start"
                           )}
                         >
                           <div className={cn(
                             "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                             msg.senderId === user.uid 
                               ? "bg-blue-600 text-white rounded-tr-none" 
                               : "bg-white text-gray-900 border border-gray-100 rounded-tl-none"
                           )}>
                             {msg.text}
                           </div>
                           <span className="text-[8px] text-gray-400 mt-1 font-bold uppercase tracking-tight">Just now</span>
                         </div>
                       ))}
                    </div>

                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                       <input 
                         type="text" 
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         placeholder="Type your message..."
                         className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white"
                       />
                       <button 
                        type="submit"
                        className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        disabled={!inputText.trim()}
                       >
                         <Send className="w-5 h-5" />
                       </button>
                    </form>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all pointer-events-auto group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
               <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
               <div className="relative">
                 <MessageCircle className="w-7 h-7" />
                 <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
