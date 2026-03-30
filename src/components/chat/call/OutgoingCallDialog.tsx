import React, { useEffect, useState, useRef } from 'react';
import { PhoneOff, PhoneMissed } from 'lucide-react';
import { UserAvatar } from '../../ui';
import { CallEndReason } from '../../../store/callStore';
import waitRingSound from '../../../assets/sounds/wait_ring.mp3';

interface OutgoingCallDialogProps {
  calleeName: string;
  calleeId: string;
  calleeAvatar?: string;
  callType: 'voice' | 'video';
  endReason: CallEndReason;
  onCancel: () => void;
  onDismiss: () => void;
}

export const OutgoingCallDialog: React.FC<OutgoingCallDialogProps> = ({
  calleeName,
  calleeId,
  calleeAvatar,
  callType,
  endReason,
  onCancel,
  onDismiss,
}) => {
  const [dots, setDots] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (endReason && audioRef.current) {
      audioRef.current.pause();
    }
  }, [endReason]);

  useEffect(() => {
    if (!endReason && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.warn("Trình duyệt chặn autoplay âm thanh chờ:", e);
      });
    }
  }, [endReason]);

  const endReasonConfig = {
    busy: {
      icon: <PhoneMissed size={28} className="text-white" />,
      label: 'Đang bận',
      subtitle: 'Người dùng đang trong cuộc gọi khác',
      bg: 'bg-orange-500',
    },
    rejected: {
      icon: <PhoneOff size={28} className="text-white" />,
      label: 'Từ chối',
      subtitle: 'Cuộc gọi bị từ chối',
      bg: 'bg-red-500',
    },
  };

  const reasonConfig = endReason ? endReasonConfig[endReason] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <audio ref={audioRef} src={waitRingSound} loop />
      <div className="flex flex-col items-center gap-6 px-10 py-10 bg-gray-900 rounded-3xl shadow-2xl min-w-[300px]">
        <p className="text-gray-400 text-sm tracking-wide">
          {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
        </p>

        <UserAvatar userId={calleeId} name={calleeName} src={calleeAvatar} size="xl" />

        <div className="text-center">
          <h3 className="text-white text-xl font-semibold">{calleeName}</h3>
          {reasonConfig ? (
            <div className="mt-2 flex flex-col items-center gap-1">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                endReason === 'busy' ? 'text-orange-400' : 'text-red-400'
              }`}>
                {reasonConfig.label}
              </span>
              <span className="text-gray-500 text-xs">{reasonConfig.subtitle}</span>
            </div>
          ) : (
            <p className="text-gray-400 text-sm mt-1">Đang gọi{dots}</p>
          )}
        </div>

        {reasonConfig ? (
          <button
            onClick={onDismiss}
            className={`w-16 h-16 rounded-full ${reasonConfig.bg} hover:opacity-80 flex items-center justify-center transition-colors shadow-lg`}
            title="Đóng"
          >
            {reasonConfig.icon}
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg"
            title="Hủy cuộc gọi"
          >
            <PhoneOff size={28} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
};
