import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  addDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FriendRequest, FriendRequestStatus, User, NotificationType } from '../types';
import { notificationService } from './notificationService';

export const friendService = {
  sendFriendRequest: async (senderId: string, receiverId: string, message?: string): Promise<FriendRequest> => {
    try {
      if (senderId === receiverId) {
        throw new Error("Không thể gửi lời mời kết bạn cho chính mình");
      }

      // Tránh gửi trùng lời mời
      const q = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', senderId),
        where('receiverId', '==', receiverId),
        where('status', '==', FriendRequestStatus.PENDING)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error("Đã gửi lời mời kết bạn rồi");
      }

      const requestData = {
        senderId,
        receiverId,
        status: FriendRequestStatus.PENDING,
        message: message || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'friendRequests'), requestData);
      
      await notificationService.createNotification({
        receiverId,
        senderId,
        type: NotificationType.FRIEND_REQUEST,
        data: { friendRequestId: docRef.id }
      });

      return {
        id: docRef.id,
        ...requestData,
        createdAt: requestData.createdAt.toDate(),
        updatedAt: requestData.updatedAt.toDate()
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
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
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
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
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
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
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
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as FriendRequest));
      callback(requests);
    }, (error) => {
      console.error("Lỗi subscribe lời mời đã gửi", error);
    });
  },

  acceptFriendRequest: async (requestId: string, userId: string, friendId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      const requestRef = doc(db, 'friendRequests', requestId);
      batch.update(requestRef, {
        status: FriendRequestStatus.ACCEPTED,
        updatedAt: Timestamp.now()
      });

      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        friendIds: arrayUnion(friendId)
      });

      const friendRef = doc(db, 'users', friendId);
      batch.update(friendRef, {
        friendIds: arrayUnion(userId)
      });

      await batch.commit();

      // Gửi thông báo chấp nhận kết bạn
      await notificationService.createNotification({
        receiverId: friendId,
        senderId: userId,
        type: NotificationType.FRIEND_ACCEPT,
        data: {}
      });
    } catch (error) {
      console.error("Lỗi chấp nhận kết bạn", error);
      throw error;
    }
  },

  rejectFriendRequest: async (requestId: string): Promise<void> => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status: FriendRequestStatus.REJECTED,
        updatedAt: Timestamp.now()
      });
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

  unfriend: async (userId: string, friendId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        friendIds: arrayRemove(friendId)
      });

      const friendRef = doc(db, 'users', friendId);
      batch.update(friendRef, {
        friendIds: arrayRemove(userId)
      });

      await batch.commit();
    } catch (error) {
      console.error("Lỗi hủy kết bạn", error);
      throw error;
    }
  },

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
  }
};
