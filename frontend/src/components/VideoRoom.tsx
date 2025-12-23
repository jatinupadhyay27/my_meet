import { useEffect, useState } from 'react';
import { RoomEvent, Track, DisconnectReason } from 'livekit-client';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import MediaControls from './MediaControls';

/**
 * VideoRoom component for LiveKit video/audio conferencing
 * 
 * This component:
 * - Connects to LiveKit using token + URL
 * - Auto joins meeting room
 * - Renders video tiles for participants
 * - Handles audio tracks
 * - Responsive grid layout
 * 
 * Extended in Day 5 for mic/camera toggle
 * Screen sharing added in Day 5
 * Recording hooks added in Day 6
 */

interface VideoRoomProps {
  token: string;
  serverUrl: string;
  meetingCode: string;
  userName: string;
  initialMicEnabled?: boolean;
  initialCameraEnabled?: boolean;
  onDisconnect?: () => void;
  onLeave?: () => void;
  onToggleChat?: () => void;
  onToggleReactions?: () => void;
  isChatOpen?: boolean;
  isReactionsOpen?: boolean;
}

const VideoRoom = ({ 
  token, 
  serverUrl, 
  meetingCode, 
  userName,
  initialMicEnabled = true,
  initialCameraEnabled = true,
  onDisconnect, 
  onLeave,
  onToggleChat,
  onToggleReactions,
  isChatOpen,
  isReactionsOpen
}: VideoRoomProps) => {
  // Handle connection errors
  const handleError = (err: Error) => {
    console.error('LiveKit connection error:', err);
  };

  return (
    <LiveKitRoom
      video={initialCameraEnabled}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onError={handleError}
      className="h-full w-full"
    >
      <RoomContent meetingCode={meetingCode} userName={userName} onDisconnect={onDisconnect} onLeave={onLeave} />
      <RoomAudioRenderer />
      <MediaControls 
        meetingCode={meetingCode} 
        userName={userName}
        initialMicEnabled={initialMicEnabled}
        initialCameraEnabled={initialCameraEnabled}
        onLeave={onLeave}
        onToggleChat={onToggleChat}
        onToggleReactions={onToggleReactions}
        isChatOpen={isChatOpen}
        isReactionsOpen={isReactionsOpen}
      />
    </LiveKitRoom>
  );
};

/**
 * Room content component that renders video tracks
 */
const RoomContent = ({ 
  meetingCode, 
  userName,
  onDisconnect,
  onLeave 
}: { 
  meetingCode: string; 
  userName: string;
  onDisconnect?: () => void;
  onLeave?: () => void;
}) => {
  const room = useRoomContext();
  const [isConnected, setIsConnected] = useState(false);
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  // Set up event listeners
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      console.log('Connected to LiveKit room:', meetingCode);
      setIsConnected(true);
    };

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log('Disconnected from LiveKit room:', reason);
      setIsConnected(false);
      if (onDisconnect) {
        onDisconnect();
      }
    };

    // Check initial state
    if (room.state === 'connected') {
      setIsConnected(true);
    }

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, meetingCode, onDisconnect]);

  if (room.state === 'connecting') {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/40">
        <div className="text-center text-sm text-slate-400">
          <p>Connecting to video room...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/40">
        <div className="text-center text-sm text-slate-400">
          <p>Connecting to video room...</p>
        </div>
      </div>
    );
  }

  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  return (
    <div
      className={`grid ${
        cameraTracks.length === 1
          ? 'grid-cols-1'
          : cameraTracks.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-2 lg:grid-cols-3'
      } h-full gap-2 p-2`}
    >
      {cameraTracks.map((trackRef) => {
        const participant = trackRef.participant;
        const isLocal = participant.isLocal;
        const publication = trackRef.publication;
        const videoTrack = publication?.track;
        const isTrackDisabled =
          (videoTrack as any)?.mediaStreamTrack?.enabled === false ||
          (videoTrack as any)?.track?.enabled === false ||
          (videoTrack as any)?.enabled === false;
        const isCameraOff = !videoTrack || publication?.isMuted || isTrackDisabled || false;

        const audioTrackPub = Array.from(participant.audioTrackPublications.values()).find(
          (pub: any) => pub.track !== undefined
        );
        const isMicMuted = (audioTrackPub as any)?.isMuted ?? false;

        const hasActiveVideo = !!(videoTrack && !isTrackDisabled && !publication?.isMuted);

        return (
          <div
            key={trackRef.publication?.trackSid || participant.identity}
            className="relative overflow-hidden rounded-lg"
          >
            {hasActiveVideo ? (
              <VideoTrack
                trackRef={trackRef as any}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-48 w-full items-center justify-center bg-slate-800">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-semibold text-slate-300">
                    {participant.identity?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <p className="text-sm text-slate-400">{participant.identity || 'Participant'}</p>
                </div>
              </div>
            )}

            {/* Name + indicators */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">
                  {participant.identity}
                  {isLocal && ' (You)'}
                </span>
                <div className="flex items-center gap-1">
                  {isMicMuted && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-white"
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
                    </div>
                  )}
                  {isCameraOff && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-white"
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VideoRoom;

