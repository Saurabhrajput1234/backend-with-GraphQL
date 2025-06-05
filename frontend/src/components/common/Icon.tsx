import React from 'react';
import * as HeroIcons from '@heroicons/react/24/outline';

// Get all icon names from HeroIcons
type IconName = Extract<keyof typeof HeroIcons, string>;

interface IconProps {
  name: IconName;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses: Record<NonNullable<IconProps['size']>, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
};

export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  size = 'md'
}) => {
  const IconComponent = HeroIcons[name as keyof typeof HeroIcons];
  const sizeClass = sizeClasses[size];

  if (!IconComponent) {
    console.warn(`Icon "${String(name)}" not found in HeroIcons`);
    return null;
  }

  return (
    <IconComponent
      className={`${sizeClass} ${className}`}
      aria-hidden="true"
    />
  );
}; 