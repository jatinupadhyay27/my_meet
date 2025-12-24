import { useState, useEffect } from 'react';
import { Track, RoomEvent } from 'livekit-client';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { emitMediaStateChanged, raiseHand } from '../services/socket.service';

/**
 * MediaControls component for meeting media controls
 * 
 * Features:
 * - Toggle microphone ON/OFF
 * - Toggle camera ON/OFF
 * - Start/Stop screen sharing
 * - Leave meeting button (placeholder)
 * 
 * Uses LiveKit APIs to control local media tracks
 * Recording hooks added in Day 6
 * Audio capture used for AI transcription
 * Media state analytics later
 */

interface MediaControlsProps {
  onLeave?: () => void;
  meetingCode?: string;
  userName?: string;
  initialMicEnabled?: boolean;
  initialCameraEnabled?: boolean;
  onToggleChat?: () => void;
  onToggleReactions?: () => void;
  onToggleParticipants?: () => void;
  isChatOpen?: boolean;
  isReactionsOpen?: boolean;
  isParticipantsOpen?: boolean;
}

const MediaControls = ({ 
  onLeave, 
  meetingCode, 
  userName,
  initialMicEnabled = true,
  initialCameraEnabled = true,
  onToggleChat, 
  onToggleReactions,
  onToggleParticipants,
  isChatOpen = false,
  isReactionsOpen = false,
  isParticipantsOpen = false
}: MediaControlsProps) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  
  // Media state - initialize with provided preferences
  const [isMicOn, setIsMicOn] = useState(initialMicEnabled);
  const [isCameraOn, setIsCameraOn] = useState(initialCameraEnabled);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [initialPreferencesApplied, setInitialPreferencesApplied] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [currentSharer, setCurrentSharer] = useState<string | null>(null);
  
  // Track if we've manually set the state (to prevent sync from overriding)
  const [stateManuallySet, setStateManuallySet] = useState(false);

  // Helper function to disable video track immediately (synchronous)
  const disableVideoTrack = (track: any) => {
    // Try multiple ways to access the underlying MediaStreamTrack
    const mediaStreamTrack = track?.mediaStreamTrack || 
                             track?.track ||
                             track;
    
    // Disable the track immediately - this is synchronous and prevents video from showing
    if (mediaStreamTrack && typeof mediaStreamTrack.enabled !== 'undefined') {
      try {
        mediaStreamTrack.enabled = false;
      } catch (e) {
        console.warn('Failed to disable MediaStreamTrack:', e);
      }
    }
  };

  // Helper function to enable video track
  const enableVideoTrack = (track: any) => {
    const mediaStreamTrack = track?.mediaStreamTrack || 
                             track?.track ||
                             track;
    
    if (mediaStreamTrack && typeof mediaStreamTrack.enabled !== 'undefined') {
      try {
        mediaStreamTrack.enabled = true;
      } catch (e) {
        console.warn('Failed to enable MediaStreamTrack:', e);
      }
    }
  };

  // Completely stop and unpublish camera track (like Google Meet/Zoom)
  const stopCameraCompletely = async () => {
    if (!localParticipant) return;

    const cameraPub = Array.from(
      localParticipant.videoTrackPublications.values()
    ).find(pub => pub.source === Track.Source.Camera);

    if (cameraPub?.track) {
      try {
        await localParticipant.unpublishTrack(cameraPub.track);
        cameraPub.track.stop(); // important
      } catch (e) {
        console.warn('Failed to fully stop camera:', e);
      }
    }
    setIsCameraOn(false);
  };

  // Apply initial preferences when room connects and tracks are published
  useEffect(() => {
    if (!room || !localParticipant || initialPreferencesApplied) return;

    // Also listen for room connection to apply preferences immediately
    const handleRoomConnected = () => {
      // Apply immediately without delay for video to prevent it from showing
      if (initialPreferencesApplied) return;
      
      // Check tracks immediately
      const checkAndApply = () => {
        if (initialPreferencesApplied) return;
        
        const audioTracks = Array.from(localParticipant.audioTrackPublications.values());
        const videoTracks = Array.from(localParticipant.videoTrackPublications.values());
        const micTrack = audioTracks.find((pub) => pub.track !== undefined);
        const cameraTrack = videoTracks.find((pub) => pub.source === Track.Source.Camera && pub.track !== undefined);

        if (micTrack?.track) {
          const shouldBeMuted = !initialMicEnabled;
          if (shouldBeMuted && !micTrack.track.isMuted) {
            // Mute immediately - don't await to prevent delay
            micTrack.track.mute().then(() => {
              setIsMicOn(false);
              setStateManuallySet(true);
            }).catch(console.warn);
            // Set state optimistically
            setIsMicOn(false);
            setStateManuallySet(true);
          } else if (!shouldBeMuted && micTrack.track.isMuted) {
            micTrack.track.unmute().then(() => {
              setIsMicOn(true);
              setStateManuallySet(true);
            }).catch(console.warn);
            setIsMicOn(true);
            setStateManuallySet(true);
          } else {
            setIsMicOn(!shouldBeMuted);
            setStateManuallySet(true);
          }
        }

        if (cameraTrack?.track) {
          const shouldBeMuted = !initialCameraEnabled;
          if (shouldBeMuted) {
            // CRITICAL: Disable track IMMEDIATELY (synchronous) to prevent video from showing
            disableVideoTrack(cameraTrack.track);
            setIsCameraOn(false);
            setStateManuallySet(true);
            
            // Then unpublish completely (async)
            stopCameraCompletely().then(() => {
              setInitialPreferencesApplied(true);
            }).catch(console.warn);
            return; // Exit early after stopping camera
          } else {
            // Enable track immediately
            enableVideoTrack(cameraTrack.track);
            if (cameraTrack.track.isMuted) {
              cameraTrack.track.unmute().then(() => {
                setIsCameraOn(true);
                setStateManuallySet(true);
              }).catch(console.warn);
            }
            setIsCameraOn(true);
            setStateManuallySet(true);
          }
        }
      };
      
      // Try immediately first
      checkAndApply();
      
      // Also try after a small delay as fallback for tracks that publish slightly later
      setTimeout(checkAndApply, 100);
    };

    // Check if room is already connected
    if (room.state === 'connected') {
      handleRoomConnected();
    }

    room.on(RoomEvent.Connected, handleRoomConnected);

    return () => {
      room.off(RoomEvent.Connected, handleRoomConnected);
    };
  }, [room, localParticipant, initialMicEnabled, initialCameraEnabled, initialPreferencesApplied]);

  // Apply initial preferences when tracks are published
  useEffect(() => {
    if (!localParticipant || initialPreferencesApplied) return;

    // Immediate handler for when tracks are published - use publication mute
    const handleTrackPublishedImmediate = async (publication: any) => {
      if (initialPreferencesApplied) return;
      
      const track = publication.track;
      if (!track) return;

      try {
        // Use publication's mute method which is more reliable
        // Check if it's an audio track
        if (track.kind === 'audio') {
          if (!initialMicEnabled) {
            // Mute the track immediately
            if (!track.isMuted) {
              track.mute().catch(console.warn);
            }
            setIsMicOn(false);
            setStateManuallySet(true);
          } else {
            // Ensure it's unmuted
            if (track.isMuted) {
              track.unmute().catch(console.warn);
            }
            setIsMicOn(true);
            setStateManuallySet(true);
          }
        }
        // Check if it's a camera video track
        else if (track.kind === 'video' && publication.source === Track.Source.Camera) {
          if (!initialCameraEnabled) {
            // CRITICAL: Disable track IMMEDIATELY (synchronous) to prevent video from showing
            disableVideoTrack(track);
            setIsCameraOn(false);
            setStateManuallySet(true);
            
            // Then unpublish completely (async)
            stopCameraCompletely().then(() => {
              setInitialPreferencesApplied(true);
            }).catch(console.warn);
          } else {
            // Ensure it's enabled and unmuted
            enableVideoTrack(track);
            if (track.isMuted) {
              track.unmute().catch(console.warn);
            }
            setIsCameraOn(true);
            setStateManuallySet(true);
          }
        }
      } catch (error) {
        console.warn('Failed to apply preference immediately:', error);
      }
    };

    const applyInitialPreferences = async () => {
      // Retry logic to handle tracks that might not be ready immediately
      let retries = 0;
      const maxRetries = 15;
      
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));

        let micApplied = false;
        let cameraApplied = false;
        let micTrackFound = false;
        let cameraTrackFound = false;

        // Apply mic preference
        const audioTracks = Array.from(localParticipant.audioTrackPublications.values());
        const micTrack = audioTracks.find((pub) => pub.track !== undefined);
        micTrackFound = !!micTrack?.track;
        
        if (micTrack?.track) {
          try {
            const shouldBeMuted = !initialMicEnabled;
            
            // Mute/unmute the track directly
            if (shouldBeMuted && !micTrack.track.isMuted) {
              micTrack.track.mute().catch(console.warn);
              setIsMicOn(false);
              setStateManuallySet(true);
            } else if (!shouldBeMuted && micTrack.track.isMuted) {
              micTrack.track.unmute().catch(console.warn);
              setIsMicOn(true);
              setStateManuallySet(true);
            } else {
              setIsMicOn(!shouldBeMuted);
              setStateManuallySet(true);
            }
            micApplied = true;
          } catch (error) {
            console.warn('Failed to apply mic preference:', error);
          }
        }

        // Apply camera preference
        const cameraTrack = Array.from(localParticipant.videoTrackPublications.values())
          .find((pub) => pub.source === Track.Source.Camera && pub.track !== undefined);
        cameraTrackFound = !!cameraTrack?.track;
        
        if (cameraTrack?.track) {
          try {
            const shouldBeMuted = !initialCameraEnabled;
            
            if (shouldBeMuted) {
              // Use stopCameraCompletely to fully unpublish and stop the track
              await stopCameraCompletely();
              setStateManuallySet(true);
              cameraApplied = true;
            } else {
              // Enable track immediately
              enableVideoTrack(cameraTrack.track);
              // Also unmute it
              if (cameraTrack.track.isMuted) {
                cameraTrack.track.unmute().catch(console.warn);
              }
              setIsCameraOn(true);
              setStateManuallySet(true);
              cameraApplied = true;
            }
          } catch (error) {
            console.warn('Failed to apply camera preference:', error);
          }
        }

        // Mark as applied if we've processed all available tracks
        if (micTrackFound && cameraTrackFound) {
          // Both tracks found, apply preferences and mark as done
          if (micApplied && cameraApplied) {
            setInitialPreferencesApplied(true);
            break;
          }
        } else if (retries >= 8) {
          // After several retries, if we have at least one track, apply what we can
          if ((micTrackFound && micApplied) || (cameraTrackFound && cameraApplied)) {
            setInitialPreferencesApplied(true);
            break;
          }
        }

        retries++;
      }
    };

    // Try to apply preferences when tracks are published
    const handleTrackPublished = (publication: any) => {
      // Apply immediately when track is published
      handleTrackPublishedImmediate(publication);
      
      // Also trigger the retry logic
      if (!initialPreferencesApplied) {
        applyInitialPreferences();
      }
    };

    // Check if tracks are already published and apply immediately
    const audioTracks = Array.from(localParticipant.audioTrackPublications.values());
    const videoTracks = Array.from(localParticipant.videoTrackPublications.values());
    const micTrack = audioTracks.find((pub) => pub.track !== undefined);
    const cameraTrack = videoTracks.find((pub) => pub.source === Track.Source.Camera && pub.track !== undefined);

    // Apply immediately to existing tracks
    if (micTrack || cameraTrack) {
      // Apply preferences immediately to existing tracks
      if (micTrack && micTrack.track) {
        const shouldBeMuted = !initialMicEnabled;
        if (shouldBeMuted && !micTrack.track.isMuted) {
          micTrack.track.mute().then(() => {
            setIsMicOn(false);
            setStateManuallySet(true);
          }).catch(console.warn);
        } else if (!shouldBeMuted && micTrack.track.isMuted) {
          micTrack.track.unmute().then(() => {
            setIsMicOn(true);
            setStateManuallySet(true);
          }).catch(console.warn);
        } else {
          setIsMicOn(!shouldBeMuted);
          setStateManuallySet(true);
        }
      }
      
      if (cameraTrack && cameraTrack.track) {
        const shouldBeMuted = !initialCameraEnabled;
        if (shouldBeMuted) {
          // CRITICAL: Disable track IMMEDIATELY (synchronous) to prevent video from showing
          disableVideoTrack(cameraTrack.track);
          setIsCameraOn(false);
          setStateManuallySet(true);
          
          // Then unpublish completely (async)
          stopCameraCompletely().then(() => {
            setInitialPreferencesApplied(true);
          }).catch(console.warn);
        } else {
          // Enable track immediately
          enableVideoTrack(cameraTrack.track);
          if (cameraTrack.track.isMuted) {
            cameraTrack.track.unmute().then(() => {
              setIsCameraOn(true);
              setStateManuallySet(true);
            }).catch(console.warn);
          }
          setIsCameraOn(true);
          setStateManuallySet(true);
        }
      }
      
      // Also run the retry logic as backup
      applyInitialPreferences();
    }
    
    // Listen for new tracks being published
    localParticipant.on('trackPublished', handleTrackPublished);

    return () => {
      localParticipant.off('trackPublished', handleTrackPublished);
    };
  }, [localParticipant, initialMicEnabled, initialCameraEnabled, initialPreferencesApplied]);

  // Sync state with actual track states (only after initial preferences are applied)
  useEffect(() => {
    if (!localParticipant || !initialPreferencesApplied || !stateManuallySet) return;

    const updateMediaState = () => {
      // Check mic state - use publication's isMuted property (more reliable)
      const audioTracks = Array.from(localParticipant.audioTrackPublications.values());
      const micTrack = audioTracks.find((pub) => pub.track !== undefined);
      // Track is ON if it exists and is NOT muted
      const micEnabled = micTrack ? !micTrack.isMuted : false;
      setIsMicOn(micEnabled);

      // Check camera state - use publication's isMuted property (more reliable)
      const cameraTrack = Array.from(localParticipant.videoTrackPublications.values())
        .find((pub) => pub.source === Track.Source.Camera && pub.track !== undefined);
      // Track is ON if it exists and is NOT muted
      const cameraEnabled = cameraTrack ? !cameraTrack.isMuted : false;
      setIsCameraOn(cameraEnabled);

      // Check screen share state
      const screenTrack = Array.from(localParticipant.videoTrackPublications.values())
        .find((pub) => pub.source === Track.Source.ScreenShare && pub.track !== undefined);
      setIsScreenSharing(!!screenTrack);
    };

    // Initial state check
    updateMediaState();

    // Listen for track changes
    const handleTrackPublished = () => updateMediaState();
    const handleTrackUnpublished = () => updateMediaState();
    const handleTrackMuted = () => updateMediaState();
    const handleTrackUnmuted = () => updateMediaState();

    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);
    localParticipant.on('trackMuted', handleTrackMuted);
    localParticipant.on('trackUnmuted', handleTrackUnmuted);

    return () => {
      localParticipant.off('trackPublished', handleTrackPublished);
      localParticipant.off('trackUnpublished', handleTrackUnpublished);
      localParticipant.off('trackMuted', handleTrackMuted);
      localParticipant.off('trackUnmuted', handleTrackUnmuted);
    };
  }, [localParticipant, initialPreferencesApplied, stateManuallySet]);

  // Toggle microphone
  const handleToggleMic = async () => {
    if (!localParticipant) return;

    try {
      const audioTracks = Array.from(localParticipant.audioTrackPublications.values());
      const audioTrack = audioTracks.find((pub) => pub.track !== undefined);
      
      if (audioTrack?.track) {
        // Use track's mute/unmute methods
        if (isMicOn) {
          await audioTrack.track.mute();
        } else {
          await audioTrack.track.unmute();
        }
        // Update state immediately for better UX
        const newMicState = !isMicOn;
        setIsMicOn(newMicState);
        setStateManuallySet(true);
        
        // Optional: Emit socket event for UI sync and analytics
        if (meetingCode && userName) {
          emitMediaStateChanged(meetingCode, userName, {
            isMicOn: newMicState,
            isCameraOn,
            isScreenSharing,
          });
        }
      } else {
        // If no audio track exists, enable microphone (this will create and publish the track)
        if (!isMicOn) {
          try {
            await localParticipant.setMicrophoneEnabled(true);
            setIsMicOn(true);
            setStateManuallySet(true);
            
            // Optional: Emit socket event for UI sync and analytics
            if (meetingCode && userName) {
              emitMediaStateChanged(meetingCode, userName, {
                isMicOn: true,
                isCameraOn,
                isScreenSharing,
              });
            }
          } catch (error) {
            console.error('Failed to enable microphone:', error);
          }
        } else {
          console.warn('No audio track found to toggle');
        }
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  // Toggle camera
  const handleToggleCamera = async () => {
    if (!localParticipant) return;

    try {
      if (isCameraOn) {
        // TURN OFF → unpublish completely
        await stopCameraCompletely();
      } else {
        // TURN ON → publish fresh camera track
        await localParticipant.setCameraEnabled(true);
        setIsCameraOn(true);
      }
      
      // Emit socket event for UI sync and analytics
      if (meetingCode && userName) {
        emitMediaStateChanged(meetingCode, userName, {
          isMicOn,
          isCameraOn: !isCameraOn,
          isScreenSharing,
        });
      }
    } catch (e) {
      console.error('Camera toggle failed:', e);
    }
  };

  // Check if someone else is currently sharing their screen
  const checkIfSomeoneElseIsSharing = (): { isSharing: boolean; sharerName: string | null } => {
    if (!room) return { isSharing: false, sharerName: null };

    // Check all remote participants
    const remoteParticipants = Array.from(room.remoteParticipants.values());
    
    for (const participant of remoteParticipants) {
      const videoTracks = Array.from(participant.videoTrackPublications.values());
      const screenTrack = videoTracks.find((pub) => pub.source === Track.Source.ScreenShare);
      
      if (screenTrack && screenTrack.track) {
        const videoTrack = screenTrack.track;
        const isTrackDisabled =
          (videoTrack as any)?.mediaStreamTrack?.enabled === false ||
          (videoTrack as any)?.track?.enabled === false ||
          (videoTrack as any)?.enabled === false;
        
        // Check if screen share is active (not muted, not disabled)
        if (!screenTrack.isMuted && !isTrackDisabled) {
          return { isSharing: true, sharerName: participant.identity || 'Someone' };
        }
      }
    }
    
    return { isSharing: false, sharerName: null };
  };

  // Monitor screen sharing status of other participants
  useEffect(() => {
    if (!room) return;

    const updateScreenShareStatus = () => {
      const { isSharing, sharerName } = checkIfSomeoneElseIsSharing();
      setCurrentSharer(sharerName);
      
      // Clear error if no one is sharing
      if (!isSharing) {
        setScreenShareError(null);
      }
    };

    // Initial check
    updateScreenShareStatus();

    // Listen for track changes
    const handleTrackPublished = () => updateScreenShareStatus();
    const handleTrackUnpublished = () => updateScreenShareStatus();
    const handleTrackMuted = () => updateScreenShareStatus();
    const handleTrackUnmuted = () => updateScreenShareStatus();

    // Listen to all participants
    const handleParticipantConnected = (participant: any) => {
      // Listen to new participant's track events
      participant.on('trackPublished', handleTrackPublished);
      participant.on('trackUnpublished', handleTrackUnpublished);
      participant.on('trackMuted', handleTrackMuted);
      participant.on('trackUnmuted', handleTrackUnmuted);
      updateScreenShareStatus();
    };
    
    const handleParticipantDisconnected = () => updateScreenShareStatus();

    room.on('trackPublished', handleTrackPublished);
    room.on('trackUnpublished', handleTrackUnpublished);
    room.on('trackMuted', handleTrackMuted);
    room.on('trackUnmuted', handleTrackUnmuted);
    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);

    // Also listen to existing remote participants
    const remoteParticipants = Array.from(room.remoteParticipants.values());
    remoteParticipants.forEach((participant) => {
      participant.on('trackPublished', handleTrackPublished);
      participant.on('trackUnpublished', handleTrackUnpublished);
      participant.on('trackMuted', handleTrackMuted);
      participant.on('trackUnmuted', handleTrackUnmuted);
    });

    return () => {
      room.off('trackPublished', handleTrackPublished);
      room.off('trackUnpublished', handleTrackUnpublished);
      room.off('trackMuted', handleTrackMuted);
      room.off('trackUnmuted', handleTrackUnmuted);
      room.off('participantConnected', handleParticipantConnected);
      room.off('participantDisconnected', handleParticipantDisconnected);
      
      // Clean up listeners from all participants
      const allParticipants = Array.from(room.remoteParticipants.values());
      allParticipants.forEach((participant) => {
        participant.off('trackPublished', handleTrackPublished);
        participant.off('trackUnpublished', handleTrackUnpublished);
        participant.off('trackMuted', handleTrackMuted);
        participant.off('trackUnmuted', handleTrackUnmuted);
      });
    };
  }, [room]);

  // Toggle screen sharing
  const handleToggleScreenShare = async () => {
    if (!localParticipant || !room) return;

    setIsSharingLoading(true);
    setScreenShareError(null); // Clear any previous errors
    
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        const screenTrack = Array.from(localParticipant.videoTrackPublications.values())
          .find((pub) => pub.source === Track.Source.ScreenShare);
        
        if (screenTrack) {
          await localParticipant.unpublishTrack(screenTrack.track!);
          setIsScreenSharing(false);
          
          // Optional: Emit socket event for UI sync and analytics
          if (meetingCode && userName) {
            emitMediaStateChanged(meetingCode, userName, {
              isMicOn,
              isCameraOn,
              isScreenSharing: false,
            });
          }
        }
      } else {
        // Check if someone else is already sharing
        const { isSharing, sharerName } = checkIfSomeoneElseIsSharing();
        
        if (isSharing && sharerName) {
          setScreenShareError(`${sharerName} is sharing their screen. You cannot share your screen at this time.`);
          setIsSharingLoading(false);
          return;
        }

        // Start screen sharing
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];

          if (videoTrack) {
            await localParticipant.publishTrack(videoTrack, {
              source: Track.Source.ScreenShare,
            });
          }

          if (audioTrack) {
            await localParticipant.publishTrack(audioTrack, {
              source: Track.Source.ScreenShareAudio,
            });
          }

          // Handle when user stops sharing via browser UI
          videoTrack.onended = () => {
            handleToggleScreenShare();
          };

          setIsScreenSharing(true);
          
          // Optional: Emit socket event for UI sync and analytics
          if (meetingCode && userName) {
            emitMediaStateChanged(meetingCode, userName, {
              isMicOn,
              isCameraOn,
              isScreenSharing: true,
            });
          }
        } catch (error: any) {
          if (error.name === 'NotAllowedError') {
            console.error('Screen sharing permission denied');
            setScreenShareError('Screen sharing permission was denied. Please allow screen sharing in your browser settings.');
          } else {
            console.error('Failed to start screen sharing:', error);
            setScreenShareError('Failed to start screen sharing. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Screen share toggle error:', error);
      setScreenShareError('An error occurred while toggling screen sharing.');
    } finally {
      setIsSharingLoading(false);
    }
  };

  // Handle leave meeting
  const handleLeave = () => {
    if (onLeave) {
      onLeave();
    }
  };

  // Handle raise hand toggle
  const handleToggleRaiseHand = () => {
    if (meetingCode && userName) {
      const newRaisedState = !isHandRaised;
      setIsHandRaised(newRaisedState);
      raiseHand(meetingCode, userName, newRaisedState);
    }
  };

  // Don't render controls until local participant is available
  if (!localParticipant) {
    return null;
  }

  return (
    <>
      {/* Screen Share Error Message - Top Center */}
      {screenShareError && (
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 transform animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-600/95 px-4 py-3 shadow-lg backdrop-blur-sm max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-white">{screenShareError}</p>
            <button
              onClick={() => setScreenShareError(null)}
              className="ml-auto flex-shrink-0 text-white hover:text-red-200 transition-colors"
              aria-label="Close error message"
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
        </div>
      )}

      {/* Current Sharer Info - Top Center (when someone else is sharing) */}
      {currentSharer && !isScreenSharing && (
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 transform animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 rounded-lg border border-blue-500/50 bg-blue-600/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white flex-shrink-0"
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
            <p className="text-sm font-medium text-white">
              <span className="font-semibold">{currentSharer}</span> is sharing their screen
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 transform">
      <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        {/* Microphone Toggle */}
        <button
          onClick={handleToggleMic}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
            isMicOn
              ? 'bg-slate-700 text-white hover:bg-slate-600'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? (
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
        </button>

        {/* Camera Toggle */}
        <button
          onClick={handleToggleCamera}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
            isCameraOn
              ? 'bg-slate-700 text-white hover:bg-slate-600'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? (
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
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={handleToggleScreenShare}
          disabled={isSharingLoading}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
            isScreenSharing
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          {isSharingLoading ? (
            <svg
              className="h-6 w-6 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-600" />

        {/* Chat Toggle */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isChatOpen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
            title={isChatOpen ? 'Close chat' : 'Open chat'}
            aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
          >
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        )}

        {/* Reactions Toggle */}
        {onToggleReactions && (
          <button
            onClick={onToggleReactions}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isReactionsOpen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
            title={isReactionsOpen ? 'Close reactions' : 'Open reactions'}
            aria-label={isReactionsOpen ? 'Close reactions' : 'Open reactions'}
          >
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
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}

        {/* Participants Toggle */}
        {onToggleParticipants && (
          <button
            onClick={onToggleParticipants}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isParticipantsOpen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
            title={isParticipantsOpen ? 'Close participants' : 'Open participants'}
            aria-label={isParticipantsOpen ? 'Close participants' : 'Open participants'}
          >
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </button>
        )}

        {/* Raise Hand Button */}
        {meetingCode && userName && (
          <button
            onClick={handleToggleRaiseHand}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isHandRaised
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            aria-label={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
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
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
              />
            </svg>
          </button>
        )}

        {/* Divider */}
        {(onToggleChat || onToggleReactions || onToggleParticipants) && (
          <div className="h-8 w-px bg-slate-600" />
        )}

        {/* Leave Meeting */}
        <button
          onClick={handleLeave}
          className="flex h-12 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
          title="Leave meeting"
          aria-label="Leave meeting"
        >
          Leave
        </button>
      </div>
    </div>
    </>
  );
};

export default MediaControls;

