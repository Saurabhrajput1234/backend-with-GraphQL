import React from 'react';
import { Link } from 'react-router-dom';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: AvatarSize;
  username?: string;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  username,
  className = ''
}) => {
  const sizeClass = sizeClasses[size];
  const initials = getInitials(alt);

  const avatarContent = (
    <>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`rounded-full object-cover ${sizeClass} ${className}`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement?.classList.add('bg-gray-200');
            const initialsElement = target.parentElement?.querySelector('.avatar-initials');
            if (initialsElement) {
              initialsElement.classList.remove('hidden');
            }
          }}
        />
      ) : (
        <div className={`rounded-full bg-gray-200 flex items-center justify-center ${sizeClass} ${className}`}>
          <span className="avatar-initials text-gray-600 font-medium">
            {initials}
          </span>
        </div>
      )}
    </>
  );

  if (username) {
    return (
      <Link to={`/profile/${username}`} className="block">
        {avatarContent}
      </Link>
    );
  }

  return <div className="block">{avatarContent}</div>;
}; 