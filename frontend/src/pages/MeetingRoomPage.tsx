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
  const [initialMicEnabled, setInitialMicEnabled] = useState(true);
  const [initialCameraEnabled, setInitialCameraEnabled] = useState(true);
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

  // Show name input and media preferences on the same screen
  if (showNameInput) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
        <h2 className="text-2xl font-semibold tracking-tight">{meeting.title}</h2>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-6">
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-6">
            {/* Name Input */}
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

            {/* Media Preferences */}
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-slate-300">
                Choose your audio and video settings
              </p>
              
              {/* Microphone Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                    initialMicEnabled
                      ? 'bg-slate-700 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {initialMicEnabled ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <label htmlFor="micToggle" className="text-sm font-medium text-slate-300 cursor-pointer">
                      Microphone
                    </label>
                    <p className="text-xs text-slate-400">
                      {initialMicEnabled ? 'Your microphone will be on' : 'Your microphone will be off'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInitialMicEnabled(!initialMicEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    initialMicEnabled ? 'bg-sky-600' : 'bg-slate-600'
                  }`}
                  role="switch"
                  aria-checked={initialMicEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      initialMicEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Camera Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                    initialCameraEnabled
                      ? 'bg-slate-700 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {initialCameraEnabled ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <label htmlFor="cameraToggle" className="text-sm font-medium text-slate-300 cursor-pointer">
                      Camera
                    </label>
                    <p className="text-xs text-slate-400">
                      {initialCameraEnabled ? 'Your camera will be on' : 'Your camera will be off'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInitialCameraEnabled(!initialCameraEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    initialCameraEnabled ? 'bg-sky-600' : 'bg-slate-600'
                  }`}
                  role="switch"
                  aria-checked={initialCameraEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      initialCameraEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
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
            initialMicEnabled={initialMicEnabled}
            initialCameraEnabled={initialCameraEnabled}
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

