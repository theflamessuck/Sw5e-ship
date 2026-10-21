'use client';

import React, { useState } from 'react';

interface RoomSelectorProps {
  currentRoom: string;
  onJoinRoom: (code: string) => void;
  isConnected: boolean;
}

export function RoomSelector({ currentRoom, onJoinRoom, isConnected }: RoomSelectorProps) {
  const [inputVal, setInputVal] = useState(currentRoom);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onJoinRoom(inputVal.trim().toUpperCase());
    }
  };

  return (
    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 animate-pulse'
          }`}
        />
        <span className="text-neutral-400">NET:</span>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="ROOM-CODE"
          className="bg-neutral-950 border border-neutral-700 text-neutral-200 px-2 py-0.5 rounded w-28 uppercase text-center focus:outline-none focus:border-amber-500"
          maxLength={10}
        />
        <button
          type="submit"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded transition"
        >
          LINK
        </button>
      </form>
    </div>
  );
}