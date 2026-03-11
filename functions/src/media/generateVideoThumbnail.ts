import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { db } from '../app';

const ffmpegPath: string = require('ffmpeg-static');

const execFileAsync = promisify(execFile);

export const generateVideoThumbnail = onObjectFinalized(
  { region: 'us-central1' },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    if (!contentType?.startsWith('video/')) return;
    if (!filePath?.startsWith('posts/')) return;

    const bucket = getStorage().bucket(event.data.bucket);
    const fileName = path.basename(filePath);
    const baseName = path.basename(fileName, path.extname(fileName));
    const thumbFileName = `${baseName}.jpg`;
    const tmpVideoPath = path.join(os.tmpdir(), fileName);
    const tmpThumbPath = path.join(os.tmpdir(), thumbFileName);

    try {
      await bucket.file(filePath).download({ destination: tmpVideoPath });

      await execFileAsync(ffmpegPath, [
        '-i', tmpVideoPath,
        '-ss', '00:00:01.000',
        '-vframes', '1',
        '-vf', 'scale=1280:-1',
        '-q:v', '2',
        tmpThumbPath,
      ]);

      const userId = filePath.split('/')[1];
      const thumbStoragePath = `thumbnails/posts/${userId}/${thumbFileName}`;
      await bucket.upload(tmpThumbPath, {
        destination: thumbStoragePath,
        metadata: { contentType: 'image/jpeg' },
      });

      const thumbFile = bucket.file(thumbStoragePath);
      const [thumbUrl] = await thumbFile.getSignedUrl({
        action: 'read',
        expires: '03-01-2035',
      });

      const videoDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${event.data.bucket}/o/${encodeURIComponent(filePath)}?alt=media`;

      const postsSnap = await db
        .collection('posts')
        .where('status', '==', 'active')
        .get();

      for (const doc of postsSnap.docs) {
        const post = doc.data();
        const media = post.media || [];

        let updated = false;
        const updatedMedia = media.map((item: any) => {
          if (item.url === videoDownloadUrl && item.mimeType?.startsWith('video/')) {
            updated = true;
            return { ...item, thumbnailUrl: thumbUrl };
          }
          return item;
        });

        if (updated) {
          await doc.ref.update({ media: updatedMedia });
          break;
        }
      }
    } catch (error) {
      console.error('[generateVideoThumbnail] Lỗi:', error);
    } finally {
      if (fs.existsSync(tmpVideoPath)) fs.unlinkSync(tmpVideoPath);
      if (fs.existsSync(tmpThumbPath)) fs.unlinkSync(tmpThumbPath);
    }
  }
);
