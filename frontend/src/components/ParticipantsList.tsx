import { useEffect, useState, useRef } from 'react';
import { useRoomContext, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track, RoomEvent, Participant, RemoteParticipant } from 'livekit-client';

interface ParticipantInfo {
  identity: string;
  isLocal: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isHandRaised: boolean;
}

interface ParticipantsListProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  raisedHands: Set<string>;
}

const ParticipantsList = ({
  isOpen,
  onClose,
  userName,
  raisedHands,
}: ParticipantsListProps) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [participantInfos, setParticipantInfos] = useState<ParticipantInfo[]>([]);
  
  // Use useTracks to get real-time track updates - this will trigger re-renders when tracks change
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );
  
  // Use a ref to track if we should update
  const updateIntervalRef = useRef<number | null>(null);

  // Main effect for updating participant info
  useEffect(() => {
    if (!isOpen) {
      // Clear interval when closed
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    const updateParticipantInfos = () => {
      // If room is not available yet, show empty or loading state
      if (!room) {
        setParticipantInfos([]);
        return;
      }

      // Get all remote participants from room
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      
      // Combine local and remote participants
      const participantsList: (Participant | RemoteParticipant)[] = localParticipant 
        ? [localParticipant, ...remoteParticipants]
        : [...remoteParticipants];

      const infos: ParticipantInfo[] = participantsList.map((participant) => {
        // Check mic status
        const audioTracks = Array.from(participant.audioTrackPublications.values());
        const micTrack = audioTracks.find((pub) => pub.track !== undefined);
        const isMicOn = micTrack ? !micTrack.isMuted : false;

        // Check camera status - similar to VideoRoom logic
        const videoTracks = Array.from(participant.videoTrackPublications.values());
        const cameraTrackPub = videoTracks.find(
          (pub) => pub.source === Track.Source.Camera && pub.track !== undefined
        );
        
        let isCameraOn = false;
        // Camera is ON only if:
        // 1. Track publication exists
        // 2. Track exists
        // 3. Track is not muted
        // 4. Track is enabled
        if (cameraTrackPub && cameraTrackPub.track) {
          const videoTrack = cameraTrackPub.track;
          // Check if track is enabled (not disabled)
          const isTrackDisabled =
            (videoTrack as any)?.mediaStreamTrack?.enabled === false ||
            (videoTrack as any)?.track?.enabled === false ||
            (videoTrack as any)?.enabled === false;
          
          // Camera is ON if track exists, is not muted, and is enabled
          isCameraOn = !cameraTrackPub.isMuted && !isTrackDisabled;
        } else {
          // No camera track publication means camera is off
          isCameraOn = false;
        }

        return {
          identity: participant.identity || 'Unknown',
          isLocal: participant.isLocal,
          isMicOn,
          isCameraOn,
          isHandRaised: raisedHands.has(participant.identity || ''),
        };
      });

      // Sort: local participant first, then by name
      infos.sort((a, b) => {
        if (a.isLocal) return -1;
        if (b.isLocal) return 1;
        return a.identity.localeCompare(b.identity);
      });

      setParticipantInfos(infos);
    };

    // Initial update
    updateParticipantInfos();

    // Only set up listeners if room is available
    if (!room) return;

    // Set up polling as a fallback to ensure we catch all state changes
    // Poll every 500ms to catch any missed events
    updateIntervalRef.current = window.setInterval(() => {
      updateParticipantInfos();
    }, 500);

    // Track event handlers - update immediately for real-time updates
    const handleTrackPublished = () => {
      updateParticipantInfos();
      // Also update after a small delay to ensure track state is fully initialized
      setTimeout(updateParticipantInfos, 50);
    };
    const handleTrackUnpublished = () => {
      updateParticipantInfos();
    };
    const handleTrackMuted = () => {
      updateParticipantInfos();
    };
    const handleTrackUnmuted = () => {
      updateParticipantInfos();
    };
    
    // Also listen to track state changes on individual participants for more reliable updates
    const setupParticipantListeners = () => {
      if (!room) return;
      
      const allParticipants = localParticipant 
        ? [localParticipant, ...Array.from(room.remoteParticipants.values())]
        : Array.from(room.remoteParticipants.values());
      
      allParticipants.forEach((participant) => {
        // Remove existing listeners first to avoid duplicates
        participant.off('trackPublished', handleTrackPublished);
        participant.off('trackUnpublished', handleTrackUnpublished);
        participant.off('trackMuted', handleTrackMuted);
        participant.off('trackUnmuted', handleTrackUnmuted);
        
        // Add new listeners
        participant.on('trackPublished', handleTrackPublished);
        participant.on('trackUnpublished', handleTrackUnpublished);
        participant.on('trackMuted', handleTrackMuted);
        participant.on('trackUnmuted', handleTrackUnmuted);
      });
    };
    
    // Listen for participant changes - update immediately
    const handleParticipantConnected = () => {
      // Re-setup listeners for all participants including the new one
      setupParticipantListeners();
      // Update immediately, then again after a short delay to catch any tracks that publish slightly later
      updateParticipantInfos();
      setTimeout(updateParticipantInfos, 150);
    };
    const handleParticipantDisconnected = () => {
      setupParticipantListeners(); // Re-setup to remove disconnected participant
      updateParticipantInfos();
    };

    // Room-level event listeners
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    room.on(RoomEvent.TrackUnpublished, handleTrackUnpublished);
    room.on(RoomEvent.TrackMuted, handleTrackMuted);
    room.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);
    
    // Initial setup of participant listeners
    setupParticipantListeners();
    
    // Re-setup listeners when new participants join (already handled by handleParticipantConnected)

    return () => {
      // Clear polling interval
      if (updateIntervalRef.current !== null) {
        window.clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      
      if (room) {
        room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
        room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        room.off(RoomEvent.TrackPublished, handleTrackPublished);
        room.off(RoomEvent.TrackUnpublished, handleTrackUnpublished);
        room.off(RoomEvent.TrackMuted, handleTrackMuted);
        room.off(RoomEvent.TrackUnmuted, handleTrackUnmuted);
        
        // Clean up participant listeners
        const allParticipants = localParticipant 
          ? [localParticipant, ...Array.from(room.remoteParticipants.values())]
          : Array.from(room.remoteParticipants.values());
        
        allParticipants.forEach((participant) => {
          participant.off('trackPublished', handleTrackPublished);
          participant.off('trackUnpublished', handleTrackUnpublished);
          participant.off('trackMuted', handleTrackMuted);
          participant.off('trackUnmuted', handleTrackUnmuted);
        });
      }
    };
  }, [room, localParticipant, isOpen, raisedHands, tracks]); // Add tracks as dependency to trigger updates

  // Separate effect that triggers update when tracks change (from useTracks hook)
  useEffect(() => {
    if (!isOpen || !room) return;
    
    // Force an update when tracks change
    const updateParticipantInfos = () => {
      if (!room) {
        setParticipantInfos([]);
        return;
      }

      const remoteParticipants = Array.from(room.remoteParticipants.values());
      const participantsList: (Participant | RemoteParticipant)[] = localParticipant 
        ? [localParticipant, ...remoteParticipants]
        : [...remoteParticipants];

      const infos: ParticipantInfo[] = participantsList.map((participant) => {
        const audioTracks = Array.from(participant.audioTrackPublications.values());
        const micTrack = audioTracks.find((pub) => pub.track !== undefined);
        const isMicOn = micTrack ? !micTrack.isMuted : false;

        const videoTracks = Array.from(participant.videoTrackPublications.values());
        const cameraTrackPub = videoTracks.find(
          (pub) => pub.source === Track.Source.Camera && pub.track !== undefined
        );
        
        let isCameraOn = false;
        if (cameraTrackPub && cameraTrackPub.track) {
          const videoTrack = cameraTrackPub.track;
          const isTrackDisabled =
            (videoTrack as any)?.mediaStreamTrack?.enabled === false ||
            (videoTrack as any)?.track?.enabled === false ||
            (videoTrack as any)?.enabled === false;
          isCameraOn = !cameraTrackPub.isMuted && !isTrackDisabled;
        }

        return {
          identity: participant.identity || 'Unknown',
          isLocal: participant.isLocal,
          isMicOn,
          isCameraOn,
          isHandRaised: raisedHands.has(participant.identity || ''),
        };
      });

      infos.sort((a, b) => {
        if (a.isLocal) return -1;
        if (b.isLocal) return 1;
        return a.identity.localeCompare(b.identity);
      });

      setParticipantInfos(infos);
    };
    
    updateParticipantInfos();
  }, [tracks, isOpen, room, localParticipant, raisedHands]);

  if (!isOpen) return null;

  // Show loading state if room is not ready
  if (!room) {
    return (
      <div
        className="fixed left-0 top-0 z-30 h-full w-80 bg-slate-900/95 backdrop-blur-sm transition-all duration-300 border-r border-slate-700 translate-x-0"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-700 bg-slate-800/60 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Participants</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Close participants list"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-500">Connecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 top-0 z-30 h-full w-80 bg-slate-900/95 backdrop-blur-sm transition-all duration-300 border-r border-slate-700 translate-x-0"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-slate-700 bg-slate-800/60 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Participants ({participantInfos.length})</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close participants list"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {participantInfos.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No participants</p>
          ) : (
            participantInfos.map((participant) => (
              <div
                key={participant.identity}
                className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300 flex-shrink-0">
                      {participant.identity.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {participant.identity}
                        {participant.isLocal && (
                          <span className="ml-1 text-xs text-slate-400">(You)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Mic Status Icon */}
                    <div title={participant.isMicOn ? "Microphone on" : "Microphone off"}>
                      {participant.isMicOn ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-green-400"
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
                          className="h-4 w-4 text-red-400"
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

                    {/* Camera Status Icon */}
                    <div title={participant.isCameraOn ? "Camera on" : "Camera off"}>
                      {participant.isCameraOn ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-green-400"
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
                          className="h-4 w-4 text-red-400"
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

                    {/* Hand Raised Icon */}
                    {participant.isHandRaised && (
                      <div className="flex-shrink-0" title="Hand raised">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-yellow-400"
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
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;

