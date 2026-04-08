import React from 'react';
import { RtdbMessage, MessageType } from '../../shared/types';

/**
 * Logic chuyển đổi tin nhắn thành nhãn hiển thị (Snippet)
 */
export const getMessageDisplayContent = (message: RtdbMessage): string => {
    if (message.isRecalled) return 'Tin nhắn đã thu hồi';
    
    switch (message.type) {
        case MessageType.TEXT:
            return message.content.replace(/@\[([^\]]+)\]/g, '@$1');
        case MessageType.IMAGE:
            return '[Hình ảnh]';
        case MessageType.VIDEO:
            return '[Video]';
        case MessageType.GIF:
            return '[GIF]';
        case MessageType.FILE:
            return `[File] ${message.media?.[0]?.fileName || ''}`;
        case MessageType.VOICE:
            return '[Tin nhắn thoại]';
        case MessageType.CALL:
            return '[Cuộc gọi]';
        default:
            return '[Tin nhắn]';
    }
};

/**
 * Parser cho nội dung văn bản có chứa Mentions và Links
 * Chuyển đổi chuỗi @[userId:Name] thành danh sách các phần tử
 */
export const parseTextWithMentions = (text: string) => {
    return text.split(/(@\[[^:]+:[^\]]+\]|@[^\s\u200B]+(?:\s[^\s\u200B]+)*\u200B|(?:https?:\/\/|www\.)[^\s]+)/g);
};
