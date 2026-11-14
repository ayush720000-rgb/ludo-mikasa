import React, { useEffect, useRef, useState } from 'react';
import {
  CornerDownRight,
  MessageSquare,
  Reply,
  Send,
  Smile,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { ChatMessage, ChatReactionUser, PlayerProfile } from '../types/ludo';
import { COLOR_CONFIG } from '../utils/ludoConstants';
import { sound } from '../utils/soundEffects';

interface GameChatProps {
  isOpen: boolean;
  theme: 'dark' | 'light';
  onClose: () => void;
  messages: ChatMessage[];
  currentUser: PlayerProfile;
  onSendMessage: (
    text: string,
    replyTo?: { id: string; senderName: string; text: string }
  ) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onTriggerReactionAnimation: (emoji: string) => void;
}

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '👍', '👑', '⚔️', '🎉', '🚀'];

const EXTENDED_REACTIONS = [
  '❤️', '🔥', '😂', '👍', '👑', '⚔️', '🎉', '🚀',
  '😭', '😡', '💯', '⭐', '💩', '👀', '🤡', '⚡',
  '👏', '🥳', '😎', '🙏', '🤝', '💪', '🍀', '✨'
];

export const GameChat: React.FC<GameChatProps> = ({
  isOpen,
  theme,
  onClose,
  messages,
  currentUser,
  onSendMessage,
  onReactMessage,
  onTriggerReactionAnimation,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionTrayForMsg, setShowReactionTrayForMsg] = useState<string | null>(null);
  const [activeReactionTooltip, setActiveReactionTooltip] = useState<{
    msgId: string;
    emoji: string;
    users: ChatReactionUser[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text.slice(0, 60),
        }
      : undefined;

    onSendMessage(inputText, replyData);
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  const handleScrollToMessage = (targetId: string) => {
    const el = messageRefs.current.get(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-rose-500', 'bg-rose-500/10');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-rose-500', 'bg-rose-500/10');
      }, 1400);
    }
  };

  const handleReactionClick = (msgId: string, emoji: string) => {
    sound.playReactionBurst();
    onReactMessage(msgId, emoji);
    onTriggerReactionAnimation(emoji);
    setShowReactionTrayForMsg(null);
  };

  // Helper to normalize reactions whether stored as user objects or string IDs
  const getReactionUsers = (rawList: any): ChatReactionUser[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((item) => {
      if (typeof item === 'string') {
        return {
          id: item,
          name: item === currentUser.id ? currentUser.name : 'Player',
          avatarUrl: item === currentUser.id ? currentUser.avatarUrl : undefined,
        };
      }
      return item;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 animate-in fade-in duration-200">
      <div
        className={`w-full sm:max-w-md h-[88vh] sm:h-[620px] rounded-t-3xl sm:rounded-[24px] border shadow-2xl flex flex-col overflow-hidden ${
          isLight
            ? 'bg-[#F4F6FB] border-slate-200 text-[#0E1726]'
            : 'bg-[#10041E] border-purple-500/30 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.9)]'
        }`}
      >
        {/* Telegram-style Top Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between shadow-xs select-none ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#151928] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <span>Match Chat</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  LIVE
                </span>
              </span>
              <span className="text-[10px] text-slate-400">
                {messages.length} messages • Tap message to reply
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telegram Message List */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="m-auto text-center text-xs text-slate-400 flex flex-col items-center gap-2 p-6">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-2xl">
                💬
              </div>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                No messages yet
              </span>
              <span>Say hello or send an emoji to other players!</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUser.id;
              const colorCfg = msg.senderColor ? COLOR_CONFIG[msg.senderColor] : null;

              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    if (el) messageRefs.current.set(msg.id, el);
                    else messageRefs.current.delete(msg.id);
                  }}
                  className={`flex items-start gap-2 max-w-[92%] transition-all ${
                    isMine ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                  {/* SENDER PROFILE PICTURE (Always displayed!) */}
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={
                        msg.senderAvatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderId}`
                      }
                      alt={msg.senderName}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border shadow-sm"
                      style={{
                        borderColor: colorCfg ? colorCfg.primary : '#94a3b8',
                      }}
                    />
                    {/* Small color dot indicator */}
                    {colorCfg && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900"
                        style={{ background: colorCfg.primary }}
                      />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`flex flex-col relative rounded-2xl p-2.5 shadow-sm transition-all border ${
                      isMine
                        ? isLight
                          ? 'bg-rose-500 text-white border-rose-600 rounded-tr-xs'
                          : 'bg-rose-600 text-white border-rose-700 rounded-tr-xs'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-800 rounded-tl-xs'
                        : 'bg-[#181d2a] border-white/10 text-slate-100 rounded-tl-xs'
                    }`}
                  >
                    {/* Header inside incoming bubble: Sender Name & Color */}
                    {!isMine && (
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span
                          className="text-[11px] font-black tracking-tight"
                          style={{
                            color: colorCfg
                              ? colorCfg.primary
                              : isLight
                              ? '#0f172a'
                              : '#f8fafc',
                          }}
                        >
                          {msg.senderName}
                        </span>
                        {msg.isSpectator && (
                          <span className="text-[8px] font-bold px-1 rounded bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                            SPECTATOR
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quoted preview if this message is a reply */}
                    {msg.replyTo && (
                      <div
                        onClick={() => handleScrollToMessage(msg.replyTo!.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 mb-1.5 rounded-lg border-l-3 border-amber-400 text-[10px] cursor-pointer transition-colors ${
                          isMine
                            ? 'bg-black/20 text-white/90'
                            : isLight
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-black/40 text-slate-300'
                        }`}
                      >
                        <CornerDownRight className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-400 truncate max-w-[80px]">
                          {msg.replyTo.senderName}:
                        </span>
                        <span className="truncate italic opacity-85">
                          {msg.replyTo.text}
                        </span>
                      </div>
                    )}

                    {/* Message Body */}
                    <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </p>

                    {/* Bottom row: Timestamp & Action buttons */}
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span
                        className={`text-[9px] font-mono select-none ${
                          isMine
                            ? 'text-white/70'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {/* Reply Button */}
                      <button
                        onClick={() => {
                          sound.playClick();
                          setReplyingTo(msg);
                        }}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          isMine
                            ? 'text-white/70 hover:text-white'
                            : 'text-slate-400 hover:text-rose-500'
                        }`}
                        title="Reply to message"
                      >
                        <Reply className="w-3 h-3" />
                      </button>

                      {/* Add Reaction Button */}
                      <button
                        onClick={() => {
                          sound.playClick();
                          setShowReactionTrayForMsg(
                            showReactionTrayForMsg === msg.id ? null : msg.id
                          );
                        }}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          isMine
                            ? 'text-white/70 hover:text-white'
                            : 'text-slate-400 hover:text-amber-500'
                        }`}
                        title="Add reaction"
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                    </div>

                    {/* STACKABLE REACTIONS ROW WITH TELEGRAM PROFILES */}
                    {Object.keys(msg.reactions || {}).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1 border-t border-black/10 dark:border-white/10">
                        {Object.entries(msg.reactions).map(([emoji, rawUsers]) => {
                          const users = getReactionUsers(rawUsers);
                          if (users.length === 0) return null;

                          const hasReacted = users.some(
                            (u) => u.id === currentUser.id
                          );

                          return (
                            <div key={emoji} className="relative group">
                              <button
                                onClick={() => handleReactionClick(msg.id, emoji)}
                                onMouseEnter={() =>
                                  setActiveReactionTooltip({
                                    msgId: msg.id,
                                    emoji,
                                    users,
                                  })
                                }
                                onMouseLeave={() => setActiveReactionTooltip(null)}
                                className={`flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer active:scale-95 shadow-xs ${
                                  hasReacted
                                    ? isMine
                                      ? 'bg-white text-slate-900 border-white font-bold'
                                      : 'bg-rose-500/15 border-rose-500 text-rose-500 font-bold'
                                    : isLight
                                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                    : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-200'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-mono text-[10px]">
                                  {users.length}
                                </span>

                                {/* Overlapping stacked mini profile avatars */}
                                <div className="flex items-center -space-x-1 ml-0.5">
                                  {users.slice(0, 3).map((u, uIdx) => (
                                    <img
                                      key={u.id + '_' + uIdx}
                                      src={
                                        u.avatarUrl ||
                                        `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`
                                      }
                                      alt={u.name}
                                      referrerPolicy="no-referrer"
                                      className="w-3.5 h-3.5 rounded-full object-cover border border-white dark:border-slate-800"
                                      title={u.name}
                                    />
                                  ))}
                                </div>
                              </button>

                              {/* Telegram User Profile Popover / Tooltip on Hover */}
                              {activeReactionTooltip?.msgId === msg.id &&
                                activeReactionTooltip?.emoji === emoji && (
                                  <div className="absolute bottom-full left-0 mb-1 z-50 bg-slate-900/95 text-white p-2 rounded-xl shadow-xl border border-slate-700 flex flex-col gap-1 min-w-[120px] pointer-events-none animate-in fade-in duration-100">
                                    <span className="text-[10px] font-bold text-amber-400 border-b border-slate-800 pb-0.5">
                                      {emoji} {users.length} reaction
                                      {users.length > 1 ? 's' : ''}:
                                    </span>
                                    {users.map((u, i) => (
                                      <div
                                        key={u.id + '_' + i}
                                        className="flex items-center gap-1.5 text-[10px]"
                                      >
                                        <img
                                          src={
                                            u.avatarUrl ||
                                            `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`
                                          }
                                          alt={u.name}
                                          className="w-4 h-4 rounded-full object-cover border border-slate-600"
                                        />
                                        <span className="truncate">{u.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Extended Reaction Picker Tray Popup */}
                    {showReactionTrayForMsg === msg.id && (
                      <div className="flex flex-wrap items-center gap-1 mt-2 p-2 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl animate-in fade-in duration-150 z-20">
                        <span className="text-[9px] font-bold text-slate-400 w-full mb-1">
                          React to this message:
                        </span>
                        {EXTENDED_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReactionClick(msg.id, emoji)}
                            className="text-base hover:scale-130 active:scale-95 transition-transform cursor-pointer p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* REPLY PREVIEW BANNER (Appears when replying to a message!) */}
        {replyingTo && (
          <div
            className={`px-4 py-2 border-t flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-150 ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-slate-800'
                : 'bg-rose-950/40 border-rose-900/50 text-white'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Reply className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[11px] font-bold text-rose-500">
                  Replying to {replyingTo.senderName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate italic">
                  {replyingTo.text}
                </span>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className={`p-3 border-t flex items-center gap-2 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#161a25] border-white/10'
          }`}
        >
          {/* Quick emoji drawer toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              replyingTo
                ? `Reply to ${replyingTo.senderName}...`
                : 'Write a message...'
            }
            maxLength={280}
            className={`flex-1 px-3 py-2 rounded-xl text-xs outline-none border transition-all ${
              isLight
                ? 'bg-slate-100 border-slate-200 focus:border-rose-400 focus:bg-white text-slate-800'
                : 'bg-white/[0.05] border-white/10 focus:border-rose-500 focus:bg-white/[0.08] text-white'
            }`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              inputText.trim()
                ? 'bg-rose-500 hover:bg-rose-600 text-white active:scale-95 shadow-md'
                : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Floating Emoji Picker Popover */}
        {showEmojiPicker && (
          <div
            className={`p-3 border-t grid grid-cols-8 gap-2 select-none animate-in slide-in-from-bottom-2 duration-150 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-white/10'
            }`}
          >
            {EXTENDED_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  inputRef.current?.focus();
                }}
                className="text-lg hover:scale-130 active:scale-90 transition-transform cursor-pointer p-1 text-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
