/**
 * Storage Utilities for Firebase Storage
 * Handles uploading and managing files in Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload a shop product image (admin-only path, publicly readable)
 * Path: shop-products/{timestamp}_{random}.{ext}
 */
export async function uploadShopProductImage(file) {
  if (!file) throw new Error('No file provided');
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image must be smaller than 10MB');

  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  const ext = file.name.split('.').pop();
  const fileName = `${timestamp}_${randomString}.${ext}`;
  const storagePath = `shop-products/${fileName}`;

  console.log(`📤 Uploading shop product image: ${storagePath}`);
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  console.log(`✅ Shop product image uploaded: ${url}`);
  return { url, path: storagePath, fileName, fileSize: file.size };
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

