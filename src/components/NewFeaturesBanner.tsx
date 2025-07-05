import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Removed BANNER_DISMISSED_KEY and CURRENT_BANNER_VERSION to make it always visible

const NewFeaturesBanner: React.FC = () => {
  // Set isVisible to true by default, and remove any dismissal logic
  const [isVisible, setIsVisible] = useState(true); 

  // No useEffect for localStorage check, no handleDismiss function

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
        <Link to="/new-owner-site"> {/* Removed onClick={handleDismiss} */}
          <Button variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
            Voir les nouveautés
          </Button>
        </Link>
        {/* Removed the dismiss button */}
      </div>
    </div>
  );
};

export default NewFeaturesBanner;