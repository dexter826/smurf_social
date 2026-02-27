import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { db } from '../app';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static');

const execFileAsync = promisify(execFile);

// Storage trigger: tự động tạo thumbnail khi video được upload
export const generateVideoThumbnail = onObjectFinalized(
  { region: 'us-central1' },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Chỉ xử lý video trong thư mục posts/
    if (!contentType?.startsWith('video/')) return;
    if (!filePath?.startsWith('posts/')) return;

    const bucket = getStorage().bucket(event.data.bucket);
    const fileName = path.basename(filePath);
    const baseName = path.basename(fileName, path.extname(fileName));
    const thumbFileName = `${baseName}.jpg`;
    const tmpVideoPath = path.join(os.tmpdir(), fileName);
    const tmpThumbPath = path.join(os.tmpdir(), thumbFileName);

    try {
      // Download video về /tmp
      await bucket.file(filePath).download({ destination: tmpVideoPath });

      // Extract frame tại giây đầu tiên
      await execFileAsync(ffmpegPath, [
        '-i', tmpVideoPath,
        '-ss', '00:00:01.000',
        '-vframes', '1',
        '-vf', 'scale=1280:-1',
        '-q:v', '2',
        tmpThumbPath,
      ]);

      // Upload thumbnail lên Storage
      const userId = filePath.split('/')[1]; // posts/userId/...
      const thumbStoragePath = `thumbnails/posts/${userId}/${thumbFileName}`;
      await bucket.upload(tmpThumbPath, {
        destination: thumbStoragePath,
        metadata: { contentType: 'image/jpeg' },
      });

      // Lấy signedUrl làm download URL
      const thumbFile = bucket.file(thumbStoragePath);
      const [thumbUrl] = await thumbFile.getSignedUrl({
        action: 'read',
        expires: '03-01-2035',
      });

      // Tìm post chứa video này và cập nhật videoThumbnails
      const videoDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${event.data.bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
      const postsSnap = await db
        .collection('posts')
        .where('videos', 'array-contains', videoDownloadUrl)
        .limit(1)
        .get();

      if (!postsSnap.empty) {
        await postsSnap.docs[0].ref.update({
          [`videoThumbnails.${videoDownloadUrl}`]: thumbUrl,
        });
      }
    } catch (error) {
      console.error('[generateVideoThumbnail] Lỗi:', error);
    } finally {
      if (fs.existsSync(tmpVideoPath)) fs.unlinkSync(tmpVideoPath);
      if (fs.existsSync(tmpThumbPath)) fs.unlinkSync(tmpThumbPath);
    }
  }
);
