'use client';

import React, { useState } from 'react';
import { Lock, Unlock, KeyRound } from 'lucide-react';

interface RoomSelectorProps {
  currentRoom: string;
  onJoinRoom: (code: string, pin?: string) => void;
  isConnected: boolean;
  isLocked?: boolean;
  hasStoredPin?: boolean;
  onSetPin?: (pin: string | null) => void;
}

export function RoomSelector({
  currentRoom,
  onJoinRoom,
  isConnected,
  isLocked = false,
  hasStoredPin = false,
  onSetPin,
}: RoomSelectorProps) {
  const [inputVal, setInputVal] = useState(currentRoom);
  const [pinVal, setPinVal] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onJoinRoom(inputVal.trim().toUpperCase(), pinVal.trim() || undefined);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    onSetPin?.(newPinInput.trim() || null);
    setShowPinModal(false);
    setNewPinInput('');
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-green-500 shadow-[0_0_8px_#22c55e]'
                : isLocked
                ? 'bg-rose-500 animate-pulse'
                : 'bg-amber-500 animate-pulse'
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
            className="bg-neutral-950 border border-neutral-700 text-neutral-200 px-2 py-0.5 rounded w-24 sm:w-28 uppercase text-center focus:outline-none focus:border-amber-500"
            maxLength={12}
          />

          <input
            type="password"
            value={pinVal}
            onChange={(e) => setPinVal(e.target.value)}
            placeholder="PIN"
            className={`bg-neutral-950 border px-1.5 py-0.5 rounded w-14 text-center focus:outline-none ${
              isLocked
                ? 'border-rose-500 text-rose-300 animate-pulse'
                : 'border-neutral-700 text-neutral-200 focus:border-amber-500'
            }`}
            maxLength={6}
          />

          <button
            type="submit"
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded transition cursor-pointer"
          >
            LINK
          </button>
        </form>

        {/* Security Lock / Manage PIN Button */}
        {onSetPin && (
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className={`p-1 rounded border transition cursor-pointer ${
              hasStoredPin
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/60'
                : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={hasStoredPin ? 'Room Protected by PIN (Click to change)' : 'Set Room Security PIN'}
          >
            {hasStoredPin ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* PIN Setup Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-md p-5 max-w-xs w-full flex flex-col gap-3 font-mono shadow-2xl">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold uppercase">
              <KeyRound className="h-4 w-4" />
              <span>Ship Security PIN</span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Set a 4 to 6 digit security PIN for room <strong className="text-amber-400">{currentRoom}</strong>. Leave blank to clear protection.
            </p>

            <form onSubmit={handleSavePin} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="Enter PIN (e.g. 1138)"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                maxLength={6}
                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-center text-sm text-neutral-100 focus:outline-none focus:border-cyan-400 font-mono tracking-widest"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-1 rounded border border-neutral-700 bg-neutral-800 text-xs text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1 rounded border border-cyan-500/50 bg-cyan-500/20 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 cursor-pointer"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}