import React from 'react';
import styled from 'styled-components';

export const ScreenLoader = () => {
  return (
    <StyledWrapper>
      <div className="screen-overlay">
        <div className="loader">
          <div className="cube" />
          <div className="cube" />
          <div className="cube" />
          <div className="cube" />
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Full screen overlay */
  .screen-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--bg-primary); /* Sử dụng biến màu của hệ thống */
    z-index: 9999;
  }

  /* Loader container */
  .loader {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 80px;
    height: 80px;
    transform: rotate(45deg);
    animation: rotateLoader 2s cubic-bezier(0.6, 0.2, 0.1, 1) infinite;
  }

  /* Cubes */
  .cube {
    width: 35px;
    height: 35px;
    background: linear-gradient(145deg, #00e4ff, #006aff);
    border-radius: 12px;
    box-shadow:
      0 0 12px rgba(0, 228, 255, 0.6),
      inset 0 0 8px rgba(0, 228, 255, 0.8),
      inset 3px 3px 8px rgba(0, 50, 120, 0.4);
    animation: cube-pulse 1.6s ease-in-out infinite;
    transition: transform 0.4s ease;
  }

  /* Smooth scaling animation */
  @keyframes cube-pulse {
    0%,
    100% {
      transform: scale(1);
      box-shadow:
        0 0 15px rgba(0, 228, 255, 0.7),
        inset 0 0 8px rgba(0, 228, 255, 0.8);
    }
    50% {
      transform: scale(1.3);
      box-shadow:
        0 0 25px rgba(0, 228, 255, 1),
        inset 0 0 12px rgba(0, 228, 255, 1);
    }
  }

  /* Rotating loader animation */
  @keyframes rotateLoader {
    0% {
      transform: rotate(45deg);
    }
    50% {
      transform: rotate(225deg);
    }
    100% {
      transform: rotate(405deg);
    }
  }

  /* Staggered animation for individual cubes */
  .cube:nth-child(1) {
    animation-delay: 0s;
  }
  .cube:nth-child(2) {
    animation-delay: 0.2s;
  }
  .cube:nth-child(3) {
    animation-delay: 0.4s;
  }
  .cube:nth-child(4) {
  }
`;
