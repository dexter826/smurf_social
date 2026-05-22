import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShieldAlert, AlertTriangle, ShieldOff, CheckCircle2, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { User, Post, Comment, Report, UserStatus, PostStatus, CommentStatus, ReportStatus, REPORT_REASON_LABELS } from '../../../shared/types';
import { UserAvatar, Skeleton, EmptyState, Button, ConfirmDialog, SensitiveMediaGuard, MediaViewer } from '../ui';
import { useUserCache } from '../../store/userCacheStore';
import { formatRelativeTime } from '../../utils/dateUtils';
import { toast } from '../../store/toastStore';
import { postService } from '../../services/postService';
import { commentService } from '../../services/commentService';
import { getSafeMillis } from '../../utils/timestampHelpers';

const VIOLATION_WINDOW_DAYS = 7;
const BAN_THRESHOLD = 3;

const AI_MODERATION_LABELS: Record<string, string> = {
  sexual: 'Nội dung nhạy cảm / 18+',
  violence: 'Nội dung bạo lực / Máu me',
  harassment: 'Quấy rối / Độc hại',
  hate: 'Kích động thù hận',
  hate_speech: 'Kích động thù hận',
};

const getAIModerationLabel = (reason?: string) => {
  if (!reason) return 'Nội dung không phù hợp';
  return AI_MODERATION_LABELS[reason.toLowerCase()] || reason;
};

interface UserViolationSummary {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  status: UserStatus;
  strikes: number;
  posts: Post[];
  comments: Comment[];
  reports: Report[];
}

interface ReportEvidenceCardProps {
  report: Report;
  onOpenMedia: (mediaList: any[], index?: number) => void;
}

