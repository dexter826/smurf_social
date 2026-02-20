import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { UserAvatar } from '../../ui';
import ringSound from '../../../assets/sounds/ring.mp3';

interface IncomingCallDialogProps {
  callerName: string;
  callerId: string;
  callType: 'voice' | 'video';
  isGroupCall?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  callerName,
  callerId,
  callType,
  isGroupCall,
  onAccept,
  onReject,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => {
        console.warn("Trình duyệt chặn autoplay âm thanh:", e);
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <audio ref={audioRef} src={ringSound} loop />
      <div className="w-full sm:w-auto flex flex-col items-center gap-5 px-10 py-8 bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl sm:min-w-[300px]">
        <p className="text-gray-400 text-sm tracking-wide">
          {callType === 'video' 
            ? (isGroupCall ? 'Cuộc gọi nhóm video đến' : 'Cuộc gọi video đến') 
            : (isGroupCall ? 'Cuộc gọi nhóm thoại đến' : 'Cuộc gọi thoại đến')}
        </p>

        <div className="relative">
          <UserAvatar userId={callerId} name={callerName} size="xl" />
          {/* Pulse animation */}
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
        </div>

        <div className="text-center">
          <h3 className="text-white text-xl font-semibold">{callerName}</h3>
          <p className="text-gray-400 text-sm mt-1">đang gọi cho bạn</p>
        </div>

        <div className="flex gap-8 mt-2">
          {/* Từ chối */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
              title="Từ chối"
            >
              <PhoneOff size={26} className="text-white" />
            </button>
            <span className="text-gray-400 text-xs">Từ chối</span>
          </div>

          {/* Chấp nhận */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-lg"
              title="Chấp nhận"
            >
              {callType === 'video'
                ? <Video size={26} className="text-white" />
                : <Phone size={26} className="text-white" />
              }
            </button>
            <span className="text-gray-400 text-xs">Chấp nhận</span>
          </div>
        </div>
      </div>
    </div>
  );
};
