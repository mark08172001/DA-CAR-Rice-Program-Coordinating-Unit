'use client';

import React from 'react';
import './CircleLoading.css';

interface CircleLoadingProps {
  text?: string;
  inline?: boolean;
}

export default function CircleLoading({
  text = 'Loading...',
  inline = false,
}: CircleLoadingProps) {
  return (
    <div
      className={inline ? 'circle-loading-inline' : 'circle-loading-overlay'}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="circle-loading-box">
        <div className="circle-spinner-wrap">
          <div className="circle-spinner-single" />
        </div>
        {text && <p className="circle-loading-text">{text}</p>}
      </div>
    </div>
  );
}

