"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface HalloweenMusicPlayerProps {
  className?: string;
}

const HalloweenMusicPlayer: React.FC<HalloweenMusicPlayerProps> = ({ className }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // URL Google Drive direct (format raw)
  const GOOGLE_DRIVE_AUDIO_URL = "https://drive.google.com/uc?export=download&id=1mdyVFnG-l491ypDCsOzz1DliyZGtrUgW";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      document.body.classList.remove('halloween-music-playing');
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        await audio.pause();
        setIsPlaying(false);
        document.body.classList.remove('halloween-music-playing');
      } else {
        await audio.play();
        setIsPlaying(true);
        document.body.classList.add('halloween-music-playing');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      // Fallback: essayer de charger depuis une autre source
      if (audio.src === GOOGLE_DRIVE_AUDIO_URL) {
        // Vous pouvez ajouter ici une URL de secours si nécessaire
        console.log('Google Drive audio failed, trying alternative...');
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
    }
  };

  if (!showPlayer) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowPlayer(true)}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full",
          "bg-orange-600 hover:bg-orange-700 text-white",
          "shadow-lg hover:shadow-xl transition-all",
          "animate-bounce",
          className
        )}
        title="🎃 Musique d'Halloween"
      >
        <Music className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={GOOGLE_DRIVE_AUDIO_URL}
        preload="metadata"
        onError={(e) => {
          console.error('Audio loading error:', e);
          // Afficher un message d'erreur à l'utilisateur
          const audio = e.target as HTMLAudioElement;
          if (audio.error) {
            console.error('Audio error code:', audio.error.code);
            console.error('Audio error message:', audio.error.message);
          }
        }}
      />
      
      <div className={cn(
        "fixed bottom-20 right-4 z-50 w-80 bg-background/95 backdrop-blur",
        "border border-border rounded-lg shadow-xl",
        "p-4 space-y-3",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">🎃 Halloween Playlist</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowPlayer(false);
              if (isPlaying) {
                audioRef.current?.pause();
                setIsPlaying(false);
                document.body.classList.remove('halloween-music-playing');
              }
            }}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            className="h-10 w-10"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
      </div>
    </>
  );
};

export default HalloweenMusicPlayer;