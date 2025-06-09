# Attachment Support Setup Guide

This guide covers setting up the enhanced attachment support system for the Conversational Glass AI application.

## 🔧 **IBM Cloud Object Storage Setup**

### Prerequisites

1. IBM Cloud account
2. Cloud Object Storage service instance
3. A bucket for file storage

### Configuration Steps

1. **Create IBM COS Service Instance:**

   - Go to IBM Cloud catalog
   - Search for "Object Storage"
   - Create a new service instance

2. **Create a Bucket:**

   - Navigate to your COS instance
   - Create a new bucket
   - Choose appropriate settings (Standard tier recommended)
   - Note the bucket name

3. **Get Service Credentials:**

   - In your COS instance, go to "Service credentials"
   - Create new credentials with "Writer" role
   - Note down the following values:
     - `apikey` (this becomes `IBM_COS_API_KEY_ID`)
     - `resource_instance_id` (this becomes `IBM_COS_INSTANCE_CRN`)
     - Find the appropriate endpoint URL for your region

4. **Set Environment Variables:**
   ```bash
   # Add these to your .env.local file:
   IBM_COS_ENDPOINT="https://s3.us-south.cloud-object-storage.appdomain.cloud"
   IBM_COS_API_KEY_ID="your_api_key_here"
   IBM_COS_INSTANCE_CRN="crn:v1:bluemix:public:cloud-object-storage:global:a/..."
   IBM_COS_BUCKET_NAME="your_bucket_name_here"
   ```

## 📁 **File Support Features**

### Supported File Types

- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF files
- **Text**: Plain text, Markdown, CSV, JSON

### File Processing Capabilities

- **Images**: Automatic thumbnail generation, metadata extraction
- **PDFs**: Text extraction, page count, content analysis
- **Text Files**: Content extraction, word count

### File Size Limits

- Maximum file size: 10MB per file
- Maximum files per message: 5 files
- Total conversation storage: Configurable per user

## 🎮 **Usage Instructions**

### For Users

1. **Upload Files:**

   - Click the paperclip icon in the chat input
   - Drag and drop files or click to browse
   - Wait for upload and processing to complete

2. **Preview Files:**

   - Click the eye icon on any uploaded file
   - Navigate between multiple files using arrow keys
   - Zoom, rotate, and search within files

3. **AI Integration:**
   - AI can analyze images and describe content
   - AI can read and summarize PDF documents
   - AI can process and analyze text files

### For Developers

1. **File Storage API:**

   ```typescript
   // Upload a file
   const response = await fetch("/api/files/upload", {
     method: "POST",
     body: formData,
   });

   // Get file URL
   const fileUrl = await fetch(`/api/files/${fileId}?path=${filePath}`);
   ```

2. **Attachment in Messages:**
   ```typescript
   // Send message with attachments
   await sendMessage("Analyze this image", "gpt-4", [
     {
       id: "file-id",
       name: "image.jpg",
       type: "image/jpeg",
       url: "file-url",
       extractedText: "...",
       metadata: { width: 1920, height: 1080 },
     },
   ]);
   ```

## 🔐 **Security Features**

### File Validation

- MIME type verification
- File size limits
- Filename sanitization
- Malicious file detection

### Access Control

- User-scoped file access
- Conversation-scoped attachments
- Signed URLs for secure access
- Automatic file cleanup

### Storage Security

- Private bucket configuration
- Encrypted file storage
- Secure file serving
- Access logging

## 🚀 **Development Mode (Local Storage)**

When IBM COS credentials are not configured, the system automatically falls back to local storage:

- Files stored in `public/uploads/`
- Directory structure: `uploads/{userId}/{conversationId}/`
- Direct file serving through Next.js public folder
- Suitable for development and testing

## 📊 **Performance Optimizations**

### File Processing

- Asynchronous thumbnail generation
- Background text extraction
- Optimized image compression
- Smart context window management

### Caching

- File metadata caching
- Thumbnail caching
- Extracted text caching
- CDN-ready file serving

### Error Handling

- Graceful upload failures
- Partial file processing
- Retry mechanisms
- User-friendly error messages

## 🛠 **Troubleshooting**

### Common Issues

#### 1. **Upload failures:**

- Check file size limits (max 10MB per file)
- Verify supported file types (images, PDFs, text files)
- Check network connectivity

#### 2. **IBM COS Access Denied Error:**

```
IBM COS upload error: AccessDenied: Access Denied
```

**Solutions:**

- Verify your API key has **Writer** or **Manager** permissions
- Check if your bucket exists and is in the correct region
- Ensure the API key is associated with the correct service instance
- Verify the `IBM_COS_INSTANCE_CRN` matches your COS service instance
- Make sure the bucket has proper IAM policies configured
- **Note:** System will automatically fallback to local storage if IBM COS fails

#### 3. **IBM COS configuration errors:**

- **Invalid API Key:** Check `IBM_COS_API_KEY_ID` is correct and has proper permissions
- **Wrong Endpoint:** Verify `IBM_COS_ENDPOINT` matches your bucket's region
- **Bucket Not Found:** Confirm `IBM_COS_BUCKET_NAME` exists and is accessible
- **CRN Issues:** Ensure `IBM_COS_INSTANCE_CRN` is the full service instance CRN
- **Authentication Failed:** Double-check all credentials are copied correctly

#### 4. **Preview issues:**

- Ensure file processing completed successfully
- Check browser compatibility for file types
- Verify file accessibility and URL generation

### IBM COS Permission Checklist

If you're getting **Access Denied** errors, verify the following:

1. **API Key Permissions:**

   ```bash
   # Your API key should have at least these permissions:
   - Object Writer (to upload files)
   - Object Reader (to download files)
   - Bucket Viewer (to list bucket contents)
   ```

2. **Bucket IAM Policies:**

   - Go to your IBM COS instance → Access policies
   - Ensure your API key has access to the specific bucket
   - Verify bucket is not restricted by IP address

3. **Service Instance Access:**

   - Confirm the API key belongs to the same account as the COS instance
   - Check if the service instance CRN is correct

4. **Test Your Credentials:**
   ```bash
   # You can test your credentials using IBM Cloud CLI:
   ibmcloud cos config list
   ibmcloud cos buckets --json
   ```

### Debug Mode

Set `DEBUG=1` in environment to enable detailed logging:

```bash
DEBUG=1 npm run dev
```

**Log messages to watch for:**

- `IBM COS configuration detected` - Configuration loaded successfully
- `IBM COS upload failed, falling back to local storage` - Automatic fallback working
- `Local storage fallback successful` - Files saved locally instead

## 🔄 **Migration from Local to IBM COS**

To migrate existing local files to IBM COS:

1. Set up IBM COS credentials
2. Restart the application
3. New uploads will use IBM COS
4. Existing local files remain accessible
5. Optional: Use migration script to transfer old files

## 📈 **Monitoring & Analytics**

### Key Metrics

- File upload success rate
- Processing time per file type
- Storage usage per user
- AI processing accuracy

### Health Checks

- Storage connectivity
- File processing pipelines
- Thumbnail generation
- Text extraction services

---

**Need help?** Check the troubleshooting section or create an issue in the repository.
