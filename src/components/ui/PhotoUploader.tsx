'use client';

import React, { useRef } from 'react';
import { Camera, ImagePlus, X, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ photos, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [...photos];
    let processed = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Selecione apenas arquivos de imagem.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          newPhotos.push(result);
        }
        processed++;
        if (processed === files.length) {
          onChange(newPhotos);
          toast.success(`${files.length} foto(s) anexada(s) com sucesso!`);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
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
          onClick={() => fileInputRef.current?.click()}
          className="h-28 rounded-2xl border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-900/60 hover:bg-slate-900 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-sky-400 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-sky-500/20 flex items-center justify-center transition-colors">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold">Tirar ou Enviar Foto</span>
          <span className="text-[9px] text-slate-500">Câmera ou Galeria</span>
        </button>

        {/* Thumbnail Previews */}
        {photos.map((photoUrl, idx) => (
          <div
            key={idx}
            className="h-28 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative group"
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
              <span className="text-[9px] text-slate-300 font-mono">Foto #{idx + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
