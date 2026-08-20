import { createClient } from '@/lib/supabase/client';

/**
 * Compress an image file on client side before upload/save
 * Reduz imagens de 5MB-10MB da câmera para 100KB-200KB mantendo ótima qualidade
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Upload image to Supabase Storage bucket 'os-fotos' or return compressed data URL
 */
export async function uploadFotoAvaria(file: File): Promise<string> {
  // 1. Compress image first
  const compressedDataUrl = await compressImage(file);

  const supabase = createClient();
  if (!supabase) {
    return compressedDataUrl;
  }

  try {
    // Convert compressed DataURL back to Blob for storage upload
    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();

    const fileExt = 'jpg';
    const fileName = `avaria-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `os-entrada/${fileName}`;

    const { data, error } = await supabase.storage
      .from('os-fotos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error || !data) {
      console.warn('Storage upload warning, fallback to compressed DataURL:', error);
      return compressedDataUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from('os-fotos')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl || compressedDataUrl;
  } catch (e) {
    console.error('Error uploading photo to Supabase storage:', e);
    return compressedDataUrl;
  }
}
