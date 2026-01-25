import React, { useEffect, useState } from 'react';
import { Camera, Edit3, Grid, Image as ImageIcon, User as UserIcon, Mail, Phone, Calendar } from 'lucide-react';
import { userService } from '../services/userService';
import { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { Avatar, Button, Input, Spinner } from '../components/ui';

const ProfilePage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProfile = async () => {
        if(currentUser) {
            const data = await userService.getUserById(currentUser.id);
            setProfile(data || null);
            setEditData(data || {});
            setLoading(false);
        }
    }
    loadProfile();
  }, [currentUser]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!editData.name?.trim()) newErrors.name = 'Tên không được để trống';
    if (editData.phone && !/^\d{10,11}$/.test(editData.phone)) {
        newErrors.phone = 'Số điện thoại không hợp lệ (10-11 số)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!profile) return;
    
    try {
      setLoading(true);
      const updated = await userService.updateProfile(profile.id, editData);
      setProfile(updated);
      setIsEditing(false);
      setErrors({});
    } catch (error) {
      alert("Không thể cập nhật hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData(profile || {});
    setIsEditing(false);
    setErrors({});
  };

  if (loading && !profile) return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  if (!profile) return <div>User not found</div>;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#eef0f1] dark:bg-gray-900">
        {/* Cover Image */}
        <div className="relative h-[200px] md:h-[280px] w-full bg-gray-300">
            <img 
                src={profile.coverImage || "https://picsum.photos/1200/400"} 
                className="w-full h-full object-cover" 
                alt="Cover"
            />
            {isEditing && (
                <button className="absolute bottom-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors">
                    <Camera size={20} />
                </button>
            )}
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-10">
            {/* Header Info */}
            <div className="relative -mt-12 mb-6 flex flex-col md:flex-row items-center md:items-end gap-4">
                <div className="relative group">
                    <div className="p-1 bg-white rounded-full">
                         <Avatar src={profile.avatar} size="2xl" className="border-4 border-white" />
                    </div>
                    {isEditing && (
                        <button className="absolute bottom-2 right-2 bg-gray-200 p-1.5 rounded-full text-gray-700 opacity-100 transition-opacity">
                            <Camera size={16} />
                        </button>
                    )}
                </div>
                
                <div className="flex-1 text-center md:text-left mb-2">
                    {isEditing ? (
                        <div className="space-y-2 max-w-xs mx-auto md:mx-0">
                            <Input 
                                value={editData.name} 
                                onChange={e => setEditData({...editData, name: e.target.value})}
                                error={errors.name}
                                placeholder="Tên hiển thị"
                                className="font-bold text-lg"
                            />
                            <Input 
                                value={editData.bio} 
                                onChange={e => setEditData({...editData, bio: e.target.value})}
                                placeholder="Giới thiệu bản thân"
                                className="text-sm"
                            />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-text-main">{profile.name}</h1>
                            <p className="text-text-secondary">{profile.bio || "Chưa có giới thiệu"}</p>
                        </>
                    )}
                </div>

                <div className="mb-4 md:mb-2 flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="primary" onClick={handleSave} disabled={loading}>Lưu</Button>
                            <Button variant="secondary" onClick={handleCancel}>Hủy</Button>
                        </>
                    ) : (
                        <Button variant="secondary" icon={<Edit3 size={16} />} onClick={() => setIsEditing(true)}>Chỉnh sửa</Button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left: Info */}
                <div className="space-y-6">
                    <div className="bg-bg-main rounded-lg p-4 shadow-card">
                        <h3 className="font-semibold text-lg mb-4">Giới thiệu</h3>
                        <div className="space-y-3 text-sm text-text-secondary">
                            <div className="flex items-center gap-3">
                                <Mail size={18} /> <span>{profile.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={18} /> 
                                {isEditing ? (
                                    <Input 
                                        value={editData.phone} 
                                        onChange={e => setEditData({...editData, phone: e.target.value})}
                                        error={errors.phone}
                                        placeholder="Số điện thoại"
                                        className="h-8 text-xs"
                                    />
                                ) : (
                                    <span>{profile.phone || "Chưa cập nhật"}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <UserIcon size={18} /> 
                                {isEditing ? (
                                    <select 
                                        value={editData.gender} 
                                        onChange={e => setEditData({...editData, gender: e.target.value as 'male' | 'female'})}
                                        className="h-8 text-sm block w-full rounded-md border-gray-300 bg-bg-main border focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    >
                                        <option value="male">Nam</option>
                                        <option value="female">Nữ</option>
                                    </select>
                                ) : (
                                    <span>{profile.gender === 'male' ? 'Nam' : 'Nữ'}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar size={18} /> <span>20/10/1995</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-bg-main rounded-lg p-4 shadow-card">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-semibold text-lg">Ảnh</h3>
                             <span className="text-primary-500 text-sm cursor-pointer">Xem tất cả</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="aspect-square bg-gray-100 rounded overflow-hidden">
                                    <img src={`https://picsum.photos/200?random=${i}`} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Posts (Mock Layout) */}
                <div className="md:col-span-2 space-y-4">
                     <div className="bg-bg-main rounded-lg p-4 shadow-card flex items-center justify-center h-32 text-text-secondary">
                         Không có bài viết nào gần đây
                     </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default ProfilePage;