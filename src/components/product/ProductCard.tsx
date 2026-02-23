'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shirt,
  Loader2,
  Scissors,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (productId: string) => void;
  onExtract: (productId: string) => void;
  showCheckbox?: boolean;
  extracting?: boolean;
}

export default function ProductCard({
  product,
  isSelected,
  onSelect,
  onExtract,
  showCheckbox = false,
  extracting = false,
}: ProductCardProps) {
  const [hovering, setHovering] = useState(false);

  const getStatusBadge = () => {
    const status = product.extraction_status;

    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            Extracted
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-600">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const canExtract = product.extraction_status === 'pending' || product.extraction_status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        'card-hover p-3 relative',
        isSelected && 'border-accent-purple bg-accent-purple/10'
      )}
    >
      {/* Checkbox for batch selection */}
      {showCheckbox && (
        <div className="absolute top-2 right-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(product.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-accent-purple focus:ring-accent-purple cursor-pointer"
          />
        </div>
      )}

      <div
        onClick={() => onSelect(product.id)}
        className="cursor-pointer"
      >
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="relative flex-shrink-0">
            {(product.studio_image_url || product.thumbnail_url || product.original_image_url) ? (
              <img
                src={product.studio_image_url || product.thumbnail_url || product.original_image_url}
                alt={product.name}
                className="w-12 h-16 object-cover rounded-lg bg-surface-overlay"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={cn(
              "w-12 h-16 bg-surface-overlay rounded-lg flex items-center justify-center",
              (product.studio_image_url || product.thumbnail_url || product.original_image_url) && "hidden"
            )}>
              <Shirt className="w-6 h-6 text-text-muted" />
            </div>
            {/* Show extracted indicator */}
            {product.extraction_status === 'completed' && product.studio_image_url && (
              <div className="absolute inset-0 rounded-lg border-2 border-green-500" />
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{product.name || product.sku}</p>
            <p className="text-xs text-text-muted">{product.sku}</p>

            {/* Tags Row */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn(
                'text-2xs px-1.5 py-0.5 rounded',
                product.brand === 'TH8TA'
                  ? 'bg-surface-overlay text-text-secondary'
                  : 'bg-accent-cyan/20 text-accent-cyan'
              )}>
                {product.brand === 'ALMOST_ZERO_MOTION' ? 'AZM' : product.brand}
              </span>
              <span className="text-2xs text-text-muted">{product.garment_type}</span>
            </div>

            {/* Status Badge */}
            <div className="mt-2">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>

      {/* Extract Button - Shows on hover if can extract */}
      {canExtract && hovering && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onExtract(product.id);
          }}
          disabled={extracting}
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            extracting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-accent-purple/10 text-accent-purple hover:bg-accent-purple hover:text-white'
          )}
        >
          {extracting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Scissors className="w-3 h-3" />
              Extract Garment
            </>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}
