# 🖼️ Logo Upload Instructions for Email Templates

## Easiest Method: Use Free Image Hosting

### Option 1: Imgur (Recommended - Easiest)
1. Go to https://imgur.com/upload
2. Upload your logo: `public/tpp_logo.png`
3. After upload, right-click the image → "Copy image address"
4. You'll get a URL like: `https://i.imgur.com/XXXXX.png`
5. Update the LOGO_URL in `functions/emailService.js` and `functions/emailTemplates.js`
6. Also update in `src/components/admin/EmailTemplateManager.jsx`

### Option 2: Firebase Storage (If you have it set up)
1. Upload logo to Firebase Storage
2. Get the public download URL
3. Update LOGO_URL in the same files

### Option 3: Cloudinary (Free tier available)
1. Sign up at https://cloudinary.com
2. Upload logo
3. Get the URL and update

## Quick Test
After updating the URL:
1. Send a test email using the admin panel
2. Check if logo appears in Gmail
3. If it does, you're done! ✅

