/**
 * Storage Utilities for Firebase Storage
 * Handles uploading and managing files in Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Converts a product name + slot index into a clean SEO-friendly filename.
 * e.g. "Pastel PEP Planner 7x10" + slot 0 → "pastel-pep-planner-7x10-1"
 */
function buildSeoFilename(productName, slotIndex, ext) {
  const slug = (productName || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip special chars
    .trim()
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse double hyphens
    .substring(0, 60);               // keep URLs manageable
  const suffix = Date.now().toString(36); // uniqueness without exposing slot index on its own
  return `${slug}-${slotIndex + 1}-${suffix}.${ext}`;
}

/**
 * Upload a shop product image (admin-only path, publicly readable).
 * Auto-generates an SEO-friendly filename from the product name.
 * Returns { url, path, fileName, fileSize, alt }
 */
export async function uploadShopProductImage(file, productName = '', slotIndex = 0) {
  if (!file) throw new Error('No file provided');
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = buildSeoFilename(productName, slotIndex, ext);
  const storagePath = `shop-products/${fileName}`;

  // Alt text: "Product Name - image 1", "Product Name - image 2", etc.
  const alt = productName
    ? `${productName}${slotIndex === 0 ? '' : ` - image ${slotIndex + 1}`}`
    : 'Product image';

  console.log(`📤 Uploading shop product image: ${storagePath}`);
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  console.log(`✅ Shop product image uploaded: ${url}`);
  return { url, path: storagePath, fileName, fileSize: file.size, alt };
}

/**
 * Upload a digital product PDF (admin-only). Stored privately; customers get signed URLs via Cloud Functions.
 */
export async function uploadShopDigitalFile(file, productId, productName = '') {
  if (!file) throw new Error('No file provided');
  if (file.type !== 'application/pdf') throw new Error('File must be a PDF');

  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error('PDF must be smaller than 50MB');

  const slug = (productName || 'planner')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
  const fileName = `${slug}-${Date.now().toString(36)}.pdf`;
  const folder = productId || 'draft';
  const storagePath = `shop-digital/${folder}/${fileName}`;

  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
  return {
    path: storagePath,
    fileName: file.name || fileName,
    fileSize: snapshot.metadata?.size || file.size,
  };
}

/** Public shop inquiry cover / inspiration uploads (no auth required). */
/** Customer review photo (admin upload) */
export async function uploadShopReviewPhoto(file, reviewId = 'draft') {
  if (!file) throw new Error('No file provided');
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');

  const MAX_SIZE = 8 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error('Image must be smaller than 8MB');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const safeId = (reviewId || 'draft').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  const fileName = `${safeId}_${Date.now().toString(36)}.${ext}`;
  const storagePath = `shop-reviews/${fileName}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
  let url;
  try {
    url = await getDownloadURL(snapshot.ref);
  } catch {
    url = await getDownloadURL(snapshot.ref);
  }
  return { url, storagePath };
}

export async function uploadInquiryImage(file) {
  if (!file) throw new Error('No file provided');
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error('Image must be smaller than 10MB');

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const storagePath = `inquiry-uploads/${fileName}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
  let url;
  try {
    url = await getDownloadURL(snapshot.ref);
  } catch {
    // Anonymous shop forms may lack read permission; path is enough for admin
    url = null;
  }
  return { url, path: storagePath, fileName: file.name, fileSize: file.size };
}

/**
 * Upload an image to Firebase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's ID
 * @param {string} context - The context (e.g., 'stockpile', 'orders')
 * @returns {Promise<{url: string, path: string, fileName: string, fileSize: number}>}
 */
export async function uploadImageToStorage(file, userId, context = 'stockpile') {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Image must be smaller than 5MB');
  }

  try {
    // Create a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    // Create storage path: context/{userId}/{fileName}
    const storagePath = `${context}-docs/${userId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload the file
    console.log(`📤 Uploading image to Firebase Storage: ${storagePath}`);
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`✅ Image uploaded successfully: ${downloadURL}`);

    return {
      url: downloadURL,
      path: storagePath,
      fileName: file.name,
      fileSize: file.size
    };
  } catch (error) {
    console.error('❌ Error uploading image to Firebase Storage:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Delete an image from Firebase Storage
 * @param {string} storagePath - The storage path of the file to delete
 * @returns {Promise<void>}
 */
export async function deleteImageFromStorage(storagePath) {
  if (!storagePath) {
    console.warn('⚠️ No storage path provided for deletion');
    return;
  }

  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log(`🗑️ Successfully deleted image: ${storagePath}`);
  } catch (error) {
    // If file doesn't exist, that's okay
    if (error.code === 'storage/object-not-found') {
      console.log(`ℹ️ File already deleted or doesn't exist: ${storagePath}`);
    } else {
      console.error('❌ Error deleting image from Firebase Storage:', error);
      throw error;
    }
  }
}

/**
 * Compress an image file before uploading (optional optimization)
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default 1920)
 * @param {number} quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<File>}
 */
export async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log(`🗜️ Compressed image from ${(file.size / 1024).toFixed(0)}KB to ${(compressedFile.size / 1024).toFixed(0)}KB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

