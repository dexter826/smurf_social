import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

interface SplashScreenProps {
  isReady?: boolean;
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isReady, onFinish }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);

  useEffect(() => {
    fetch('/static/animations/splash.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Lỗi tải splash animation:', err));

    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady && isMinTimeElapsed) {
      setIsFadingOut(true);
      const finishTimer = setTimeout(() => {
        onFinish?.();
      }, 500);
      return () => clearTimeout(finishTimer);
    }
  }, [isReady, isMinTimeElapsed, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[var(--z-toast)] flex flex-col items-center justify-center bg-bg-primary transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-[512px] aspect-square flex items-center justify-center p-4">
        {animationData && (
          <Lottie 
            animationData={animationData} 
            loop={true} 
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
