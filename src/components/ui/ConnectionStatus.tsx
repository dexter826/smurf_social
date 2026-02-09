import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useConnectionStatus } from '../../hooks/utils/useConnectionStatus';

/**
 * Component hiển thị trạng thái kết nối
 * Tự động ẩn khi kết nối ổn định, hiện khi mất kết nối
 */
export const ConnectionStatus: React.FC = () => {
    const { isFullyConnected, isOnline, isConnected } = useConnectionStatus();
    const [showReconnected, setShowReconnected] = React.useState(false);
    const wasDisconnected = React.useRef(false);

    React.useEffect(() => {
        if (!isFullyConnected) {
            wasDisconnected.current = true;
            setShowReconnected(false);
            return;
        }
        if (wasDisconnected.current) {
            wasDisconnected.current = false;
            setShowReconnected(true);
            const timer = setTimeout(() => setShowReconnected(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isFullyConnected]);

    // Không hiển thị gì khi kết nối ổn định và không có thông báo reconnect
    if (isFullyConnected && !showReconnected) {
        return null;
    }

    return (
        <div
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${isFullyConnected
                    ? 'bg-success text-white animate-in slide-in-from-top-4 fade-in'
                    : 'bg-error text-white animate-in slide-in-from-top-4 fade-in'
                }`}
        >
            {isFullyConnected ? (
                <>
                    <Wifi size={16} />
                    <span>Đã kết nối lại</span>
                </>
            ) : (
                <>
                    <WifiOff size={16} />
                    <span>
                        {!isOnline ? 'Không có kết nối Internet' : 'Đang kết nối lại...'}
                    </span>
                </>
            )}
        </div>
    );
};
