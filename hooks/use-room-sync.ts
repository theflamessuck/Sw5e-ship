import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useRoomSync<T>(roomCode: string, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const isIncomingUpdate = useRef<boolean>(false);

  // 1. Initial Load & Realtime Subscription
  useEffect(() => {
    if (!roomCode) return;

    const code = roomCode.trim().toUpperCase();

    // Fetch existing room state if available
    async function loadRoom() {
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('ship_state')
        .eq('room_code', code)
        .single();

      if (room && room.ship_state && Object.keys(room.ship_state).length > 0) {
        isIncomingUpdate.current = true;
        setData(room.ship_state as T);
      } else if (!room && !error) {
        // Create the room entry on the fly if it does not exist
        await supabase
          .from('game_rooms')
          .insert({ room_code: code, ship_state: initialData });
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
          if (payload.new && payload.new.ship_state) {
            isIncomingUpdate.current = true;
            setData(payload.new.ship_state as T);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // 2. Broadcast local state changes back to Supabase
  const updateRoomData = useCallback(
    async (updater: (prev: T) => T) => {
      setData((prev) => {
        const next = updater(prev);

        if (roomCode) {
          const code = roomCode.trim().toUpperCase();
          // Upsert room state to cloud
          supabase
            .from('game_rooms')
            .upsert({
              room_code: code,
              ship_state: next,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.error('Failed to sync state:', error);
            });
        }
        return next;
      });
    },
    [roomCode]
  );

  return { data, updateRoomData, isConnected };
}