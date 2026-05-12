import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi, Loader2 } from 'lucide-react';
import { useConnectionStatus } from '../../hooks/utils/useConnectionStatus';

export const ConnectionStatus: React.FC = () => {
    const { isFullyConnected, isOnline, isFirebaseConnected } = useConnectionStatus();
    const [showReconnected, setShowReconnected] = useState(false);
    const hasConnectedOnce = useRef(false);
    const wasDisconnected = useRef(false);

    useEffect(() => {
        if (isFullyConnected) {
            if (wasDisconnected.current) {
                setShowReconnected(true);
                const t = setTimeout(() => setShowReconnected(false), 4000);
                wasDisconnected.current = false;
                return () => clearTimeout(t);
            }
            hasConnectedOnce.current = true;
            wasDisconnected.current = false;
        } else {
            if (hasConnectedOnce.current || !isOnline) {
                wasDisconnected.current = true;
                setShowReconnected(false);
            }
        }
    }, [isFullyConnected, isOnline]);

    if (isFullyConnected && !showReconnected) return null;

    if (!hasConnectedOnce.current && isOnline && !wasDisconnected.current) return null;

    const status = !isOnline ? 'offline' : !isFirebaseConnected ? 'connecting' : 'online';

    return (
        <div 
            className="fixed top-24 left-0 right-0 z-[var(--z-toast)] pointer-events-none flex justify-center px-4"
        >
            <div
                className={`
                    pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-2xl shadow-dropdown
                    backdrop-blur-xl border transition-all duration-500 transform
                    ${status === 'online' 
                        ? 'bg-success/90 border-success/20 text-white translate-y-0 scale-100' 
                        : status === 'offline'
                        ? 'bg-error/90 border-error/20 text-white translate-y-0 scale-105'
                        : 'bg-warning/90 border-warning/20 text-text-primary translate-y-0 scale-100'
                    }
                    animate-in slide-in-from-top-4 duration-300
                `}
            >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                    {status === 'online' && <Wifi size={14} className="animate-pulse" />}
                    {status === 'offline' && <WifiOff size={14} />}
                    {status === 'connecting' && <Loader2 size={14} className="animate-spin" />}
                </div>
                
                <div className="flex flex-col">
                    <span className="text-sm font-bold leading-tight">
                        {status === 'online' ? 'Đã trực tuyến' : status === 'offline' ? 'Mất kết nối' : 'Đang kết nối'}
                    </span>
                    <span className="text-[10px] opacity-80 font-medium">
                        {status === 'online' 
                            ? 'Dữ liệu đã được đồng bộ' 
                            : status === 'offline' 
                            ? 'Vui lòng kiểm tra internet' 
                            : 'Đang thiết lập lại liên kết...'
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};
