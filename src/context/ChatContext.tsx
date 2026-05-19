import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { Chat, Message } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';

interface ChatContextType {
  activeChats: Chat[];
  messages: Message[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  sendMessage: (text: string) => Promise<void>;
  startChatWithSeller: (sellerId: string, orderId?: string) => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Listen to user's chats
  useEffect(() => {
    if (!user) {
      setActiveChats([]);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setActiveChats(chats);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to messages of active chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${activeChatId}/messages`);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const sendMessage = async (text: string) => {
    if (!user || !activeChatId) return;

    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        chatId: activeChatId,
        senderId: user.uid,
        text,
        createdAt: new Date().toISOString()
      });

      // Update last message in chat
      await setDoc(doc(db, 'chats', activeChatId), {
        lastMessage: text,
        lastMessageAt: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const startChatWithSeller = async (sellerId: string, orderId?: string) => {
    if (!user) throw new Error('Must be logged in to chat');

    // Check if chat already exists
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    const snapshot = await getDocs(q);
    const existingChat = snapshot.docs.find(doc => {
      const participants = doc.data().participants as string[];
      return participants.includes(sellerId);
    });

    if (existingChat) {
      setActiveChatId(existingChat.id);
      return existingChat.id;
    }

    // Create new chat
    const newChatRef = await addDoc(collection(db, 'chats'), {
      participants: [user.uid, sellerId],
      createdAt: new Date().toISOString(),
      orderId: orderId || null
    });

    setActiveChatId(newChatRef.id);
    return newChatRef.id;
  };

  return (
    <ChatContext.Provider value={{ 
      activeChats, 
      messages, 
      activeChatId, 
      setActiveChatId, 
      sendMessage, 
      startChatWithSeller 
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
