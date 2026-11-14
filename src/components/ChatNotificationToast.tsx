import React, { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ChatMessage } from '../types/ludo';
import { sound } from '../utils/soundEffects';

interface ChatNotificationToastProps {
  lastMessage: ChatMessage | null;
  isChatOpen: boolean;
  theme: 'dark' | 'light';
  onOpenChat: () => void;
}

export const ChatNotificationToast: React.FC<ChatNotificationToastProps> = ({
  lastMessage,
  isChatOpen,
  theme,
  onOpenChat,
}) => {
  const [activeToast, setActiveToast] = useState<ChatMessage | null>(null);

  const isLight = theme === 'light';

  useEffect(() => {
    if (lastMessage && !isChatOpen) {
      setActiveToast(lastMessage);
      sound.playChatNotification();

      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      setActiveToast(null);
    }
  }, [lastMessage, isChatOpen]);

  if (!activeToast || isChatOpen) return null;

  return (
    <div
      onClick={() => {
        sound.playClick();
        onOpenChat();
        setActiveToast(null);
      }}
      className="fixed top-14 inset-x-4 max-w-sm mx-auto z-40 cursor-pointer animate-in fade-in slide-in-from-top-3 duration-200"
    >
      <div
        className={`p-3 rounded-2xl border shadow-xl flex items-center justify-between gap-3 ${
          isLight
            ? 'fake-glass-light border-slate-200 text-[#0E1726]'
            : 'fake-glass-dark border-purple-500/35 text-slate-100 shadow-2xl'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={
              activeToast.senderAvatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${activeToast.senderId}`
            }
            alt={activeToast.senderName}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-xl object-cover border border-amber-400 shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black truncate max-w-[120px]">
                {activeToast.senderName}
              </span>
              <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" /> Chat
              </span>
            </div>
            <span className="text-xs text-slate-400 truncate max-w-[200px]">
              {activeToast.text}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveToast(null);
          }}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
