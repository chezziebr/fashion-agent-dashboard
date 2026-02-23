# Memory Issue Fix & Troubleshooting

## What Happened

The Next.js dev server was consuming excessive memory (2.2GB real + 481GB virtual), causing it to crash with `ERR_CONNECTION_REFUSED`.

**This is NOT normal** for a Next.js app. It was likely caused by:
1. Framer Motion creating many animation instances
2. Image preview URLs not being cleaned up (memory leak)
3. Hot reload with development mode
4. No memory limits on Node.js process

## What Was Fixed

### 1. ✅ Added Memory Cleanup in BulkUpload Component
**File**: `src/components/product/BulkUpload.tsx`

Added cleanup function to revoke preview URLs when component unmounts:

```typescript
useEffect(() => {
  return () => {
    imageFiles.forEach(fileData => {
      URL.revokeObjectURL(fileData.preview);
    });
  };
}, [imageFiles]);
```

This prevents memory leaks from blob URLs.

### 2. ✅ Updated Next.js Config
**File**: `next.config.js`

Added webpack optimizations to reduce memory usage in development:

```javascript
webpack: (config, { dev, isServer }) => {
  if (dev && !isServer) {
    config.optimization.removeAvailableModules = false;
    config.optimization.removeEmptyChunks = false;
    config.optimization.splitChunks = false;
  }
  return config;
}
```

Also optimized package imports for `lucide-react` and `framer-motion`.

### 3. ✅ Added Memory Limits to Dev Script
**File**: `package.json`

```json
"scripts": {
  "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev",
  "dev:safe": "NODE_OPTIONS='--max-old-space-size=2048' next dev"
}
```

- `npm run dev` - Limits to 4GB (recommended)
- `npm run dev:safe` - Limits to 2GB (for lower-memory machines)

### 4. ✅ Server Restarted
The dev server is now running at http://localhost:3000 with memory limits applied.

## How to Restart After a Crash

If the server crashes again:

```bash
# 1. Kill old processes
pkill -f "next-server"
pkill -f "next dev"

# 2. Restart with memory limit (recommended)
cd fashion-agent-dashboard
npm run dev

# OR for lower memory usage
npm run dev:safe
```

## Monitoring Memory Usage

### On macOS (Activity Monitor)
1. Open Activity Monitor
2. Search for "node"
3. Watch "Real Memory" column
4. **Normal usage**: 200-800 MB
5. **Warning**: > 1.5 GB
6. **Critical**: > 3 GB (will crash)

### Command Line
```bash
# Watch memory usage in real-time
ps aux | grep "next-server" | grep -v grep
```

## Best Practices to Avoid Memory Issues

### 1. Close Unused Modals/Components
When testing the bulk uploader:
- Test with 5-10 images first
- Close the modal when done
- Don't keep 100+ preview images open

### 2. Restart Dev Server Periodically
During heavy development:
```bash
# Every few hours or after major changes
npm run dev
```

### 3. Clear Browser Cache
Memory can accumulate in browser too:
- Chrome DevTools > Network > Disable cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### 4. Use Production Build for Testing Large Uploads
For testing 100+ product uploads:

```bash
npm run build
npm start
```

Production builds use much less memory than dev mode.

## Warning Signs

Watch for these indicators:

1. **Fan spinning loudly** - High CPU/memory usage
2. **Browser tabs becoming sluggish** - Memory approaching limit
3. **Activity Monitor shows > 2GB** for next-server
4. **Virtual Memory > 100GB** - Swap thrashing (imminent crash)

If you see these, restart the server ASAP.

## Performance Tips

### For Development
- Use `npm run dev:safe` (2GB limit) for normal coding
- Use `npm run dev` (4GB limit) only when testing bulk features

### For Bulk Upload Testing
- Test with 5-10 images first
- Close the uploader after each test
- Use production build for final 100+ image upload test

### For Production
The memory limits won't apply in production (Vercel handles this). The optimizations will still help with build size and performance.

## Still Having Issues?

If crashes continue after these fixes:

### 1. Check Node.js Version
```bash
node --version
```

Should be v18 or higher. Update if needed:
```bash
nvm install 20
nvm use 20
```

### 2. Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### 3. Reduce Framer Motion Usage
If still problematic, we can remove animations from some components.

### 4. Use Alternative Image Preview
For bulk upload, we could use thumbnails instead of full previews.

## Current Status

✅ Server running at http://localhost:3000
✅ Memory limit: 4GB
✅ Optimizations applied
✅ Preview URL cleanup added

You should now be able to:
- Upload products without crashes
- Test bulk upload with reasonable image counts
- Develop normally without memory issues

## Questions?

- **Q: Is 4GB memory limit enough?**
  - A: Yes, normal Next.js dev should use < 1GB. 4GB is generous buffer.

- **Q: What if I have an 8GB RAM machine?**
  - A: Use `npm run dev:safe` (2GB limit) to leave room for browser and OS.

- **Q: Will this affect production?**
  - A: No, memory limits only apply to local dev. Vercel handles production scaling.

- **Q: Can I bulk upload 100+ images now?**
  - A: Yes, but test with 10-20 first. For large batches, consider using production build.
