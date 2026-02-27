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
import { FriendRequest, FriendRequestStatus } from '../types';
import { convertTimestamp } from '../utils/dateUtils';

export const friendService = {
  sendFriendRequest: async (senderId: string, receiverId: string, message?: string): Promise<FriendRequest> => {
    try {
      if (senderId === receiverId) {
        throw new Error("Không thể gửi lời mời kết bạn cho chính mình");
      }

      // Kiểm tra block lẫn nhau
      const receiverSnap = await getDoc(doc(db, 'users', receiverId));
      if (!receiverSnap.exists()) throw new Error("Người dùng không tồn tại");
      const receiverData = receiverSnap.data();
      if (receiverData.blockedUserIds?.includes(senderId)) {
        throw new Error("Không thể gửi lời mời kết bạn cho người dùng này");
      }
      const senderSnap = await getDoc(doc(db, 'users', senderId));
      if (senderSnap.exists() && senderSnap.data().blockedUserIds?.includes(receiverId)) {
        throw new Error("Bạn đã chặn người dùng này");
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
