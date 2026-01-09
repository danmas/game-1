
import React, { useState, useCallback, useEffect } from 'react';
import Game from './components/Game';
import { GameState, TargetData } from './types';
import { TARGET_COUNT } from './constants';

const App: React.FC = () => {
  const [score, setScore] = useState(0);
  const [targetsHit, setTargetsHit] = useState(0);
  const [gameState, setGameState] = useState<GameState>(GameState.READY);
  const [gameKey, setGameKey] = useState(0);

  const handleHit = useCallback(() => {
    setTargetsHit(prev => {
      const newVal = prev + 1;
      if (newVal === TARGET_COUNT) {
        setGameState(GameState.WON);
      }
      return newVal;
    });
    setScore(prev => prev + 100);
  }, []);

  const resetGame = () => {
    setGameKey(prev => prev + 1);
    setScore(0);
    setTargetsHit(0);
    setGameState(GameState.READY);
  };

  return (
    <div className="relative w-full h-full bg-blue-100 font-sans select-none overflow-hidden">
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white shadow-2xl">
          <h1 className="text-2xl font-black uppercase tracking-widest mb-1 text-yellow-400">Slingshot 3D</h1>
          <p className="text-lg font-medium opacity-80">Targets: {targetsHit} / {TARGET_COUNT}</p>
          <p className="text-3xl font-bold mt-2">Score: {score}</p>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white text-right shadow-2xl">
          <p className="text-sm font-bold uppercase mb-2 opacity-60">Instructions</p>
          <p className="text-xs">Hold <span className="text-yellow-400">Mouse Left</span> to pull</p>
          <p className="text-xs">Drag <span className="text-yellow-400">UP</span> to aim <span className="text-yellow-400">DOWN</span></p>
          <p className="text-xs">Drag <span className="text-yellow-400">DOWN</span> to aim <span className="text-yellow-400">UP</span></p>
        </div>
      </div>

      {gameState === GameState.WON && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-3xl shadow-2xl text-center transform scale-110">
            <h2 className="text-5xl font-black text-slate-900 mb-4">VICTORY!</h2>
            <p className="text-xl text-slate-600 mb-8 font-medium">You hit all targets with precision!</p>
            <button
              onClick={resetGame}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-10 py-4 rounded-full font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-400/20"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* The 3D Game World */}
      <div className="w-full h-full cursor-crosshair">
        <Game key={gameKey} onHit={handleHit} />
      </div>

      {/* Progress Bar / Power Meter Bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="text-white text-center mb-2 font-black text-xs uppercase tracking-widest drop-shadow-lg opacity-80">
          Ready to Fire
        </div>
      </div>
    </div>
  );
};

export default App;
