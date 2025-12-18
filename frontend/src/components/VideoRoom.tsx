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
}

const VideoRoom = ({ token, serverUrl, meetingCode, userName, onDisconnect }: VideoRoomProps) => {
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
      <RoomContent meetingCode={meetingCode} onDisconnect={onDisconnect} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

/**
 * Room content component that renders video tracks
 */
const RoomContent = ({ meetingCode, onDisconnect }: { meetingCode: string; onDisconnect?: () => void }) => {
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

  // Responsive grid layout
  // 1 participant: full screen
  // 2 participants: side by side
  // 3+ participants: grid
  const gridCols = tracks.length === 1 ? 'grid-cols-1' : tracks.length === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridCols} h-full gap-2 p-2`}>
      {tracks.map((track) => (
        <VideoTrack
          key={`${track.participant.identity}-${track.publication?.trackSid || 'unknown'}`}
          trackRef={track}
          className="h-full w-full rounded-lg object-cover"
        />
      ))}
    </div>
  );
};

export default VideoRoom;

