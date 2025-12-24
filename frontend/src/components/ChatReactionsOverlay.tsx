import { useRef, useEffect, useState } from 'react';

interface ChatReactionsOverlayProps {
  isChatOpen: boolean;
  isReactionsOpen: boolean;
  chatMessages: Array<{ message: string; sender: string; timestamp: string }>;
  reactions: Array<{ reaction: string; sender: string; timestamp: string }>;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendReaction: (reaction: string) => void;
  commonReactions: string[];
  userName: string;
}

const ChatReactionsOverlay = ({
  isChatOpen,
  isReactionsOpen,
  chatMessages,
  reactions,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onSendReaction,
  commonReactions,
  userName,
}: ChatReactionsOverlayProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reactionsEndRef = useRef<HTMLDivElement>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Scroll reactions to bottom when new reactions arrive
  useEffect(() => {
    if (isReactionsOpen) {
      reactionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [reactions, isReactionsOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuIndex(null);
      }
    };

    if (openMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuIndex]);

  // Copy message to clipboard
  const handleCopyMessage = async (message: string, index: number) => {
    try {
      await navigator.clipboard.writeText(message);
      setOpenMenuIndex(null);
      // Optional: Show a toast notification here
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // Don't render if both are closed
  if (!isChatOpen && !isReactionsOpen) {
    return null;
  }

  const showBoth = isChatOpen && isReactionsOpen;

  return (
    <div
      className={`fixed right-0 top-0 z-30 h-full w-80 bg-slate-900/95 backdrop-blur-sm transition-all duration-300 border-l border-slate-700 ${
        isChatOpen || isReactionsOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex h-full flex-col border-l border-slate-700">
        {/* Chat Section */}
        {isChatOpen && (
          <div
            className={`flex flex-col border-b border-slate-700 ${
              showBoth ? 'h-1/2' : 'h-full'
            }`}
          >
            <div className="border-b border-slate-700 bg-slate-800/60 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-300">Chat</h3>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-500">No messages yet</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="group relative rounded-lg bg-slate-800/40 p-2 hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-200 flex-1">
                        <span className="font-medium text-slate-300">{msg.sender}</span>
                        {' : '}
                        <span>{msg.message}</span>
                      </p>
                      <div className="relative" ref={idx === openMenuIndex ? menuRef : null}>
                        <button
                          onClick={() => setOpenMenuIndex(openMenuIndex === idx ? null : idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700/50"
                          aria-label="Message options"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </button>
                        {openMenuIndex === idx && (
                          <div className="absolute right-0 top-8 z-50 min-w-[120px] rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
                            <button
                              onClick={() => handleCopyMessage(msg.message, idx)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors rounded-t-lg flex items-center gap-2"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={onSendMessage} className="border-t border-slate-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => onMessageInputChange(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reactions Section */}
        {isReactionsOpen && (
          <div className={`flex flex-col ${showBoth ? 'h-1/2' : 'h-full'}`}>
            <div className="border-b border-slate-700 bg-slate-800/60 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-300">Reactions</h3>
            </div>
            <div className="border-b border-slate-700 p-4">
              <div className="flex flex-wrap gap-2">
                {commonReactions.map((reaction) => (
                  <button
                    key={reaction}
                    onClick={() => onSendReaction(reaction)}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-lg transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    title={`Send ${reaction}`}
                  >
                    {reaction}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-4 text-xs text-slate-400">
              {reactions.length === 0 ? (
                <p className="text-slate-500">No reactions yet</p>
              ) : (
                reactions.map((reaction, idx) => (
                  <p key={idx} className="truncate">
                    <span className="text-lg">{reaction.reaction}</span>{' '}
                    <span className="font-medium text-slate-300">{reaction.sender}</span>
                  </p>
                ))
              )}
              <div ref={reactionsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatReactionsOverlay;

