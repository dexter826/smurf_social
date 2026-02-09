import React from 'react';

export const ScreenLoader = () => {
  return (
    <div className="fixed inset-0 flex justify-center items-center bg-bg-primary z-[9999]">
      <div
        className="grid grid-cols-2 gap-2.5 w-20 h-20"
        style={{ transform: 'rotate(45deg)', animation: 'rotateLoader 2s cubic-bezier(0.6, 0.2, 0.1, 1) infinite' }}
      >
        <div className="w-[35px] h-[35px] rounded-xl screen-loader-cube" />
        <div className="w-[35px] h-[35px] rounded-xl screen-loader-cube" />
        <div className="w-[35px] h-[35px] rounded-xl screen-loader-cube" />
        <div className="w-[35px] h-[35px] rounded-xl screen-loader-cube" />
      </div>
    </div>
  );
};
