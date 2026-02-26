const AVATAR_GRADIENTS = [
  ['#FF6B6B', '#FF8E53'],
  ['#4E54C8', '#8F94FB'],
  ['#11998E', '#38EF7D'],
  ['#FC466B', '#3F5EFB'],
  ['#F2994A', '#F2C94C'],
  ['#56CCF2', '#2F80ED'],
  ['#B122E5', '#FF63DE'],
  ['#00B09B', '#96C93D'],
  ['#642B73', '#C6426E']
] as const;

// Lấy chữ cái đầu (tối đa 2)
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Tạo màu gradient từ seed
export const getAvatarGradient = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = AVATAR_GRADIENTS;
  const index = Math.abs(hash) % gradients.length;
  const [c1, c2] = gradients[index];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
};


interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

// Nén ảnh, bỏ qua nếu đã nhỏ hơn limit
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const { maxSizeMB = 1, maxWidthOrHeight = 1920, quality = 0.8 } = options;

  // Bỏ qua nếu đã đủ nhỏ
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
        const ratio = Math.min(maxWidthOrHeight / width, maxWidthOrHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Lỗi load ảnh'));
    };
    img.src = objectUrl;
  });
};


// Kiểm tra file ảnh
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      'image/jpeg',
      0.95
    );
  });
}

// Capture frame tại giây đầu làm thumbnail
export const extractVideoThumbnail = (
  file: File,
  maxSize = 1280,
  seekTime = 1,
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(seekTime, video.duration * 0.1);
    };

    video.onseeked = () => {
      URL.revokeObjectURL(objectUrl);

      const ratio = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
      canvas.width = Math.round(video.videoWidth * ratio);
      canvas.height = Math.round(video.videoHeight * ratio);

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const thumbName = file.name.replace(/\.[^/.]+$/, '_thumb.jpg');
            resolve(new File([blob], thumbName, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            reject(new Error('Không tạo được thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không load được video'));
    };
  });
};
