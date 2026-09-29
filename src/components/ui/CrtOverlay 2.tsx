import React from 'react';

export const CrtOverlay: React.FC = () => {
  return (
    <div
      className="absolute inset-0 z-40 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%] shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] animate-flicker"
      aria-hidden="true"
    />
  );
};
