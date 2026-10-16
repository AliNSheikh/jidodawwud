import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatioClass?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  aspectRatioClass = 'aspect-[4/3]',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden bg-[#161618] ${aspectRatioClass} ${className}`}>
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
            isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        />
      ) : null}

      {(hasError || !src) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1c1c20] via-[#141416] to-[#0d0d0f] text-[#8e8e93]">
          <div className="w-12 h-12 rounded-full border border-[#C5A880]/20 flex items-center justify-center mb-2 bg-[#C5A880]/5 text-[#C5A880]">
            <Utensils className="w-5 h-5 stroke-[1.5]" />
          </div>
          <span className="text-xs uppercase tracking-widest text-[#a1a1aa] font-medium text-center line-clamp-1">
            {alt || 'Haute Cuisine'}
          </span>
          <span className="text-[10px] text-[#71717a] mt-0.5 tracking-wider">L'Étoile Selection</span>
        </div>
      )}

      {isLoading && !hasError && src && (
        <div className="absolute inset-0 bg-[#161618] animate-pulse" />
      )}
    </div>
  );
};
