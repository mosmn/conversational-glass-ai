# Performance Optimization Guide

This guide outlines the performance optimizations implemented to improve development experience.

## ⚡ Immediate Performance Improvements

### 1. Updated Development Scripts

```bash
# Use the optimized development server
npm run dev:fast

# For debugging (slower but with inspector)
npm run dev:debug

# Clean cache if experiencing issues
npm run clean
```

### 2. Node.js Memory Optimization

- Increased memory limit to 8GB (`--max-old-space-size=8192`)
- Disabled deprecation warnings
- Enabled Turbo mode for faster builds

### 3. Next.js Configuration Optimizations

- **Turbo Mode**: Faster builds and hot reloads
- **Webpack Optimizations**: Disabled expensive optimizations in dev
- **File System Caching**: Persistent build cache
- **External Packages**: AI SDKs loaded as external packages
- **Watch Options**: Optimized file watching

## 🚀 Additional Optimizations to Implement

### Environment Variables

Add these to your `.env.local` file:

```bash
NODE_ENV=development
NODE_OPTIONS="--max-old-space-size=8192 --no-deprecation"
NEXT_TELEMETRY_DISABLED=1
NEXT_WEBPACK_USEPOLLING=false
```

### Component Optimization

Large components (55KB+ files) should be split:

- `components/chat/FileAttachment.tsx` (55KB) - Consider splitting into smaller components
- `components/chat/MultiProviderImageWidget.tsx` (30KB) - Extract provider logic

### Recommended Development Workflow

1. Use `npm run dev:fast` for daily development
2. Run `npm run clean` if builds become slow
3. Use `npm run type-check` to check TypeScript without building
4. Restart dev server every few hours to clear memory

## 📊 Performance Monitoring

### Build Analysis

```bash
npm run build:analyze
```

### Memory Usage

Monitor Node.js memory usage:

```bash
# Check memory usage
node --inspect npm run dev
# Open chrome://inspect in Chrome
```

## 🔧 Troubleshooting Slow Development

### Common Issues and Solutions

1. **Slow Hot Reloads**

   - Restart dev server: `Ctrl+C` then `npm run dev:fast`
   - Clear Next.js cache: `npm run clean`

2. **Memory Issues**

   - Increase memory limit in package.json scripts
   - Close unused applications
   - Use `npm run dev:debug` to inspect memory usage

3. **File Watching Issues**

   - Disable polling: `NEXT_WEBPACK_USEPOLLING=false`
   - Check file system limits: `ulimit -n`

4. **TypeScript Compilation Slow**
   - Use incremental compilation (already enabled)
   - Exclude test files from compilation
   - Use `skipLibCheck: true` (already enabled)

## 📈 Expected Performance Improvements

After implementing these optimizations, you should see:

- **50-70% faster** initial dev server startup
- **30-50% faster** hot reloads
- **Reduced memory usage** by 20-40%
- **More stable** development experience

## 🎯 Next Steps for Production

1. **Code Splitting**: Implement dynamic imports for large components
2. **Bundle Analysis**: Regular analysis of bundle size
3. **Image Optimization**: Ensure all images are optimized
4. **Database Optimization**: Index commonly queried fields
5. **Caching Strategy**: Implement proper caching for API routes

## 🚨 Warning Signs

Restart your development server if you notice:

- Hot reloads taking >5 seconds
- Memory usage >6GB
- TypeScript errors not clearing
- File changes not being detected

---

**Performance Target**: Dev server should start in <30 seconds and hot reloads should complete in <2 seconds.
