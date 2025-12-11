
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/canvasUtils';
import { X, Check, ZoomIn } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  aspect?: number; // e.g., 16/9
  onCancel: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, aspect = 16 / 9, onCancel, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
      try {
          setIsProcessing(true);
          const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
          onCropComplete(croppedImage);
      } catch (e) {
          console.error(e);
          alert("Failed to crop image.");
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[80vh] md:h-[600px]">
        
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900 z-10">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <ZoomIn className="text-brazil-green"/> Crop Image
            </h3>
            <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={onZoomChange}
            classes={{
                containerClassName: "bg-black",
                mediaClassName: "",
                cropAreaClassName: "border-2 border-brazil-green shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
            }}
          />
        </div>

        <div className="p-6 bg-slate-900 border-t border-white/5 space-y-4 z-10">
           <div className="flex items-center gap-4">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom</span>
               <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-brazil-green h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
           </div>

           <div className="flex gap-3">
               <button 
                onClick={onCancel}
                className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
               >
                   Cancel
               </button>
               <button 
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-1 bg-brazil-green hover:bg-green-600 text-white py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
               >
                   {isProcessing ? 'Processing...' : <><Check size={18}/> Crop & Save</>}
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};
