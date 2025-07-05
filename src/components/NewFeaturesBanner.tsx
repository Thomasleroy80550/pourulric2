import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const BANNER_DISMISSED_KEY = 'newFeaturesBannerDismissed';
const CURRENT_BANNER_VERSION = 'v1.0'; // Increment this to show the banner again for new updates

const NewFeaturesBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissedVersion = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedVersion !== CURRENT_BANNER_VERSION) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, CURRENT_BANNER_VERSION);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 flex items-center justify-between shadow-md",
      "flex-col sm:flex-row text-center sm:text-left space-y-2 sm:space-y-0"
    )}>
      <div className="flex items-center space-x-2">
        <Sparkles className="h-5 w-5 flex-shrink-0" />
        <p className="font-semibold text-sm md:text-base">
          Découvrez les nouveautés de votre espace propriétaire !
        </p>
      </div>
      <div className="flex items-center space-x-3">
        <Link to="/new-owner-site" onClick={handleDismiss}>
          <Button variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
            Voir les nouveautés
          </Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={handleDismiss} className="text-white hover:bg-white hover:text-blue-600">
          <XCircle className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default NewFeaturesBanner;