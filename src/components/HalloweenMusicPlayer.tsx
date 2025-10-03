"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

const HalloweenMusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const { theme } = useTheme();

  useEffect(() => {
    if (theme === 'halloween') {
      // Auto-play avec volume faible
      if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {
          // Auto-play bloqué, on attend l'interaction utilisateur
        });
      }
    } else {
      // Stop quand on quitte le thème
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
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
          console.log("Lecture automatique bloquée");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (volume > 0) {
        setVolume(0);
        audioRef.current.volume = 0;
      } else {
        setVolume(0.3);
        audioRef.current.volume = 0.3;
      }
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
        {/* Musique Halloween libre de droits - Spooky Ambient */}
        <source src="https://www.soundjay.com/misc/sounds/spooky-ambient-1.mp3" type="audio/mpeg" />
        {/* Alternative : musique créative commons */}
        <source src="https://cdn.freesound.org/previews/250/250551_4284968-lq.mp3" type="audio/mpeg" />
        Votre navigateur ne supporte pas l'audio HTML5.
      </audio>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm rounded-full p-2 border border-orange-500/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="h-8 w-8 text-orange-700 hover:text-orange-900 hover:bg-orange-500/20"
          title={isPlaying ? "Mettre en pause" : "Lire la musique"}
        >
          {isPlaying ? <Volume2 className="h-4 w-4" /> : <Music className="h-4 w-4" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-8 w-8 text-orange-700 hover:text-orange-900 hover:bg-orange-500/20"
          title={volume > 0 ? "Mettre en sourdine" : "Activer le son"}
        >
          <VolumeX className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default HalloweenMusicPlayer;