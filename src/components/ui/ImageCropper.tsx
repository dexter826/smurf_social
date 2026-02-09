import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Modal, Button } from './index';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getCroppedImg } from '../../utils/imageUtils';

interface ImageCropperProps {
  isOpen: boolean;
  image: string;
  aspect?: number;
  title?: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  isOpen,
  image,
  aspect = 1,
  title = 'Cắt ảnh',
  onCropComplete,
  onCancel
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels, rotation);
      const croppedFile = new File([croppedBlob], `cropped_${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
      onCropComplete(croppedFile);
    } catch (error) {
      console.error('Lỗi crop ảnh:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="lg"
      padding="none"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw size={16} />}
          >
            Đặt lại
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              isLoading={isProcessing}
            >
              Áp dụng
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col">
        {/* Crop Area */}
        <div className="relative w-full h-[300px] md:h-[400px] bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
            classes={{
              containerClassName: 'rounded-none',
              cropAreaClassName: 'border-2 border-white shadow-lg'
            }}
          />
        </div>

        {/* Zoom Controls */}
        <div className="px-4 py-4 bg-bg-secondary border-t border-border-light">
          <div className="flex items-center gap-4">
            <ZoomOut size={18} className="text-text-tertiary flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 bg-bg-third rounded-full appearance-none cursor-pointer accent-primary"
            />
            <ZoomIn size={18} className="text-text-tertiary flex-shrink-0" />
          </div>
        </div>
      </div>
    </Modal>
  );
};
