import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, set, onValue, remove, serverTimestamp, update, get } from 'firebase/database';
import { rtdb } from '../../firebase/config';

export type CallStatus = 'calling' | 'accepted' | 'rejected' | 'ended';

export interface CallSignal {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'voice' | 'video';
  roomId: string;
  status: CallStatus;
  startedAt: number;
  isGroupCall?: boolean;
}

const notifRef = (userId: string) => ref(rtdb, `/callNotifications/${userId}`);

interface UseCallSignalingOptions {
  onCallAccepted?: (signal: CallSignal) => void;
  onCallRejected?: () => void;
  onCallEnded?: () => void;
}

export function useCallSignaling(
  currentUserId: string,
  { onCallAccepted, onCallRejected, onCallEnded }: UseCallSignalingOptions = {},
) {
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);

  const onAcceptedRef = useRef(onCallAccepted);
  const onRejectedRef = useRef(onCallRejected);
  const onEndedRef = useRef(onCallEnded);
  useEffect(() => { onAcceptedRef.current = onCallAccepted; }, [onCallAccepted]);
  useEffect(() => { onRejectedRef.current = onCallRejected; }, [onCallRejected]);
  useEffect(() => { onEndedRef.current = onCallEnded; }, [onCallEnded]);

  const hadDataRef = useRef(false);
  const isAcceptingRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;

    const unsub = onValue(notifRef(currentUserId), (snap) => {
      const data = snap.val() as CallSignal | null;

      if (!data) {
        if (hadDataRef.current && !isAcceptingRef.current) {
          onEndedRef.current?.();
        }
        hadDataRef.current = false;
        isAcceptingRef.current = false;
        setIncomingCall(null);
        return;
      }

      hadDataRef.current = true;

      if (data.callerId !== currentUserId) {
        if (data.status === 'calling') {
          setIncomingCall(data);
        }
        else setIncomingCall(null);
      } else {
        if (data.status === 'accepted') {
          onAcceptedRef.current?.(data);
        } else if (data.status === 'rejected') {
          onRejectedRef.current?.();
        }
      }
    });

    return () => unsub();
  }, [currentUserId]);

  const startCall = useCallback(async (
    recipientIds: string[],
    callerId: string,
    callerName: string,
    callerAvatar: string | undefined,
    callType: 'voice' | 'video',
    roomId: string,
    isGroupCall?: boolean,
  ) => {
    const availableIds: string[] = [];
    
    if (!isGroupCall) {
      for (const id of recipientIds) {
        const snap = await get(notifRef(id));
        if (snap.exists() && snap.val()?.status === 'calling') {
          
        } else {
          availableIds.push(id);
        }
      }
      if (availableIds.length === 0) {
        return { success: false, reason: 'busy' };
      }
    } else {
      availableIds.push(...recipientIds);
    }

    const updates: Record<string, any> = {};
    const signalData = {
      callerId,
      callerName,
      callerAvatar,
      callType,
      roomId,
      status: 'calling',
      startedAt: serverTimestamp(),
      isGroupCall,
    };

    availableIds.forEach(id => {
      updates[`/callNotifications/${id}`] = signalData;
    });
    
    updates[`/callNotifications/${callerId}`] = signalData;

    await update(ref(rtdb), updates);
    return { success: true };
  }, []);

  const acceptCall = useCallback(async (signal: CallSignal) => {
    isAcceptingRef.current = true;
    if (!signal.isGroupCall) {
      await set(notifRef(signal.callerId), { ...signal, status: 'accepted' });
    }
    await remove(notifRef(currentUserId));
  }, [currentUserId]);

  const rejectCall = useCallback(async (signal: CallSignal) => {
    if (!signal.isGroupCall) {
      await set(notifRef(signal.callerId), { ...signal, status: 'rejected' });
    }
    await remove(notifRef(currentUserId));
  }, [currentUserId]);

  const endCall = useCallback(async (otherUserIds?: string[]) => {
    await remove(notifRef(currentUserId));
    if (otherUserIds && otherUserIds.length > 0) {
      const updates: Record<string, null> = {};
      otherUserIds.forEach(id => {
        updates[`/callNotifications/${id}`] = null;
      });
      await update(ref(rtdb), updates);
    }
  }, [currentUserId]);

  return { incomingCall, startCall, acceptCall, rejectCall, endCall };
}
