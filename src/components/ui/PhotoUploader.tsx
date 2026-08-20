'use client';

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { uploadFotoAvaria } from '@/lib/utils/image-uploader';
import { toast } from 'sonner';

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ photos, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [...photos];
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error('Selecione apenas arquivos de imagem.');
          continue;
        }
        const uploadedUrl = await uploadFotoAvaria(file);
        newPhotos.push(uploadedUrl);
      }

      onChange(newPhotos);
      toast.success(`${files.length} foto(s) processada(s) e anexada(s)!`);
    } catch (err) {
      toast.error('Erro ao processar imagem.');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Fotos das Avarias & Condição Física de Entrada
        </label>
        <span className="text-[10px] text-slate-500 font-mono">
          {photos.length} foto(s) anexada(s)
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Upload Trigger Card */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-28 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0071e3] bg-slate-50 hover:bg-white flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-[#0071e3] transition-all group disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover:bg-[#0071e3]/10 flex items-center justify-center transition-colors">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#0071e3]" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </div>
          <span className="text-xs font-bold">
            {uploading ? 'Otimizando...' : 'Tirar ou Enviar Foto'}
          </span>
          <span className="text-[9px] text-slate-400">Câmera ou Galeria</span>
        </button>

        {/* Thumbnail Previews */}
        {photos.map((photoUrl, idx) => (
          <div
            key={idx}
            className="h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative group"
          >
            <img
              src={photoUrl}
              alt={`Avaria ${idx + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={() => handleRemovePhoto(idx)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
              title="Remover foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-center">
              <span className="text-[9px] text-white font-mono">Foto #{idx + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
