'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, Check, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types';

interface BulkUploadProps {
  onSuccess?: (productIds: string[]) => void;
  onClose?: () => void;
}

interface FileWithSku {
  file: File;
  sku: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  productId?: string;
}

interface CsvRow {
  sku: string;
  name?: string;
  brand?: string;
  category?: string;
  garment_type?: string;
  color?: string;
  color_hex?: string;
  size_range?: string;
  tags?: string;
}

export default function BulkUpload({ onSuccess, onClose }: BulkUploadProps) {
  const [imageFiles, setImageFiles] = useState<FileWithSku[]>([]);
  const [csvData, setCsvData] = useState<Map<string, CsvRow>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Default values for optional fields
  const [defaultBrand, setDefaultBrand] = useState<'TH8TA' | 'ALMOST_ZERO_MOTION' | 'OTHER'>('TH8TA');
  const [defaultCategory, setDefaultCategory] = useState('apparel');
  const [defaultGarmentType, setDefaultGarmentType] = useState<'upper' | 'lower' | 'full' | 'accessory'>('upper');

  // Extract SKU from filename
  const extractSkuFromFilename = (filename: string): string => {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // Common patterns:
    // 1. Entire filename is SKU
    // 2. SKU-description.jpg -> extract before first dash/underscore
    // 3. description-SKU123.jpg -> try to find SKU pattern

    // First try: use everything before first space, dash, or underscore
    const beforeSeparator = nameWithoutExt.split(/[-_\s]/)[0];
    if (beforeSeparator) {
      return beforeSeparator.toUpperCase();
    }

    // Fallback: use entire filename
    return nameWithoutExt.toUpperCase();
  };

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: FileWithSku[] = files.map(file => ({
      file,
      sku: extractSkuFromFilename(file.name),
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));

    setImageFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  // Handle CSV upload
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const skuIndex = headers.findIndex(h => h === 'sku');
        if (skuIndex === -1) {
          setError('CSV must have a "sku" column');
          return;
        }

        const dataMap = new Map<string, CsvRow>();

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());
          const row: CsvRow = { sku: values[skuIndex] };

          headers.forEach((header, idx) => {
            const value = values[idx];
            if (!value || header === 'sku') return;

            switch (header) {
              case 'name':
              case 'product_name':
                row.name = value;
                break;
              case 'brand':
                row.brand = value;
                break;
              case 'category':
                row.category = value;
                break;
              case 'garment_type':
              case 'type':
                row.garment_type = value;
                break;
              case 'color':
                row.color = value;
                break;
              case 'color_hex':
              case 'hex':
                row.color_hex = value;
                break;
              case 'size_range':
              case 'sizes':
                row.size_range = value;
                break;
              case 'tags':
                row.tags = value;
                break;
            }
          });

          dataMap.set(row.sku.toUpperCase(), row);
        }

        setCsvData(dataMap);
        setError(null);
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    };

    reader.readAsText(file);
  }, []);

  // Remove image
  const removeImage = (index: number) => {
    setImageFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Edit SKU
  const updateSku = (index: number, newSku: string) => {
    setImageFiles(prev => {
      const newFiles = [...prev];
      newFiles[index].sku = newSku.toUpperCase();
      return newFiles;
    });
  };

  // Upload all products
  const handleUpload = async () => {
    if (imageFiles.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const uploadedIds: string[] = [];
    const totalFiles = imageFiles.length;

    for (let i = 0; i < imageFiles.length; i++) {
      const fileData = imageFiles[i];

      // Update status
      setImageFiles(prev => {
        const newFiles = [...prev];
        newFiles[i].status = 'uploading';
        return newFiles;
      });

      try {
        // Step 1: Upload image to storage
        const uploadFormData = new FormData();
        uploadFormData.append('file', fileData.file);
        uploadFormData.append('bucket', 'products');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadRes.json();

        // Step 2: Get metadata from CSV or use defaults
        const csvRow = csvData.get(fileData.sku);

        const productData = {
          sku: fileData.sku,
          name: csvRow?.name || fileData.sku,
          brand: csvRow?.brand || defaultBrand,
          category: csvRow?.category || defaultCategory,
          garment_type: csvRow?.garment_type || defaultGarmentType,
          color: csvRow?.color || undefined,
          color_hex: csvRow?.color_hex || undefined,
          size_range: csvRow?.size_range || undefined,
          tags: csvRow?.tags ? csvRow.tags.split(';').map(t => t.trim()) : [],
          original_image_url: uploadData.data.url,
          thumbnail_url: uploadData.data.url,
          extraction_status: 'pending',
        };

        // Step 3: Create product record
        const productRes = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });

        if (!productRes.ok) {
          const errorData = await productRes.json();
          throw new Error(errorData.error || 'Failed to create product');
        }

        const productResult = await productRes.json();
        uploadedIds.push(productResult.data.id);

        // Update status to success
        setImageFiles(prev => {
          const newFiles = [...prev];
          newFiles[i].status = 'success';
          newFiles[i].productId = productResult.data.id;
          return newFiles;
        });

      } catch (err) {
        // Update status to error
        setImageFiles(prev => {
          const newFiles = [...prev];
          newFiles[i].status = 'error';
          newFiles[i].error = err instanceof Error ? err.message : 'Upload failed';
          return newFiles;
        });
      }

      // Update progress
      setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    setUploading(false);

    // Call success callback if any uploads succeeded
    if (uploadedIds.length > 0) {
      setTimeout(() => {
        onSuccess?.(uploadedIds);
      }, 1500);
    }
  };

  const successCount = imageFiles.filter(f => f.status === 'success').length;
  const errorCount = imageFiles.filter(f => f.status === 'error').length;
  const pendingCount = imageFiles.filter(f => f.status === 'pending').length;

  // Cleanup preview URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      imageFiles.forEach(fileData => {
        URL.revokeObjectURL(fileData.preview);
      });
    };
  }, [imageFiles]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Bulk Upload Products</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload multiple images at once. SKUs will be extracted from filenames.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images *
              </label>
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer block">
                <ImageIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 mb-1">Upload product images</p>
                <p className="text-sm text-gray-500">PNG, JPG - Multiple files supported</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* CSV Upload (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Data CSV (Optional)
              </label>
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer block">
                <FileText className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 mb-1">Upload product metadata</p>
                <p className="text-sm text-gray-500">
                  CSV with columns: sku, name, brand, category, etc.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {csvData.size > 0 && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {csvData.size} products loaded from CSV
                </p>
              )}
            </div>
          </div>

          {/* Default Values */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-3">Default Values (for products without CSV data)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Brand</label>
                <select
                  value={defaultBrand}
                  onChange={(e) => setDefaultBrand(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  disabled={uploading}
                >
                  <option value="TH8TA">TH8TA</option>
                  <option value="ALMOST_ZERO_MOTION">(ALMOST) ZERO MOTION</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Category</label>
                <input
                  type="text"
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Garment Type</label>
                <select
                  value={defaultGarmentType}
                  onChange={(e) => setDefaultGarmentType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  disabled={uploading}
                >
                  <option value="upper">Upper Body</option>
                  <option value="lower">Lower Body</option>
                  <option value="full">Full Body</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>
            </div>
          </div>

          {/* Images Preview */}
          {imageFiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Images ({imageFiles.length})
                  {successCount > 0 && (
                    <span className="ml-2 text-green-600">
                      {successCount} uploaded
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="ml-2 text-red-600">
                      {errorCount} failed
                    </span>
                  )}
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {imageFiles.map((fileData, index) => (
                  <div
                    key={index}
                    className="relative border rounded-lg overflow-hidden bg-white"
                  >
                    <img
                      src={fileData.preview}
                      alt={fileData.sku}
                      className="w-full h-32 object-cover"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      {fileData.status === 'pending' && !uploading && (
                        <button
                          onClick={() => removeImage(index)}
                          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {fileData.status === 'uploading' && (
                        <div className="p-1 bg-blue-500 text-white rounded-full">
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </div>
                      )}
                      {fileData.status === 'success' && (
                        <div className="p-1 bg-green-500 text-white rounded-full">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      {fileData.status === 'error' && (
                        <div className="p-1 bg-red-500 text-white rounded-full">
                          <AlertCircle className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* SKU Input */}
                    <div className="p-2">
                      <input
                        type="text"
                        value={fileData.sku}
                        onChange={(e) => updateSku(index, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="SKU"
                        disabled={uploading || fileData.status === 'success'}
                      />
                      {csvData.has(fileData.sku) && (
                        <p className="text-2xs text-green-600 mt-1">Has CSV data</p>
                      )}
                      {fileData.error && (
                        <p className="text-2xs text-red-600 mt-1">{fileData.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading products...</span>
                <span className="text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-blue-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={uploading}
          >
            {successCount > 0 && !uploading ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || imageFiles.length === 0 || pendingCount === 0}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading {successCount + 1}/{imageFiles.length}...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload {pendingCount} Product{pendingCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
