import React, { useEffect, useRef } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useUserCache } from "../../../store/userCacheStore";

const ZEGO_APP_ID = Number(import.meta.env.VITE_ZEGO_APP_ID);
const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET as string;

interface CallWindowProps {
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  callType: "voice" | "video";
  isGroupCall?: boolean;
  onClose: () => void;
}

export const CallWindow: React.FC<CallWindowProps> = ({
  roomId,
  userId,
  userName,
  userAvatar,
  callType,
  isGroupCall,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zegoRef = useRef<ZegoUIKitPrebuilt | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!containerRef.current) return;

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      ZEGO_APP_ID,
      ZEGO_SERVER_SECRET,
      roomId,
      userId,
      userName,
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zegoRef.current = zp;

    const activeUsers = new Set<string>();

    zp.joinRoom({
      container: containerRef.current,
      scenario: { 
        mode: isGroupCall ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall 
      },
      turnOnCameraWhenJoining: callType === "video",
      showPreJoinView: false,
      showTextChat: false,
      showUserList: false,
      showLeavingView: false,
      console: ZegoUIKitPrebuilt.ConsoleNone,
      onUserAvatarSetter: (userList: any[]) => {
        const usersMap = useUserCache.getState().users;
        
        userList.forEach((u) => {
          if (u.userID === userId && userAvatar && u.setUserAvatar) {
            u.setUserAvatar(userAvatar);
          } else if (u.setUserAvatar) {
            const cachedUser = usersMap[u.userID];
            if (cachedUser?.avatar) {
              u.setUserAvatar(cachedUser.avatar);
            }
          }
        });
      },
      onLeaveRoom: () => {
        zegoRef.current = null;
        onCloseRef.current();
      },
      onUserJoin: (users: any[]) => {
        users.forEach(u => activeUsers.add(u.userID));
      },
      onUserLeave: (users: any[]) => {
        users.forEach(u => activeUsers.delete(u.userID));

        if (isGroupCall) {
          if (activeUsers.size === 0) {
            setTimeout(() => {
              if (zegoRef.current) {
                try {
                  zegoRef.current.destroy();
                } catch (e) {
                  console.error(e);
                }
                zegoRef.current = null;
              }
              onCloseRef.current();
            }, 500);
          }
          return;
        }

        setTimeout(() => {
          if (zegoRef.current) {
            try {
              zegoRef.current.destroy();
            } catch (e) {
              console.error(e);
            }
            zegoRef.current = null;
          }
          onCloseRef.current();
        }, 500);
      },
    });

    return () => {
      if (zegoRef.current) {
        try {
          zegoRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        zegoRef.current = null;
      }
    };
  }, [roomId, userId, userName, callType]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        width: "100%",
        height: "100%",
        background: "#000",
      }}
    />
  );
};
