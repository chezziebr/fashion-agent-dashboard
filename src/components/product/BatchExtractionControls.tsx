'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractionResult {
  product_id: string;
  sku: string;
  success: boolean;
  extracted_image_url?: string;
  error?: string;
}

interface BatchExtractionControlsProps {
  selectedCount: number;
  onExtract: () => Promise<void>;
  onCancel: () => void;
}

export default function BatchExtractionControls({
  selectedCount,
  onExtract,
  onCancel,
}: BatchExtractionControlsProps) {
  const [extracting, setExtracting] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);

  const handleExtract = async () => {
    setExtracting(true);
    setResults(null);

    try {
      await onExtract();
      // Results would be set by parent component
    } catch (error) {
      console.error('Batch extraction error:', error);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-3 mb-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-accent-purple" />
          <span className="text-sm font-medium text-accent-purple">
            Batch Extraction Mode
          </span>
        </div>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-white/50 rounded transition-colors"
          disabled={extracting}
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      <p className="text-xs text-text-secondary mb-3">
        {selectedCount === 0
          ? 'Select products to extract'
          : `${selectedCount} product${selectedCount > 1 ? 's' : ''} selected`}
      </p>

      {/* Results Display */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-2 bg-white rounded-lg"
          >
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>{results.success} succeeded</span>
              </div>
              {results.failed > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="w-3 h-3" />
                  <span>{results.failed} failed</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleExtract}
          disabled={selectedCount === 0 || extracting}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            selectedCount === 0 || extracting
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-accent-purple text-white hover:bg-accent-purple/90'
          )}
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Scissors className="w-4 h-4" />
              Extract {selectedCount > 0 && `(${selectedCount})`}
            </>
          )}
        </button>
      </div>

      {/* Info Message */}
      {selectedCount === 0 && (
        <div className="mt-2 flex items-start gap-2 text-xs text-text-muted">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Click the checkboxes on product cards to select items for batch extraction
          </span>
        </div>
      )}
    </motion.div>
  );
}
