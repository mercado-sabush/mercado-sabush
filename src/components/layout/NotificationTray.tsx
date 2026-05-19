import React, { useState } from 'react';
import { Bell, X, Package, MessageSquare, CreditCard, Clock, Smartphone } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function NotificationTray() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4 text-orange-500" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'mpesa': return <Smartphone className="w-4 h-4 text-red-500" />;
      case 'emola': return <Smartphone className="w-4 h-4 text-orange-600" />;
      case 'bank': return <CreditCard className="w-4 h-4 text-green-600" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full min-w-[14px] text-center border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-4 w-[350px] bg-white rounded-3xl border border-gray-100 shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0">
                 <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs italic">Notifications</h4>
                 <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-900">
                      <X className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={cn(
                          "p-4 flex gap-4 transition-colors cursor-pointer hover:bg-gray-50",
                          !notif.read && "bg-blue-50/50"
                        )}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm relative">
                           {getTypeIcon(notif.type)}
                           {!notif.read && (
                             <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 border-2 border-white rounded-full"></div>
                           )}
                        </div>
                        <div className="flex-1 space-y-1">
                           <div className="flex items-start justify-between gap-2">
                              <h5 className="text-[13px] font-bold text-gray-900 leading-none">{notif.title}</h5>
                              <div className="flex items-center gap-1 text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span className="text-[8px] font-black uppercase whitespace-nowrap">Just now</span>
                              </div>
                           </div>
                           <p className="text-[12px] text-gray-500 leading-relaxed">{notif.message}</p>
                           {!notif.read && (
                             <button className="text-[10px] font-black text-blue-600 uppercase tracking-tighter pt-1">
                               Mark as read
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 text-center border-t border-gray-50">
                 <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                    View Older History
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
