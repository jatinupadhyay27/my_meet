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
      video={true}
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

  // Get all video tracks from participants (filter out placeholders)
  const allTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  // Filter out placeholder tracks - VideoTrack only accepts actual TrackReference
  const tracks = allTracks.filter((track) => track.publication !== undefined);

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

  if (tracks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/40">
        <div className="text-center text-sm text-slate-400">
          <p>Waiting for participants to join...</p>
          <p className="mt-1 text-xs">Video will appear here when others join</p>
        </div>
      </div>
    );
  }

  // Separate screen shares from camera tracks
  const screenShares = tracks.filter((track) => track.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((track) => track.source === Track.Source.Camera);

  // If screen share exists, show it big with small participant videos
  if (screenShares.length > 0) {
    return (
      <div className="flex h-full gap-2 p-2">
        {/* Main screen share - takes most of the space */}
        <div className="flex-1">
          {screenShares.map((track) => {
            const participant = track.participant;
            return (
              <div
                key={`${participant.identity}-${track.publication?.trackSid || 'unknown'}`}
                className="relative h-full w-full overflow-hidden rounded-lg ring-2 ring-blue-500"
              >
                <VideoTrack
                  trackRef={track}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">
                      {participant.identity || 'Participant'} - Screen Share
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Small participant videos on the right */}
        {cameraTracks.length > 0 && (
          <div className="flex w-64 flex-col gap-2 overflow-y-auto">
            {cameraTracks.map((track) => {
              const participant = track.participant;
              const isCameraOff = !track.publication?.track || track.publication?.isMuted || false;
              const audioTrack = Array.from(participant.audioTrackPublications.values()).find(
                (pub) => pub.track !== undefined
              );
              const isMicMuted = audioTrack?.isMuted ?? false;

              return (
                <div
                  key={`${participant.identity}-${track.publication?.trackSid || 'unknown'}`}
                  className="relative aspect-video w-full overflow-hidden rounded-lg"
                >
                  {isCameraOff ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-800">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-lg font-semibold text-slate-300">
                          {participant.identity?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <p className="text-xs text-slate-400">{participant.identity || 'Participant'}</p>
                      </div>
                    </div>
                  ) : (
                    <VideoTrack
                      trackRef={track}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white truncate">
                        {participant.identity || 'Participant'}
                      </span>
                      {isMicMuted && (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-white"
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
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // No screen share - show camera videos in full screen grid
  const gridCols =
    cameraTracks.length === 1
      ? 'grid-cols-1'
      : cameraTracks.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridCols} h-full gap-2 p-2`}>
      {cameraTracks.map((track) => {
        const isScreenShare = track.source === Track.Source.ScreenShare;
        const participant = track.participant;
        
        // Check if camera is off (no video track or muted)
        const isCameraOff = !track.publication?.track || track.publication?.isMuted || false;
        
        // Check if mic is muted
        const audioTrack = Array.from(participant.audioTrackPublications.values()).find(
          (pub) => pub.track !== undefined
        );
        const isMicMuted = audioTrack?.isMuted ?? false;

        return (
          <div
            key={`${participant.identity}-${track.publication?.trackSid || 'unknown'}`}
            className={`relative h-full w-full overflow-hidden rounded-lg ${
              isScreenShare ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''
            }`}
          >
            {isCameraOff && !isScreenShare ? (
              // Camera off placeholder with avatar
              <div className="flex h-full w-full items-center justify-center bg-slate-800">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-semibold text-slate-300">
                    {participant.identity?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <p className="text-sm text-slate-400">{participant.identity || 'Participant'}</p>
                </div>
              </div>
            ) : (
              <VideoTrack
                trackRef={track}
                className="h-full w-full object-cover"
              />
            )}

            {/* Overlay with participant info and indicators */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">
                    {participant.identity || 'Participant'}
                  </span>
                  {isScreenShare && (
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">
                      Screen
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Mic muted indicator */}
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
                  {/* Camera off indicator */}
                  {isCameraOff && !isScreenShare && (
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

