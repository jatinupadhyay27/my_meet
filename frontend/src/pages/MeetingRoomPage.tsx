import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearMeeting } from '../store/slices/meetingSlice';
import { getMeetingByCode } from '../services/meetingApi';
import {
  connectSocket,
  joinMeeting,
  leaveMeeting,
  sendMessage,
  sendReaction,
  disconnectSocket,
  onSocketEvent,
  offSocketEvent,
} from '../services/socket.service';
import { generateLiveKitToken } from '../services/livekitApi';
import VideoRoom from '../components/VideoRoom';
import ChatReactionsOverlay from '../components/ChatReactionsOverlay';

interface ChatMessage {
  message: string;
  sender: string;
  timestamp: string;
}

interface ParticipantEvent {
  userName: string;
  socketId?: string;
  timestamp: string;
}

interface ReactionEvent {
  reaction: string;
  sender: string;
  timestamp: string;
}

const MeetingRoomPage = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentMeeting } = useAppSelector((state) => state.meeting);
  const [meeting, setMeeting] = useState<{
    id: string;
    title: string;
    meetingCode: string;
    scheduledAt?: string;
    createdAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [participantEvents, setParticipantEvents] = useState<ParticipantEvent[]>([]);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reactionsEndRef = useRef<HTMLDivElement>(null);
  
  // Overlay state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);
  
  // LiveKit state
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = useState<string | null>(null);
  const [liveKitError, setLiveKitError] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Scroll reactions to bottom when new reactions arrive
  useEffect(() => {
    reactionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reactions]);

  // Fetch meeting details
  useEffect(() => {
    const fetchMeeting = async () => {
      if (!meetingCode) {
        setError('Meeting code is required');
        setLoading(false);
        return;
      }

      try {
        const data = await getMeetingByCode(meetingCode);
        setMeeting({
          id: data.id,
          title: data.title,
          meetingCode: data.meetingCode,
          scheduledAt: data.scheduledAt,
          createdAt: data.createdAt,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meeting');
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingCode]);

  // Socket event handlers
  useEffect(() => {
    if (!meetingCode || !userName || showNameInput) {
      return;
    }

    // Connect socket
    const socket = connectSocket();

    // Handle connection status
    socket.on('connect', () => {
      setIsConnected(true);
      // Join meeting after connection
      joinMeeting(meetingCode, userName);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle joined meeting confirmation
    const handleJoinedMeeting = async () => {
      console.log('Successfully joined meeting');
      
      // Fetch LiveKit token after socket join succeeds
      if (meetingCode && userName) {
        setIsLoadingToken(true);
        setLiveKitError(null);
        try {
          const tokenData = await generateLiveKitToken({
            meetingCode,
            userName,
          });
          setLiveKitToken(tokenData.token);
          setLiveKitUrl(tokenData.url);
        } catch (err) {
          console.error('Failed to fetch LiveKit token:', err);
          setLiveKitError(err instanceof Error ? err.message : 'Failed to connect to video room');
        } finally {
          setIsLoadingToken(false);
        }
      }
    };

    // Handle user joined event
    const handleUserJoined = (data: ParticipantEvent) => {
      setParticipantEvents((prev) => [...prev, data]);
    };

    // Handle user left event
    const handleUserLeft = (data: ParticipantEvent) => {
      setParticipantEvents((prev) => [...prev, data]);
    };

    // Handle message received
    const handleMessageReceived = (data: ChatMessage) => {
      setChatMessages((prev) => [...prev, data]);
    };

    // Handle reaction received
    const handleReactionReceived = (data: ReactionEvent) => {
      setReactions((prev) => [...prev, data]);
    };

    // Subscribe to events
    onSocketEvent('joined-meeting', handleJoinedMeeting);
    onSocketEvent('user-joined', handleUserJoined);
    onSocketEvent('user-left', handleUserLeft);
    onSocketEvent('message-received', handleMessageReceived);
    onSocketEvent('reaction-received', handleReactionReceived);

    // Cleanup on unmount
    return () => {
      if (meetingCode && userName) {
        leaveMeeting(meetingCode, userName);
      }
      offSocketEvent('joined-meeting', handleJoinedMeeting);
      offSocketEvent('user-joined', handleUserJoined);
      offSocketEvent('user-left', handleUserLeft);
      offSocketEvent('message-received', handleMessageReceived);
      offSocketEvent('reaction-received', handleReactionReceived);
      disconnectSocket();
    };
  }, [meetingCode, userName, showNameInput]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setShowNameInput(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && meetingCode && userName) {
      sendMessage(meetingCode, messageInput.trim(), userName);
      setMessageInput('');
    }
  };

  const handleSendReaction = (reaction: string) => {
    if (meetingCode && userName) {
      sendReaction(meetingCode, reaction, userName);
    }
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  const handleToggleReactions = () => {
    setIsReactionsOpen((prev) => !prev);
  };

  const handleEndOrLeaveMeeting = () => {
    if (meetingCode && userName) {
      leaveMeeting(meetingCode, userName);
    }
    disconnectSocket();
    dispatch(clearMeeting());
    navigate('/join');
  };

  const commonReactions = ['👍', '👎', '❤️', '😂', '🎉', '👏', '🔥', '💯'];

  if (loading) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="text-center text-slate-400">Loading meeting...</div>
      </section>
    );
  }

  if (error || !meeting) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="rounded-lg border border-red-700 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error || 'Meeting not found'}
        </div>
      </section>
    );
  }

  // Show name input if not provided
  if (showNameInput) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <h2 className="text-2xl font-semibold tracking-tight">{meeting.title}</h2>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-6">
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="userName" className="text-sm font-medium text-slate-300">
                Enter your name to join <span className="text-red-400">*</span>
              </label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                placeholder="Your name"
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Join Meeting Room
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{meeting.title}</h2>
          <p className="text-sm text-slate-400">
            Meeting Code: <span className="font-mono">{meeting.meetingCode}</span>
            {isConnected && (
              <span className="ml-2 text-green-400">● Connected</span>
            )}
            {!isConnected && (
              <span className="ml-2 text-red-400">● Disconnected</span>
            )}
          </p>
        </div>
        <button
          onClick={handleEndOrLeaveMeeting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Leave Meeting
        </button>
      </div>

      {/* Full screen video room */}
      <div className="relative h-[calc(100vh-12rem)] w-full">
        {isLoadingToken ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/40">
            <div className="text-center text-sm text-slate-400">
              <p>Connecting to video room...</p>
            </div>
          </div>
        ) : liveKitError ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-red-700 bg-red-900/20">
            <div className="text-center text-sm text-red-300">
              <p className="font-medium">Video Connection Error</p>
              <p className="mt-1 text-xs">{liveKitError}</p>
              <p className="mt-2 text-xs text-slate-400">
                Chat and reactions are still available
              </p>
            </div>
          </div>
        ) : liveKitToken && liveKitUrl ? (
          <VideoRoom
            token={liveKitToken}
            serverUrl={liveKitUrl}
            meetingCode={meetingCode!}
            userName={userName}
            onDisconnect={() => {
              setLiveKitToken(null);
              setLiveKitUrl(null);
            }}
            onLeave={handleEndOrLeaveMeeting}
            onToggleChat={handleToggleChat}
            onToggleReactions={handleToggleReactions}
            isChatOpen={isChatOpen}
            isReactionsOpen={isReactionsOpen}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/40">
            <div className="text-center text-sm text-slate-400">
              <p>Preparing video room...</p>
            </div>
          </div>
        )}

        {/* Chat and Reactions Overlay */}
        <ChatReactionsOverlay
          isChatOpen={isChatOpen}
          isReactionsOpen={isReactionsOpen}
          chatMessages={chatMessages}
          reactions={reactions}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onSendMessage={handleSendMessage}
          onSendReaction={handleSendReaction}
          commonReactions={commonReactions}
          userName={userName}
        />
      </div>
    </section>
  );
};

export default MeetingRoomPage;

