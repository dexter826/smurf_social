import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc,
  Timestamp,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FriendRequest, FriendRequestStatus } from '../types';
import { convertTimestamp } from '../utils/dateUtils';

export const friendService = {
  checkFriendRequestExists: async (senderId: string, receiverId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', senderId),
        where('receiverId', '==', receiverId),
        where('status', '==', FriendRequestStatus.PENDING)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Lỗi kiểm tra lời mời kết bạn", error);
      return false;
    }
  },

  sendFriendRequest: async (senderId: string, receiverId: string, message?: string): Promise<FriendRequest> => {
    try {
      if (senderId === receiverId) {
        throw new Error("Không thể gửi lời mời kết bạn cho chính mình");
      }

      const [receiverSnap, receiverSec, senderSec] = await Promise.all([
        getDoc(doc(db, 'users', receiverId)),
        getDoc(doc(db, 'users', receiverId, 'private', 'security')),
        getDoc(doc(db, 'users', senderId, 'private', 'security')),
      ]);
      if (!receiverSnap.exists()) throw new Error("Người dùng không tồn tại");
      if (receiverSec.data()?.blockedUserIds?.includes(senderId)) {
        throw new Error("Không thể gửi lời mời kết bạn cho người dùng này");
      }
      if (senderSec.data()?.blockedUserIds?.includes(receiverId)) {
        throw new Error("Bạn đã chặn người dùng này");
      }

      const alreadySent = await friendService.checkFriendRequestExists(senderId, receiverId);
      if (alreadySent) throw new Error("Đã gửi lời mời kết bạn rồi");

      const requestData = {
        senderId,
        receiverId,
        status: FriendRequestStatus.PENDING,
        message: message || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'friendRequests'), requestData);
      // Cloud Function onFriendRequestCreated xử lý notification

      return {
        id: docRef.id,
        ...requestData,
        createdAt: convertTimestamp(requestData.createdAt),
        updatedAt: convertTimestamp(requestData.updatedAt)
      } as FriendRequest;
    } catch (error) {
      console.error("Lỗi gửi lời mời kết bạn", error);
      throw error;
    }
  },

  getReceivedRequests: async (userId: string): Promise<FriendRequest[]> => {
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', userId),
        where('status', '==', FriendRequestStatus.PENDING),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      } as FriendRequest));
    } catch (error) {
      console.error("Lỗi lấy lời mời kết bạn", error);
      return [];
    }
  },

  subscribeToReceivedRequests: (userId: string, callback: (requests: FriendRequest[]) => void) => {
    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', userId),
      where('status', '==', FriendRequestStatus.PENDING),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      } as FriendRequest));
      callback(requests);
    }, (error) => {
      console.error("Lỗi subscribe lời mời kết bạn", error);
    });
  },

  getSentRequests: async (userId: string): Promise<FriendRequest[]> => {
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', userId),
        where('status', '==', FriendRequestStatus.PENDING),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      } as FriendRequest));
    } catch (error) {
      console.error("Lỗi lấy lời mời đã gửi", error);
      return [];
    }
  },

  subscribeToSentRequests: (userId: string, callback: (requests: FriendRequest[]) => void) => {
    const q = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', userId),
      where('status', '==', FriendRequestStatus.PENDING),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestamp(doc.data().createdAt),
        updatedAt: convertTimestamp(doc.data().updatedAt)
      } as FriendRequest));
      callback(requests);
    }, (error) => {
      console.error("Lỗi subscribe lời mời đã gửi", error);
    });
  },

  // Cloud Function onFriendRequestStatusChange cập nhật friendIds và gửi notification
  acceptFriendRequest: async (requestId: string): Promise<void> => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status: FriendRequestStatus.ACCEPTED,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Lỗi chấp nhận kết bạn", error);
      throw error;
    }
  },

  rejectFriendRequest: async (requestId: string): Promise<void> => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await deleteDoc(requestRef);
    } catch (error) {
      console.error("Lỗi từ chối kết bạn", error);
      throw error;
    }
  },

  cancelFriendRequest: async (requestId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
    } catch (error) {
      console.error("Lỗi hủy lời mời kết bạn", error);
      throw error;
    }
  },

  unfriend: async (_userId: string, friendId: string): Promise<void> => {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const fn = httpsCallable(getFunctions(), 'unfriend');
      await fn({ friendId });
    } catch (error) {
      console.error("Lỗi hủy kết bạn", error);
      throw error;
    }
  },

};
