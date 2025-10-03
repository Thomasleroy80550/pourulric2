"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const HalloweenMusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [showControls, setShowControls] = useState(false);
  const { theme } = useTheme();

  // Effet visuel quand la musique joue
  useEffect(() => {
    if (isPlaying) {
      document.body.style.setProperty('--music-glow', '0 0 20px rgba(255, 140, 0, 0.3)');
    } else {
      document.body.style.removeProperty('--music-glow');
    }
  }, [isPlaying]);

  useEffect(() => {
    if (theme === 'halloween' && audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {
        setShowControls(true);
      });
    } else if (theme !== 'halloween' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [theme]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {
          console.log("Lecture bloquée");
        });
      }
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  if (theme !== 'halloween') {
    return null;
  }

  return (
    <>
      <audio
        ref={audioRef}
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src="https://www.soundjay.com/misc/sounds/spooky-ambient-1.mp3" type="audio/mpeg" />
        <source src="https://cdn.freesound.org/previews/250/250551_4284968-lq.mp3" type="audio/mpeg" />
      </audio>

      {/* Indicateur visuel de musique en cours */}
      {isPlaying && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className="bg-orange-500/20 backdrop-blur-sm rounded-full p-2 border border-orange-400/30">
            <Music className="h-4 w-4 text-orange-600 animate-bounce" />
          </div>
        </div>
      )}

      {/* Contrôles principaux */}
      <div className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300",
        showControls ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      )}>
        <div className="bg-orange-200/30 backdrop-blur-md rounded-2xl p-3 border border-orange-400/30 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className={cn(
                "h-10 w-10 rounded-full transition-all",
                isPlaying 
                  ? "bg-orange-500/40 hover:bg-orange-500/50 text-orange-900 animate-pulse" 
                  : "bg-orange-500/20 hover:bg-orange-500/30 text-orange-800"
              )}
              title={isPlaying ? "Mettre en pause" : "Lire la musique"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center gap-1">
              <Music className={cn("h-4 w-4", isPlaying ? "text-orange-700 animate-pulse" : "text-orange-600")} />
              <span className="text-xs font-medium text-orange-800">Halloween</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-32">
            <VolumeX className="h-3 w-3 text-orange-600" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="flex-1"
            />
            <Volume2 className="h-3 w-3 text-orange-600" />
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowControls(!showControls)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 bg-orange-500/20 hover:bg-orange-500/30 text-orange-800 rounded-full backdrop-blur-sm border border-orange-400/30 shadow-lg"
        title="Contrôles musique Halloween"
      >
        {showControls ? <VolumeX className="h-5 w-5" /> : <Music className="h-5 w-5" />}
      </Button>
    </>
  );
};

export default HalloweenMusicPlayer;