/** Hiển thị chi tiết nội dung gốc và thông tin mô tả báo cáo */
const ReportEvidenceCard: React.FC<ReportEvidenceCardProps> = ({ report, onOpenMedia }) => {
  const [content, setContent] = useState<string | null>(null);
  const [media, setMedia] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (report.targetType === 'user') return;
    
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        if (report.targetType === 'post') {
          const post = await postService.getPostByIdForAdmin(report.targetId);
          if (post) {
            setContent(post.content || '(Không có nội dung văn bản)');
            setMedia(post.media || null);
          } else {
            setContent('(Nội dung không còn tồn tại)');
          }
        } else if (report.targetType === 'comment') {
          const comment = await commentService.getCommentById(report.targetId, true);
          if (comment) {
            setContent(comment.content || '(Không có nội dung văn bản)');
            if (comment.image) {
              setMedia([comment.image]);
            }
          } else {
            setContent('(Nội dung không còn tồn tại)');
          }
        }
      } catch (err: any) {
        console.error('Lỗi tải nội dung bị báo cáo:', err);
        setContent(`(Không thể tải nội dung gốc: ${err.message || err})`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [report]);

  const isLongText = content ? content.length > 180 : false;
  const displayText = content 
    ? (isLongText && !isExpanded ? `${content.slice(0, 180)}...` : content)
    : '';

  return (
    <div className="bg-bg-primary p-4 rounded-2xl border border-border-light space-y-3 shadow-sm transition-theme animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-error/10 text-error uppercase">
          {REPORT_REASON_LABELS[report.reason] || 'Báo cáo vi phạm'}
        </span>
        <span className="text-xs text-text-tertiary">
          {formatRelativeTime(report.createdAt)}
        </span>
      </div>

      {report.targetType !== 'user' && (
        <div className="p-3 bg-bg-secondary/20 rounded-xl border border-border-light/40 space-y-2">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
            Nội dung gốc bị báo cáo:
          </p>
          {isLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <>
              {content && (
                <div className="space-y-1">
                  <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                    {displayText}
                  </p>
                  {isLongText && (
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                  )}
                </div>
              )}
              {media && media.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 max-w-xs mt-1.5">
                  {media.map((med, idx) => (
                    <SensitiveMediaGuard
                      key={idx}
                      isSensitive={true}
                      size="xs"
                      className="aspect-video rounded-lg border border-border-light overflow-hidden"
                    >
                      <img
                        src={med.url}
                        alt="Bằng chứng gốc"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => onOpenMedia(media, idx)}
                      />
                    </SensitiveMediaGuard>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {report.description && (
        <div className="bg-bg-secondary/40 p-3 rounded-xl border border-border-light/50">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
            Mô tả lý do từ người báo cáo:
          </p>
          <p className="text-sm text-text-secondary italic">
            "{report.description}"
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-success font-semibold mt-1">
        <CheckCircle2 size={13} className="text-success" />
        <span>Quyết định xử lý: {report.resolution || 'Xác nhận vi phạm'}</span>
      </div>
    </div>
  );
};

/** Component quản lý vi phạm tích lũy và đình chỉ tài khoản */
export const ModerationView: React.FC = () => {
  const { users: userCache, fetchUsers } = useUserCache();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<{ type: 'image' | 'video', url: string, isSensitive?: boolean }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const openMediaViewer = useCallback((mediaList: any[], index: number = 0) => {
    const formatted = mediaList.map(m => ({
      type: m.mimeType?.startsWith('video') ? ('video' as const) : ('image' as const),
      url: m.url,
      isSensitive: m.isSensitive ?? true
    }));
    setViewerMedia(formatted);
    setViewerIndex(index);
    setIsViewerOpen(true);
  }, []);

  useEffect(() => {
    const sevenDaysAgo = Date.now() - VIOLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const qPosts = query(
      collection(db, 'posts'),
      where('status', '==', PostStatus.POLICY_VIOLATION)
    );
    const qComments = query(
      collection(db, 'comments'),
      where('status', '==', CommentStatus.POLICY_VIOLATION)
    );
    const qReports = query(
      collection(db, 'reports'),
      where('status', '==', ReportStatus.RESOLVED)
    );

    let unsubPosts = () => {};
    let unsubComments = () => {};
    let unsubReports = () => {};

    try {
      unsubPosts = onSnapshot(qPosts, (snap) => {
        const fetched = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Post))
          .filter(p => p.createdAt && getSafeMillis(p.createdAt) >= sevenDaysAgo);
        setPosts(fetched);
      }, (err) => {
        console.error('Lỗi lắng nghe posts vi phạm:', err);
      });

      unsubComments = onSnapshot(qComments, (snap) => {
        console.log('[DEBUG] Lấy danh sách bình luận vi phạm:', snap.docs.length);
        const fetched = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Comment))
          .filter(c => c.createdAt && getSafeMillis(c.createdAt) >= sevenDaysAgo);
        console.log('[DEBUG] Bình luận sau lọc:', fetched.length);
        setComments(fetched);
      }, (err) => {
        console.error('Lỗi lắng nghe comments vi phạm:', err);
      });

      unsubReports = onSnapshot(qReports, (snap) => {
        const fetched = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Report))
          .filter(r => r.createdAt && getSafeMillis(r.createdAt) >= sevenDaysAgo && r.resolution !== 'rejected');
        setReports(fetched);
      }, (err) => {
        console.error('Lỗi lắng nghe reports đã xử lý:', err);
      });
    } catch (e) {
      console.error('Lỗi thiết lập onSnapshot:', e);
    }

    const timer = setTimeout(() => setIsLoading(false), 800);

    return () => {
      unsubPosts();
      unsubComments();
      unsubReports();
      clearTimeout(timer);
    };
  }, []);

  const violationSummaries = useMemo((): UserViolationSummary[] => {
    const map = new Map<string, { posts: Post[]; comments: Comment[]; reports: Report[] }>();

    posts.forEach(p => {
      if (!p.authorId) return;
      const exist = map.get(p.authorId) || { posts: [], comments: [], reports: [] };
      exist.posts.push(p);
      map.set(p.authorId, exist);
    });

    comments.forEach(c => {
      if (!c.authorId) return;
      const exist = map.get(c.authorId) || { posts: [], comments: [], reports: [] };
      exist.comments.push(c);
      map.set(c.authorId, exist);
    });

    reports.forEach(r => {
      if (!r.targetOwnerId) return;
      const exist = map.get(r.targetOwnerId) || { posts: [], comments: [], reports: [] };
      exist.reports.push(r);
      map.set(r.targetOwnerId, exist);
    });

    const list: UserViolationSummary[] = [];
    const targetUserIds: string[] = [];

    map.forEach((data, userId) => {
      const cached = userCache[userId];
      if (cached && cached.status === UserStatus.BANNED) {
        return;
      }

      const strikes = data.posts.length + data.comments.length + data.reports.length;
      if (strikes >= BAN_THRESHOLD) {
        list.push({
          userId,
          fullName: cached?.fullName || 'Người dùng',
          avatarUrl: cached?.avatar?.url,
          email: cached?.email || '',
          status: cached?.status || UserStatus.ACTIVE,
          strikes,
          posts: data.posts.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt)),
          comments: data.comments.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt)),
          reports: data.reports.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt)),
        });
        if (!cached) {
          targetUserIds.push(userId);
        }
      }
    });

    if (targetUserIds.length > 0) {
      fetchUsers(targetUserIds);
    }

    return list.sort((a, b) => b.strikes - a.strikes);
  }, [posts, comments, reports, userCache, fetchUsers]);

  const selectedSummary = useMemo(() => {
    if (!selectedUserId) return null;
    return violationSummaries.find(s => s.userId === selectedUserId) || null;
  }, [violationSummaries, selectedUserId]);

  const handleBanUser = useCallback(async () => {
    if (!selectedUserId || !selectedSummary) return;
    setIsProcessing(true);
    try {
      const reason = `Vi phạm tiêu chuẩn cộng đồng tích lũy: ${selectedSummary.strikes} lần vi phạm trong 7 ngày gần đây.`;
      await httpsCallable(functions, 'banUser')({
        userId: selectedUserId,
        action: 'ban',
        reason
      });
      toast.success(`Đã đình chỉ hoạt động tài khoản ${selectedSummary.fullName}`);
      setSelectedUserId(null);
    } catch (err) {
      console.error('Lỗi khóa tài khoản:', err);
      toast.error('Không thể thực hiện hành động đình chỉ tài khoản');
    } finally {
      setIsProcessing(false);
      setIsConfirmOpen(false);
    }
  }, [selectedUserId, selectedSummary]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-bg-primary px-4 md:px-6 py-4 border-b border-border-light flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-base font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert size={18} className="text-primary" />
            Quản lý vi phạm
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            Giám sát và xử lý các tài khoản vi phạm tiêu chuẩn cộng đồng trong 7 ngày gần đây.
          </p>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden bg-bg-secondary/30">
        {/* Left Column: User Watchlist */}
        <div className="w-full md:w-[350px] border-r border-border-light flex flex-col bg-bg-primary flex-shrink-0">
          <div className="p-3 border-b border-border-light bg-bg-secondary/10 flex-shrink-0">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Tài khoản cần xử lý ({violationSummaries.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto scroll-hide">
            {isLoading ? (
              <div className="p-3 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-bg-secondary/20 rounded-xl">
                    <Skeleton variant="circle" width={36} height={36} />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : violationSummaries.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-text-tertiary">Danh sách theo dõi trống</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {violationSummaries.map((summary) => (
                  <button
                    key={summary.userId}
                    onClick={() => setSelectedUserId(summary.userId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left outline-none
                      ${selectedUserId === summary.userId
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'hover:bg-bg-secondary/50 text-text-primary'
                      }`}
                  >
                    <UserAvatar
                      userId={summary.userId}
                      src={summary.avatarUrl}
                      name={summary.fullName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-none mb-1">
                        {summary.fullName}
                      </p>
                      <p className="text-xs text-text-tertiary truncate leading-none">
                        {summary.email}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center justify-center px-2 py-1 rounded-full text-[10px] font-bold bg-error/15 text-error">
                      {summary.strikes} vi phạm
                    </span>
                    <ChevronRight size={14} className="text-text-tertiary shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Evidence Details */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden">
          {selectedSummary ? (
            <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
              {/* Evidence Header */}
              <div className="bg-bg-primary px-6 py-4 border-b border-border-light flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    userId={selectedSummary.userId}
                    src={selectedSummary.avatarUrl}
                    name={selectedSummary.fullName}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-text-primary truncate">
                      {selectedSummary.fullName}
                    </h3>
                    <p className="text-xs text-text-tertiary truncate mt-0.5">
                      {selectedSummary.email} • ID: {selectedSummary.userId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-error/10 text-error border border-error/10">
                    <AlertTriangle size={12} /> Số lần vi phạm: {selectedSummary.strikes}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<ShieldOff size={15} />}
                    onClick={() => setIsConfirmOpen(true)}
                  >
                    Khóa tài khoản
                  </Button>
                </div>
              </div>

              {/* Evidence Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-bg-secondary/15">
                {/* Section 1: AI Flags */}
                {(selectedSummary.posts.length > 0 || selectedSummary.comments.length > 0) && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-primary" />
                      Nội dung bị kiểm duyệt
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Posts */}
                      {selectedSummary.posts.map(post => (
                        <div key={post.id} className="bg-bg-primary p-4 rounded-2xl border border-border-light space-y-3 shadow-sm transition-theme">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                              <FileText size={10} /> Bài viết — Phát hiện: {getAIModerationLabel(post.moderationReason)}
                            </span>
                            <span className="text-xs text-text-tertiary">
                              {formatRelativeTime(post.createdAt)}
                            </span>
                          </div>

                          {post.media && post.media.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 max-w-md">
                              {post.media.map((med, idx) => (
                                <SensitiveMediaGuard
                                  key={idx}
                                  isSensitive={true}
                                  size="sm"
                                  className="aspect-video rounded-xl border border-border-light overflow-hidden"
                                >
                                  <img
                                    src={med.url}
                                    alt="Bằng chứng"
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => openMediaViewer(post.media, idx)}
                                  />
                                </SensitiveMediaGuard>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Comments */}
                      {selectedSummary.comments.map(comment => (
                        <div key={comment.id} className="bg-bg-primary p-4 rounded-2xl border border-border-light space-y-3 shadow-sm transition-theme">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning uppercase">
                              <MessageSquare size={10} /> Bình luận — Phát hiện: {getAIModerationLabel(comment.moderationReason)}
                            </span>
                            <span className="text-xs text-text-tertiary">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>

                          {comment.image && (
                            <div className="max-w-[200px]">
                              <SensitiveMediaGuard
                                isSensitive={true}
                                size="sm"
                                className="aspect-video rounded-xl border border-border-light overflow-hidden"
                              >
                                <img
                                  src={comment.image.url}
                                  alt="Bằng chứng bình luận"
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => openMediaViewer([comment.image])}
                                />
                              </SensitiveMediaGuard>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Reports */}
                {selectedSummary.reports.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 pt-2">
                      <AlertTriangle size={14} className="text-error" />
                      Lịch sử bị cộng đồng báo cáo (Đã xử lý)
                    </h4>
                    
                    <div className="space-y-3">
                      {selectedSummary.reports.map(report => (
                        <ReportEvidenceCard key={report.id} report={report} onOpenMedia={openMediaViewer} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-bg-secondary/10">
              {violationSummaries.length === 0 ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="Không có vi phạm"
                  description="Không phát hiện tài khoản vi phạm chính sách cộng đồng."
                  variant="boxed"
                />
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Chưa chọn tài khoản"
                  description="Chọn một tài khoản từ danh sách bên trái để xem chi tiết vi phạm."
                  variant="boxed"
                />
              )}
            </div>
          )}
        </div>

        {/* Mobile Evidence Sheet */}
        {selectedSummary && (
          <div className="md:hidden fixed inset-0 z-40 bg-bg-primary flex flex-col animate-slide-in-right">
            <div className="px-4 py-3 border-b border-border-light flex items-center justify-between flex-shrink-0 bg-bg-primary">
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-sm font-semibold text-text-secondary hover:text-text-primary px-2 py-1.5 rounded-lg hover:bg-bg-secondary"
              >
                Quay lại
              </button>
              <h3 className="text-sm font-bold text-text-primary">
                Chi tiết bằng chứng
              </h3>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
              >
                Khóa
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-bg-secondary/10">
              <div className="bg-bg-primary p-4 rounded-2xl border border-border-light flex items-center gap-3">
                <UserAvatar
                  userId={selectedSummary.userId}
                  src={selectedSummary.avatarUrl}
                  name={selectedSummary.fullName}
                  size="md"
                />
                <div>
                  <h4 className="font-bold text-text-primary">{selectedSummary.fullName}</h4>
                  <p className="text-xs text-text-tertiary">{selectedSummary.email}</p>
                </div>
              </div>

              {/* AI Flags */}
              {(selectedSummary.posts.length > 0 || selectedSummary.comments.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">AI gắn cờ</h4>
                  {selectedSummary.posts.map(post => (
                    <div key={post.id} className="bg-bg-primary p-3 rounded-xl border border-border-light space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-error uppercase">
                          Bài viết — {getAIModerationLabel(post.moderationReason)}
                        </span>
                        <p className="text-[10px] text-text-tertiary">{formatRelativeTime(post.createdAt)}</p>
                      </div>
                      {post.media && post.media.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 max-w-xs mt-1">
                          {post.media.map((med, idx) => (
                            <SensitiveMediaGuard
                              key={idx}
                              isSensitive={true}
                              size="sm"
                              className="aspect-video rounded-lg border border-border-light overflow-hidden"
                            >
                              <img
                                src={med.url}
                                alt="Bằng chứng"
                                className="w-full h-full object-cover"
                              />
                            </SensitiveMediaGuard>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {selectedSummary.comments.map(comment => (
                    <div key={comment.id} className="bg-bg-primary p-3 rounded-xl border border-border-light space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-warning uppercase">
                          Bình luận — {getAIModerationLabel(comment.moderationReason)}
                        </span>
                        <p className="text-[10px] text-text-tertiary">{formatRelativeTime(comment.createdAt)}</p>
                      </div>
                      {comment.image && (
                        <div className="max-w-[150px] mt-1">
                          <SensitiveMediaGuard
                            isSensitive={true}
                            size="sm"
                            className="aspect-video rounded-lg border border-border-light overflow-hidden"
                          >
                            <img
                              src={comment.image.url}
                              alt="Bằng chứng bình luận"
                              className="w-full h-full object-cover"
                            />
                          </SensitiveMediaGuard>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Community Reports */}
              {selectedSummary.reports.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Báo cáo đã resolved</h4>
                  {selectedSummary.reports.map(report => (
                    <ReportEvidenceCard key={report.id} report={report} onOpenMedia={openMediaViewer} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleBanUser}
        title="Xác nhận khóa tài khoản"
        message={selectedSummary ? `Tài khoản ${selectedSummary.fullName} sẽ bị đình chỉ hoạt động vĩnh viễn trên hệ thống.` : ''}
        confirmLabel="Đình chỉ"
        cancelLabel="Hủy"
        variant="danger"
      />

      {isViewerOpen && (
        <MediaViewer
          media={viewerMedia}
          initialIndex={viewerIndex}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
};
