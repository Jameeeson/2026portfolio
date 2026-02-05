/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useRef, useState } from 'react';

type LipSyncContextType = {
  playAudio: (audioUrl: string) => Promise<void>;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
};

const LipSyncContext = createContext<LipSyncContextType | null>(null);

export const LipSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  // We need state for the analyser so components re-render when it is created
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio Context (must be done after user interaction usually)
  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const newAnalyser = ctx.createAnalyser();
      newAnalyser.fftSize = 256; 
      
      // Update state so consumers get the new analyser
      setAnalyser(newAnalyser);

      audioRef.current = new Audio();
      
      // Connect HTML Audio Element -> Analyser -> Speakers
      sourceRef.current = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(newAnalyser);
      newAnalyser.connect(ctx.destination);
      
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  const playAudio = async (audioUrl: string) => {
    initAudio();
    
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      setIsPlaying(true);
      await audioRef.current.play();
    }
  };

  return (
    <LipSyncContext.Provider value={{ playAudio, analyser, isPlaying }}>
      {children}
    </LipSyncContext.Provider>
  );
};

export const useLipSync = () => {
  const context = useContext(LipSyncContext);
  if (!context) throw new Error('useLipSync must be used within a LipSyncProvider');
  return context;
};