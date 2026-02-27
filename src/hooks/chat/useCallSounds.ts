import { useRef, useCallback } from 'react';

import busySound from '../../assets/sounds/busy.mp3';
import connectedSound from '../../assets/sounds/connected.mp3';
import endedSound from '../../assets/sounds/ended.mp3';
import actionSound from '../../assets/sounds/action.mp3';

export type CallSoundType = 'busy' | 'connected' | 'ended' | 'action';

export const useCallSounds = () => {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const playSound = useCallback((type: CallSoundType) => {
    // Lazy load audio objects
    if (!audioRefs.current[type]) {
      let src = '';
      switch (type) {
        case 'busy': src = busySound; break;
        case 'connected': src = connectedSound; break;
        case 'ended': src = endedSound; break;
        case 'action': src = actionSound; break;
      }
      audioRefs.current[type] = new Audio(src);
    }

    const audio = audioRefs.current[type];
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.warn(`Không thể phát âm thanh ${type}:`, err);
    });
  }, []);

  const stopAllSounds = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  return { playSound, stopAllSounds };
};
