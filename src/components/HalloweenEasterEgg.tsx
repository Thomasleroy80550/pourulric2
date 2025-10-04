"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Flame, Skull, Ghost, Spider } from 'lucide-react';
import { cn } from '@/lib/utils';

const HalloweenEasterEgg: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [showPumpkin, setShowPumpkin] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showSpiderWebs, setShowSpiderWebs] = useState(false);

  // Debug: log du thème actuel
  useEffect(() => {
    console.log('Thème actuel:', theme);
    if (theme === 'halloween') {
      document.body.classList.add('halloween');
    } else {
      document.body.classList.remove('halloween');
    }
  }, [theme]);

  // Affiche la citrouille après 3 secondes sur la version standard
  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
      const timer = setTimeout(() => {
        setShowPumpkin(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [theme]);

  // Affiche les toiles d'araignée en thème Halloween
  useEffect(() => {
    if (theme === 'halloween') {
      setShowSpiderWebs(true);
    } else {
      setShowSpiderWebs(false);
    }
  }, [theme]);

  const handlePumpkinClick = () => {
    if (isAnimating) return;
    
    setClickCount(prev => prev + 1);
    
    if (clickCount >= 2) {
      // Déclenche l'animation de l'enfer
      setIsAnimating(true);
      
      // Animation de feu et destruction
      document.body.style.filter = 'hue-rotate(180deg) saturate(2) contrast(1.5)';
      document.body.style.transition = 'all 2s ease-in-out';
      
      // Crée des effets visuels
      createHellEffects();
      
      // Après 3 secondes, bascule vers le thème Halloween
      setTimeout(() => {
        setTheme('halloween');
        document.body.style.filter = 'none';
        document.body.style.transition = 'none';
        setIsAnimating(false);
        setShowPumpkin(false);
      }, 3000);
    }
  };

  const createHellEffects = () => {
    // Crée des flammes qui montent
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const flame = document.createElement('div');
        flame.innerHTML = '🔥';
        flame.style.position = 'fixed';
        flame.style.left = `${Math.random() * 100}vw`;
        flame.style.bottom = '-50px';
        flame.style.fontSize = '2rem';
        flame.style.zIndex = '9999';
        flame.style.animation = 'flame-rise 3s ease-out forwards';
        flame.style.pointerEvents = 'none';
        
        document.body.appendChild(flame);
        
        setTimeout(() => {
          flame.remove();
        }, 3000);
      }, i * 100);
    }

    // Crée des crânes qui tombent
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const skull = document.createElement('div');
        skull.innerHTML = '💀';
        skull.style.position = 'fixed';
        skull.style.left = `${Math.random() * 100}vw`;
        skull.style.top = '-50px';
        skull.style.fontSize = '1.5rem';
        skull.style.zIndex = '9999';
        skull.style.animation = 'skull-fall 3s ease-in forwards';
        skull.style.pointerEvents = 'none';
        
        document.body.appendChild(skull);
        
        setTimeout(() => {
          skull.remove();
        }, 3000);
      }, i * 200);
    }

    // Crée des toiles d'araignée qui apparaissent
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const web = document.createElement('div');
        web.innerHTML = '🕸️';
        web.style.position = 'fixed';
        web.style.left = `${Math.random() * 90}vw`;
        web.style.top = `${Math.random() * 80}vh`;
        web.style.fontSize = '3rem';
        web.style.zIndex = '9998';
        web.style.animation = 'web-appear 2s ease-out forwards';
        web.style.pointerEvents = 'none';
        web.style.opacity = '0';
        web.style.transform = 'scale(0) rotate(0deg)';
        
        document.body.appendChild(web);
        
        setTimeout(() => {
          web.style.opacity = '0.7';
          web.style.transform = 'scale(1) rotate(45deg)';
        }, 100);
        
        setTimeout(() => {
          web.remove();
        }, 5000);
      }, i * 300);
    }
  };

  if (theme === 'halloween' || !showPumpkin) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        @keyframes flame-rise {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes skull-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes web-appear {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2) rotate(30deg);
          }
          100% {
            opacity: 0.7;
            transform: scale(1) rotate(45deg);
          }
        }

        @keyframes pumpkin-glow {
          0%, 100% {
            filter: drop-shadow(0 0 5px rgba(255, 140, 0, 0.5));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 15px rgba(255, 140, 0, 1)) drop-shadow(0 0 25px rgba(255, 69, 0, 0.8));
            transform: scale(1.1);
          }
        }

        @keyframes pumpkin-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-2deg); }
          75% { transform: translateX(2px) rotate(2deg); }
        }

        .pumpkin-easter-egg {
          animation: pumpkin-glow 2s ease-in-out infinite;
        }

        .pumpkin-easter-egg:hover {
          animation: pumpkin-glow 1s ease-in-out infinite, pumpkin-shake 0.5s ease-in-out infinite;
          cursor: pointer;
        }

        .pumpkin-easter-egg.clicked {
          animation: pumpkin-glow 0.3s ease-in-out infinite, pumpkin-shake 0.2s ease-in-out infinite;
        }

        /* Toiles d'araignée en thème Halloween */
        .spider-web {
          position: fixed;
          font-size: 2.5rem;
          opacity: 0.6;
          z-index: 100;
          pointer-events: none;
          animation: web-float 8s ease-in-out infinite;
          filter: drop-shadow(0 0 3px rgba(255, 140, 0, 0.5));
        }

        @keyframes web-float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
          }
        }

        .web-1 {
          top: 10%;
          left: 5%;
          animation-delay: 0s;
        }

        .web-2 {
          top: 20%;
          right: 8%;
          animation-delay: 2s;
        }

        .web-3 {
          top: 60%;
          left: 3%;
          animation-delay: 4s;
        }

        .web-4 {
          top: 70%;
          right: 5%;
          animation-delay: 6s;
        }

        .web-5 {
          top: 40%;
          left: 15%;
          animation-delay: 1s;
        }

        .web-6 {
          top: 80%;
          right: 12%;
          animation-delay: 3s;
        }
      `}</style>

      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 transition-all duration-500",
          showPumpkin ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
          isAnimating && "animate-pulse"
        )}
      >
        <div
          className={cn(
            "pumpkin-easter-egg text-4xl select-none",
            clickCount > 0 && "clicked"
          )}
          onClick={handlePumpkinClick}
          title={clickCount < 2 ? `Clique encore ${2 - clickCount} fois...` : "Prépare-toi à l'enfer!"}
        >
          {clickCount >= 2 ? '🎃💥' : '🎃'}
        </div>
        
        {clickCount > 0 && clickCount < 2 && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
            Encore {2 - clickCount} clic{2 - clickCount > 1 ? 's' : ''} !
          </div>
        )}
      </div>

      {isAnimating && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/50 via-orange-900/50 to-black/50 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce">
            🔥
          </div>
        </div>
      )}

      {/* Toiles d'araignée en thème Halloween */}
      {showSpiderWebs && (
        <>
          <div className="spider-web web-1">🕸️</div>
          <div className="spider-web web-2">🕸️</div>
          <div className="spider-web web-3">🕸️</div>
          <div className="spider-web web-4">🕸️</div>
          <div className="spider-web web-5">🕸️</div>
          <div className="spider-web web-6">🕸️</div>
        </>
      )}
    </>
  );
};

export default HalloweenEasterEgg;