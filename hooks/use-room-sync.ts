import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useRoomSync<T>(roomCode: string, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Track timestamps and debounce timer
  const lastLocalUpdateRef = useRef<number>(Date.now());
  const pendingSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T>(initialData);

  // Keep latestDataRef in sync with state
  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  // 1. Initial Load & Realtime Subscription
  useEffect(() => {
    if (!roomCode) return;

    const code = roomCode.trim().toUpperCase();

    async function loadRoom() {
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('ship_state, updated_at')
        .eq('room_code', code)
        .single();

      if (room && room.ship_state && Object.keys(room.ship_state).length > 0) {
        setData(room.ship_state as T);
        latestDataRef.current = room.ship_state as T;
      } else if (!room && !error) {
        await supabase
          .from('game_rooms')
          .insert({
            room_code: code,
            ship_state: initialData,
            updated_at: new Date().toISOString(),
          });
      }
    }

    loadRoom();

    // Subscribe to Postgres Realtime broadcasts
    const channel = supabase
      .channel(`room:${code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_code=eq.${code}`,
        },
        (payload) => {
          if (!payload.new || !payload.new.ship_state) return;

          const remoteTimestamp = new Date(payload.new.updated_at).getTime();

          // Discard remote updates that originated prior to our latest local user action
          if (remoteTimestamp <= lastLocalUpdateRef.current) {
            return;
          }

          setData(payload.new.ship_state as T);
          latestDataRef.current = payload.new.ship_state as T;
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      if (pendingSyncTimeoutRef.current) {
        clearTimeout(pendingSyncTimeoutRef.current);
      }
    };
  }, [roomCode]);

  // 2. Local Update with Debounced Cloud Sync
  const updateRoomData = useCallback(
    (updater: (prev: T) => T) => {
      const now = Date.now();
      lastLocalUpdateRef.current = now;

      // Optimistically update local screen immediately
      setData((prev) => {
        const next = updater(prev);
        latestDataRef.current = next;
        return next;
      });

      // Clear pending network push and debounce for 150ms
      if (pendingSyncTimeoutRef.current) {
        clearTimeout(pendingSyncTimeoutRef.current);
      }

      pendingSyncTimeoutRef.current = setTimeout(async () => {
        if (!roomCode) return;
        const code = roomCode.trim().toUpperCase();

        const { error } = await supabase
          .from('game_rooms')
          .upsert({
            room_code: code,
            ship_state: latestDataRef.current,
            updated_at: new Date(now).toISOString(),
          });

        if (error) {
          console.error('Failed to sync room state to cloud:', error);
        }
      }, 150);
    },
    [roomCode]
  );

  return { data, updateRoomData, isConnected };
}