import { useEffect, useState } from 'react';
import { RoomEvent, Track, DisconnectReason } from 'livekit-client';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  RoomAudioRenderer,
  useRoomContext,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import MediaControls from './MediaControls';
import ParticipantsList from './ParticipantsList';

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
  onToggleParticipants?: () => void;
  isChatOpen?: boolean;
  isReactionsOpen?: boolean;
  isParticipantsOpen?: boolean;
  raisedHands?: Set<string>;
  onRoomReady?: (room: any) => void;
  unreadMessageCount?: number;
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
  onToggleParticipants,
  isChatOpen,
  isReactionsOpen,
  isParticipantsOpen,
  raisedHands = new Set(),
  onRoomReady,
  unreadMessageCount = 0
}: VideoRoomProps) => {
  // Handle connection errors
  const handleError = (err: Error) => {
    console.error('LiveKit connection error:', err);
  };

  // Don't render if token is invalid/null
  if (!token || !serverUrl) {
    return null;
  }

  return (
    <div className="relative h-full w-full bg-slate-900 rounded-lg overflow-hidden">
      <LiveKitRoom
        video={initialCameraEnabled}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onError={handleError}
        className="h-full w-full relative"
      >
        <RoomContent 
          meetingCode={meetingCode} 
          userName={userName} 
          onDisconnect={onDisconnect} 
          onLeave={onLeave}
          raisedHands={raisedHands}
          onRoomReady={onRoomReady}
        />
        <RoomAudioRenderer />
        <MediaControls 
          meetingCode={meetingCode} 
          userName={userName}
          initialMicEnabled={initialMicEnabled}
          initialCameraEnabled={initialCameraEnabled}
          onLeave={onLeave}
          onToggleChat={onToggleChat}
          onToggleReactions={onToggleReactions}
          onToggleParticipants={onToggleParticipants}
          isChatOpen={isChatOpen}
          isReactionsOpen={isReactionsOpen}
          isParticipantsOpen={isParticipantsOpen}
          unreadMessageCount={unreadMessageCount}
        />
        {onToggleParticipants && token && (
          <ParticipantsList
            isOpen={isParticipantsOpen || false}
            onClose={onToggleParticipants}
            userName={userName}
            raisedHands={raisedHands}
          />
        )}
      </LiveKitRoom>
    </div>
  );
};

/**
 * Room content component that renders video tracks
 */
const RoomContent = ({ 
  meetingCode, 
  userName,
  onDisconnect,
  onLeave,
  raisedHands = new Set(),
  onRoomReady
}: { 
  meetingCode: string; 
  userName: string;
  onDisconnect?: () => void;
  onLeave?: () => void;
  raisedHands?: Set<string>;
  onRoomReady?: (room: any) => void;
}) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
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
      // Notify parent that room is ready
      if (onRoomReady && room) {
        onRoomReady(room);
      }
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
  // Only show active screen share tracks (not muted, has track)
  const screenShareTracks = tracks.filter((t) => {
    if (t.source !== Track.Source.ScreenShare) return false;
    const publication = t.publication;
    const videoTrack = publication?.track;
    const isTrackDisabled =
      (videoTrack as any)?.mediaStreamTrack?.enabled === false ||
      (videoTrack as any)?.track?.enabled === false ||
      (videoTrack as any)?.enabled === false;
    // Only include if track exists, is not muted, and is not disabled
    return !!(videoTrack && !isTrackDisabled && !publication?.isMuted);
  });

  // Helper function to render a video track tile
  const renderVideoTile = (trackRef: any, isScreenShare: boolean = false) => {
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

    const participantIdentity = participant.identity || '';
    const isHandRaised = raisedHands.has(participantIdentity);

    return (
      <div
        key={trackRef.publication?.trackSid || participant.identity}
        className={`relative overflow-hidden rounded-lg ${isScreenShare ? 'bg-slate-950 h-full' : ''}`}
      >
        {hasActiveVideo ? (
          <VideoTrack
            trackRef={trackRef as any}
            className={`h-full w-full bg-slate-800 ${isScreenShare ? 'object-contain' : 'object-cover'}`}
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

        {/* Screen Share Indicator */}
        {isScreenShare && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-blue-600/90 px-2 py-1 shadow-lg">
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs font-medium text-white">Screen Sharing</span>
          </div>
        )}

        {/* Raise Hand Indicator - Top Left */}
        {isHandRaised && !isScreenShare && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-yellow-500/90 px-2 py-1 shadow-lg">
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
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
              />
            </svg>
            <span className="text-xs font-medium text-white">Hand Raised</span>
          </div>
        )}

        {/* Name + indicators */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white">
              {isScreenShare ? `${participant.identity}'s Screen` : participant.identity}
              {isLocal && ' (You)'}
            </span>
            {!isScreenShare && (
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
            )}
          </div>
        </div>
      </div>
    );
  };

  // Show placeholder if no tracks yet, but show local participant placeholder
  if (cameraTracks.length === 0 && screenShareTracks.length === 0) {
    return (
      <div className="grid grid-cols-1 h-full gap-2 p-2 bg-slate-900">
        {localParticipant && (
          <div className="relative overflow-hidden rounded-lg bg-slate-800 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-semibold text-slate-300">
                {localParticipant.identity?.charAt(0).toUpperCase() || userName?.charAt(0).toUpperCase() || '?'}
              </div>
              <p className="text-sm text-slate-400">
                {localParticipant.identity || userName || 'You'}
                <span className="ml-1 text-xs">(You)</span>
              </p>
              <p className="text-xs text-slate-500">Camera is off</p>
            </div>
            {/* Name + indicators */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">
                  {localParticipant.identity || userName || 'You'} (You)
                </span>
              </div>
            </div>
          </div>
        )}
        {!localParticipant && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-slate-600 animate-pulse"
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
              </div>
              <p className="text-sm font-medium">Connecting...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If there are screen shares, show them full screen on left with participants on right
  if (screenShareTracks.length > 0) {
    return (
      <div className="flex h-full gap-2 p-2 bg-slate-900">
        {/* Screen Share Section - Full screen on the left */}
        <div className="flex-1 min-w-0 h-full">
          {screenShareTracks.map((trackRef) => (
            <div key={trackRef.publication?.trackSid || trackRef.participant.identity} className="h-full">
              {renderVideoTile(trackRef, true)}
            </div>
          ))}
        </div>
        
        {/* Camera Tracks Section - Vertical column on the right */}
        {cameraTracks.length > 0 && (
          <div className="flex flex-col gap-2 w-64 flex-shrink-0 overflow-y-auto">
            {cameraTracks.map((trackRef) => (
              <div key={trackRef.publication?.trackSid || trackRef.participant.identity} className="h-48 flex-shrink-0">
                {renderVideoTile(trackRef, false)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // No screen shares, show camera tracks in grid
  return (
    <div
      className={`grid ${
        cameraTracks.length === 1
          ? 'grid-cols-1'
          : cameraTracks.length === 2
          ? 'grid-cols-2'
          : 'grid-cols-2 lg:grid-cols-3'
      } h-full gap-2 p-2 bg-slate-900`}
    >
      {cameraTracks.map((trackRef) => renderVideoTile(trackRef, false))}
    </div>
  );
};

export default VideoRoom;

