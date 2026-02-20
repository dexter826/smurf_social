import { create } from 'zustand';

export type CallPhase = 'idle' | 'outgoing' | 'in-call';

interface CallState {
  callPhase: CallPhase;
  callType: 'voice' | 'video';
  activeRoomId: string | null;
  otherUserIds: string[];
  isGroupCall: boolean;
  isCaller: boolean;
  callStartTime: number | null;

  callConversationId: string | null;

  startCall: ((recipientIds: string[], callerId: string, callerName: string, callerAvatar: string, callType: 'voice' | 'video', roomId: string, isGroupCall: boolean) => Promise<{ success: boolean; reason?: string } | void>) | null;
  acceptCall: ((signal: any) => Promise<void>) | null;
  rejectCall: ((signal: any) => Promise<void>) | null;
  endCall: ((recipientIds: string[]) => Promise<void>) | null;

  setCallPhase: (phase: CallPhase) => void;
  setCallType: (type: 'voice' | 'video') => void;
  setActiveRoomId: (id: string | null) => void;
  setOtherUserIds: (ids: string[]) => void;
  setIsGroupCall: (v: boolean) => void;
  setIsCaller: (v: boolean) => void;
  setCallStartTime: (t: number | null) => void;
  setCallConversationId: (id: string | null) => void;
  
  setSignalingActions: (actions: {
    startCall: any;
    acceptCall: any;
    rejectCall: any;
    endCall: any;
  }) => void;
  resetCall: () => void;
}

const initialState = {
  callPhase: 'idle' as CallPhase,
  callType: 'voice' as 'voice' | 'video',
  activeRoomId: null,
  otherUserIds: [],
  isGroupCall: false,
  isCaller: false,
  callStartTime: null,
  callConversationId: null,

  startCall: null,
  acceptCall: null,
  rejectCall: null,
  endCall: null,
};

export const useCallStore = create<CallState>((set) => ({
  ...initialState,

  setCallPhase: (phase) => set({ callPhase: phase }),
  setCallType: (type) => set({ callType: type }),
  setActiveRoomId: (id) => set({ activeRoomId: id }),
  setOtherUserIds: (ids) => set({ otherUserIds: ids }),
  setIsGroupCall: (v) => set({ isGroupCall: v }),
  setIsCaller: (v) => set({ isCaller: v }),
  setCallStartTime: (t) => set({ callStartTime: t }),
  setCallConversationId: (id) => set({ callConversationId: id }),

  setSignalingActions: (actions) => set({ ...actions }),
  resetCall: () => set((state) => ({
    ...initialState,
    startCall: state.startCall,
    acceptCall: state.acceptCall,
    rejectCall: state.rejectCall,
    endCall: state.endCall,
  })),
}));
