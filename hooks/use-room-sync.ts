import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface RoomSyncStatus {
  isPinRequired: boolean;
  isUnlocked: boolean;
  hasStoredPin: boolean;
  isCreationBlocked: boolean;
}

export function useRoomSync<T>(
  roomCode: string,
  initialData: T,
  providedPin?: string,
  masterCreationKey?: string
) {
  const [data, setData] = useState<T>(initialData);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<RoomSyncStatus>({
    isPinRequired: false,
    isUnlocked: false,
    hasStoredPin: false,
    isCreationBlocked: false,
  });

  const lastLocalUpdateRef = useRef<number>(Date.now());
  const pendingSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T>(initialData);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  // 1. Initial Load & Realtime Subscription
  useEffect(() => {
    if (!roomCode) return;

    const code = roomCode.trim().toUpperCase();
    const pin = providedPin ? providedPin.trim() : null;
    const expectedCreationKey = process.env.NEXT_PUBLIC_CREATION_KEY;

    async function loadRoom() {
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('ship_state, updated_at, access_pin')
        .eq('room_code', code)
        .maybeSingle();

      if (room) {
        // Room exists in database -> verify room PIN
        const storedPin = room.access_pin;
        const requiresPin = Boolean(storedPin && storedPin.trim() !== '');

        if (requiresPin && storedPin !== pin) {
          setSyncStatus({
            isPinRequired: true,
            isUnlocked: false,
            hasStoredPin: true,
            isCreationBlocked: false,
          });
          setIsConnected(false);
          return;
        }

        // Room is authorized
        setSyncStatus({
          isPinRequired: false,
          isUnlocked: true,
          hasStoredPin: requiresPin,
          isCreationBlocked: false,
        });

        if (room.ship_state && Object.keys(room.ship_state).length > 0) {
          setData(room.ship_state as T);
          latestDataRef.current = room.ship_state as T;
        }
      } else if (!room && !error) {
        // Room does not exist -> verify Master Shipyard Key
        if (expectedCreationKey && masterCreationKey !== expectedCreationKey) {
          setSyncStatus({
            isPinRequired: false,
            isUnlocked: false,
            hasStoredPin: false,
            isCreationBlocked: true,
          });
          setIsConnected(false);
          return;
        }

        // Key matched or no restriction configured -> create the room
        await supabase
          .from('game_rooms')
          .insert({
            room_code: code,
            ship_state: initialData,
            access_pin: pin,
            updated_at: new Date().toISOString(),
          });

        setSyncStatus({
          isPinRequired: false,
          isUnlocked: true,
          hasStoredPin: Boolean(pin),
          isCreationBlocked: false,
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

          if (payload.new.access_pin && payload.new.access_pin !== pin) {
            setSyncStatus({
              isPinRequired: true,
              isUnlocked: false,
              hasStoredPin: true,
              isCreationBlocked: false,
            });
            setIsConnected(false);
            return;
          }

          const remoteTimestamp = new Date(payload.new.updated_at).getTime();

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
  }, [roomCode, providedPin, masterCreationKey]);

  // 2. Debounced Cloud Sync
  const updateRoomData = useCallback(
    (updater: (prev: T) => T) => {
      if ((syncStatus.isPinRequired && !syncStatus.isUnlocked) || syncStatus.isCreationBlocked) {
        return;
      }

      const now = Date.now();
      lastLocalUpdateRef.current = now;

      setData((prev) => {
        const next = updater(prev);
        latestDataRef.current = next;
        return next;
      });

      if (pendingSyncTimeoutRef.current) {
        clearTimeout(pendingSyncTimeoutRef.current);
      }

      pendingSyncTimeoutRef.current = setTimeout(async () => {
        if (!roomCode) return;
        const code = roomCode.trim().toUpperCase();

        const payload: Record<string, any> = {
          room_code: code,
          ship_state: latestDataRef.current,
          updated_at: new Date(now).toISOString(),
        };

        if (providedPin) {
          payload.access_pin = providedPin.trim();
        }

        const { error } = await supabase.from('game_rooms').upsert(payload);
        if (error) console.error('Failed to sync room state to cloud:', error);
      }, 150);
    },
    [roomCode, providedPin, syncStatus]
  );

  // 3. Helper to update/clear PIN
  const setRoomPin = useCallback(
    async (newPin: string | null) => {
      if (!roomCode) return;
      const code = roomCode.trim().toUpperCase();
      const cleanPin = newPin && newPin.trim() !== '' ? newPin.trim() : null;

      const { error } = await supabase
        .from('game_rooms')
        .update({ access_pin: cleanPin })
        .eq('room_code', code);

      if (!error) {
        setSyncStatus((prev) => ({
          ...prev,
          hasStoredPin: Boolean(cleanPin),
          isPinRequired: false,
          isUnlocked: true,
        }));
      }
    },
    [roomCode]
  );

  return { data, updateRoomData, isConnected, syncStatus, setRoomPin };
}