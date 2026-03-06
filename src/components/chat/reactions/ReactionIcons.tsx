import React from 'react';

// Import SVG files as React components using ?react suffix
import SVGLike from '../../../assets/icons/like.svg?react';
import SVGLove from '../../../assets/icons/love.svg?react';
import SVGHaha from '../../../assets/icons/haha.svg?react';
import SVGWow from '../../../assets/icons/wow.svg?react';
import SVGSad from '../../../assets/icons/sad.svg?react';
import SVGAngry from '../../../assets/icons/angry.svg?react';
import SVGCancel from '../../../assets/icons/cancel.svg?react';

export interface ReactionIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const IconLike = ({ size = 24, ...props }: ReactionIconProps) => (
  <SVGLike width={size} height={size} style={{ overflow: 'visible' }} {...props} />
);

export const IconLove = ({ size = 24, ...props }: ReactionIconProps) => (
  <SVGLove width={size} height={size} style={{ overflow: 'visible' }} {...props} />
);

export const IconHaha = ({ size = 24, ...props }: ReactionIconProps) => (
  <SVGHaha width={size} height={size} style={{ overflow: 'visible' }} {...props} />
);

export const IconWow = ({ size = 24, ...props }: ReactionIconProps) => (
  <SVGWow width={size} height={size} style={{ overflow: 'visible' }} {...props} />
);

export const IconSad = ({ size = 24, ...props }: ReactionIconProps) => (
  <SVGSad width={size} height={size} style={{ overflow: 'visible' }} {...props} />
);

export const IconAngry = ({ size = 24, ...props }: ReactionIconProps) => (
  <SVGAngry width={size} height={size} style={{ overflow: 'visible' }} {...props} />
);

export const IconCancel = ({ size = 24, ...props }: ReactionIconProps) => (
  <SVGCancel width={size} height={size} style={{ overflow: 'visible' }} {...props} />
);

export const getReactionIcon = (emoji: string, className?: string, size: number | string = 24) => {
  switch (emoji) {
    case '👍': return <IconLike className={className} size={size} />;
    case '❤️': return <IconLove className={className} size={size} />;
    case '😆': return <IconHaha className={className} size={size} />;
    case '😮': return <IconWow className={className} size={size} />;
    case '😢': return <IconSad className={className} size={size} />;
    case '😡': return <IconAngry className={className} size={size} />;
    default: return emoji;
  }
};
