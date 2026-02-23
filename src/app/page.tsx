'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shirt,
  User,
  Sparkles,
  Settings,
  Search,
  Plus,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Download,
  Check,
  X,
  Loader2,
  Brain,
  Workflow,
  Image as ImageIcon,
  Package,
  Grid3X3,
  List,
  Upload,
  Scissors,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProducts } from '@/hooks/useProducts';
import { useModels } from '@/hooks/useModels';
import ProductUpload from '@/components/product/ProductUpload';
import BulkUpload from '@/components/product/BulkUpload';
import ProductCard from '@/components/product/ProductCard';
import BatchExtractionControls from '@/components/product/BatchExtractionControls';

const POSES = ['Front', 'Half Front', 'Side', 'Back'];
const EXPRESSIONS = ['Neutral', 'Smiling', 'Casual', 'Serious'];

export default function DashboardPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedPose, setSelectedPose] = useState('Front');
  const [selectedExpression, setSelectedExpression] = useState('Neutral');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Product preview state
  const [previewedProduct, setPreviewedProduct] = useState<string | null>(null);

  // Extraction state
  const [batchExtractionMode, setBatchExtractionMode] = useState(false);
  const [selectedForExtraction, setSelectedForExtraction] = useState<string[]>([]);
  const [extractingProducts, setExtractingProducts] = useState<Set<string>>(new Set());

  // Fetch real data from API
  const { products, loading: productsLoading, refetch: refetchProducts } = useProducts({
    brand: brandFilter || undefined,
    search: searchQuery || undefined,
  });

  const { models, loading: modelsLoading } = useModels({
    include_poses: true,
    include_expressions: true,
  });

  const filteredProducts = products;

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
  };

  const handlePromptSubmit = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    // This would call the orchestrator
    console.log('Processing prompt:', prompt);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
    setPrompt('');
  };

  // Extraction handlers
  const handleSingleExtract = async (productId: string) => {
    setExtractingProducts(prev => new Set(prev).add(productId));

    try {
      const response = await fetch('/api/products/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: [productId],
          remove_background: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Extraction complete:', result.data);
        await refetchProducts();
      } else {
        console.error('Extraction failed:', result.error);
      }
    } catch (error) {
      console.error('Extraction error:', error);
    } finally {
      setExtractingProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleBatchExtract = async () => {
    if (selectedForExtraction.length === 0) return;

    const productsToExtract = new Set(selectedForExtraction);
    setExtractingProducts(productsToExtract);

    try {
      const response = await fetch('/api/products/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: selectedForExtraction,
          remove_background: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Batch extraction complete:', result.message);
        await refetchProducts();
        setSelectedForExtraction([]);
      } else {
        console.error('Batch extraction failed:', result.error);
      }
    } catch (error) {
      console.error('Batch extraction error:', error);
    } finally {
      setExtractingProducts(new Set());
    }
  };

  // Delete product handler
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        console.log('Product deleted successfully');
        setPreviewedProduct(null);
        await refetchProducts();
      } else {
        console.error('Delete failed:', result.error);
        alert('Failed to delete product: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete product');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Product Catalog */}
      <aside className="w-72 border-r border-surface-border bg-surface-raised flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-surface-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Fashion Agent</span>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search SKUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Brand Filter */}
        <div className="p-4 border-b border-surface-border">
          <div className="flex gap-2">
            <button
              onClick={() => setBrandFilter(null)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                !brandFilter ? 'bg-accent-purple text-white' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
              )}
            >
              All
            </button>
            <button
              onClick={() => setBrandFilter('TH8TA')}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                brandFilter === 'TH8TA' ? 'bg-accent-purple text-white' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
              )}
            >
              TH8TA
            </button>
            <button
              onClick={() => setBrandFilter('ALMOST_ZERO_MOTION')}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                brandFilter === 'ALMOST_ZERO_MOTION' ? 'bg-accent-purple text-white' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
              )}
            >
              AZM
            </button>
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Batch Extraction Controls */}
          <AnimatePresence>
            {batchExtractionMode && (
              <BatchExtractionControls
                selectedCount={selectedForExtraction.length}
                onExtract={handleBatchExtract}
                onCancel={() => {
                  setBatchExtractionMode(false);
                  setSelectedForExtraction([]);
                }}
              />
            )}
          </AnimatePresence>

          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Package className="w-12 h-12 mx-auto text-text-muted mb-3" />
              <p className="text-sm text-text-muted mb-1">No products yet</p>
              <p className="text-xs text-text-muted">Upload your first product to get started</p>
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={
                  batchExtractionMode
                    ? selectedForExtraction.includes(product.id)
                    : selectedProducts.includes(product.id)
                }
                onSelect={(id) => {
                  // Always set preview when clicking card
                  setPreviewedProduct(id);

                  if (batchExtractionMode) {
                    // Batch extraction mode - checkbox controls selection
                    if (selectedForExtraction.includes(id)) {
                      setSelectedForExtraction(selectedForExtraction.filter(pid => pid !== id));
                    } else {
                      setSelectedForExtraction([...selectedForExtraction, id]);
                    }
                  } else {
                    // Try-on mode - clicking toggles selection
                    if (selectedProducts.includes(id)) {
                      setSelectedProducts(selectedProducts.filter(pid => pid !== id));
                    } else {
                      setSelectedProducts([...selectedProducts, id]);
                    }
                  }
                }}
                onExtract={handleSingleExtract}
                showCheckbox={batchExtractionMode}
                extracting={extractingProducts.has(product.id)}
              />
            ))
          )}
        </div>

        {/* Add Product Buttons */}
        <div className="p-4 border-t border-surface-border space-y-2">
          <button
            onClick={() => setBatchExtractionMode(!batchExtractionMode)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              batchExtractionMode
                ? 'bg-accent-purple text-white'
                : 'bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20'
            )}
          >
            <Scissors className="w-4 h-4" />
            {batchExtractionMode ? 'Exit Extraction Mode' : 'Batch Extract'}
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="btn-primary w-full"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-secondary w-full text-sm"
          >
            <Plus className="w-4 h-4" />
            Single Upload
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 border-b border-surface-border bg-surface-raised/50 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold">Try-On Studio</h1>
            <div className="flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <span className="agent-badge bg-accent-green/20 text-accent-green">
                  <Shirt className="w-3 h-3" />
                  {selectedProducts.length} item{selectedProducts.length > 1 ? 's' : ''}
                </span>
              )}
              {selectedModel && (
                <span className="agent-badge bg-accent-blue/20 text-accent-blue">
                  <User className="w-3 h-3" />
                  {models.find(m => m.id === selectedModel)?.name}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/models/prepare">
              <button className="btn-primary text-sm">
                <UserPlus className="w-4 h-4" />
                Upload Models
              </button>
            </Link>
            <button
              onClick={() => setShowAgentPanel(!showAgentPanel)}
              className={cn(
                'btn-ghost',
                showAgentPanel && 'bg-surface-overlay text-accent-purple'
              )}
            >
              <Workflow className="w-4 h-4" />
              Agents
            </button>
            <button className="btn-ghost">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 flex">
          {/* Model Canvas */}
          <div className="flex-1 relative grid-overlay flex items-center justify-center">
            <AnimatePresence mode="wait">
              {selectedModel ? (
                <motion.div
                  key={selectedModel}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative"
                >
                  {/* Model Display */}
                  <div className="w-80 h-[480px] bg-surface-raised rounded-2xl border border-surface-border overflow-hidden relative">
                    {/* Model Image */}
                    {models.find(m => m.id === selectedModel)?.base_image_url ? (
                      <img
                        src={models.find(m => m.id === selectedModel)?.base_image_url}
                        alt={models.find(m => m.id === selectedModel)?.name || 'Model'}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <User className="w-32 h-32 text-surface-border" />
                      </div>
                    )}
                    
                    {/* Applied garments overlay */}
                    {selectedProducts.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Sparkles className="w-8 h-8 text-accent-purple mx-auto mb-2 animate-pulse" />
                          <p className="text-sm text-text-secondary">
                            {selectedProducts.length} garment{selectedProducts.length > 1 ? 's' : ''} applied
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Model info */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-surface/80 backdrop-blur-sm rounded-lg p-3">
                        <p className="font-medium">{models.find(m => m.id === selectedModel)?.name || 'Select a model'}</p>
                        <p className="text-xs text-text-muted">{selectedPose} • {selectedExpression}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pose selector */}
                  <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    {POSES.map((pose) => (
                      <button
                        key={pose}
                        onClick={() => setSelectedPose(pose)}
                        className={cn(
                          'w-12 h-12 rounded-lg border border-surface-border flex items-center justify-center text-xs transition-all',
                          selectedPose === pose ? 'bg-accent-purple text-white border-accent-purple' : 'bg-surface-raised text-text-muted hover:text-text-primary hover:border-text-muted'
                        )}
                        title={pose}
                      >
                        {pose.charAt(0)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : previewedProduct ? (
                <motion.div
                  key={previewedProduct}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-2xl w-full"
                >
                  {(() => {
                    const product = products.find(p => p.id === previewedProduct);
                    if (!product) return null;

                    return (
                      <div className="bg-surface-raised rounded-2xl border border-surface-border overflow-hidden shadow-2xl">
                        {/* Product Image */}
                        <div className="relative">
                          {product.original_image_url ? (
                            <img
                              src={product.original_image_url}
                              alt={product.name}
                              className="w-full max-h-[500px] object-contain bg-surface-overlay"
                            />
                          ) : (
                            <div className="w-full h-96 bg-surface-overlay flex items-center justify-center">
                              <Shirt className="w-32 h-32 text-text-muted" />
                            </div>
                          )}
                          {/* Close button */}
                          <button
                            onClick={() => setPreviewedProduct(null)}
                            className="absolute top-4 right-4 p-2 bg-surface-raised/90 backdrop-blur-sm rounded-lg hover:bg-surface border border-surface-border transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          {/* Status badge */}
                          <div className="absolute top-4 left-4">
                            {product.extraction_status === 'completed' && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/20 text-green-600 backdrop-blur-sm">
                                <Check className="w-4 h-4" />
                                Extracted
                              </span>
                            )}
                            {product.extraction_status === 'pending' && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-600 backdrop-blur-sm">
                                <Loader2 className="w-4 h-4" />
                                Needs Extraction
                              </span>
                            )}
                            {product.extraction_status === 'failed' && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-600 backdrop-blur-sm">
                                <AlertCircle className="w-4 h-4" />
                                Extraction Failed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-6 border-t border-surface-border">
                          <div className="mb-4">
                            <h3 className="text-xl font-bold mb-1">{product.name}</h3>
                            <p className="text-sm text-text-muted">SKU: {product.sku}</p>
                          </div>

                          <div className="flex items-center gap-3 mb-4">
                            <span className={cn(
                              'px-3 py-1 rounded-lg text-xs font-medium',
                              product.brand === 'TH8TA'
                                ? 'bg-surface-overlay text-text-secondary'
                                : 'bg-accent-cyan/20 text-accent-cyan'
                            )}>
                              {product.brand === 'ALMOST_ZERO_MOTION' ? 'AZM' : product.brand}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-surface-overlay text-text-secondary">
                              {product.garment_type}
                            </span>
                            {product.color && (
                              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-surface-overlay text-text-secondary">
                                {product.color}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              {product.extraction_status === 'pending' || product.extraction_status === 'failed' ? (
                                <button
                                  onClick={() => handleSingleExtract(product.id)}
                                  disabled={extractingProducts.has(product.id)}
                                  className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {extractingProducts.has(product.id) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Extracting...
                                    </>
                                  ) : (
                                    <>
                                      <Scissors className="w-4 h-4" />
                                      Extract Garment
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div></div>
                              )}
                              <button
                                onClick={() => {
                                  if (!selectedProducts.includes(product.id)) {
                                    const newSelection = [...selectedProducts, product.id];
                                    setSelectedProducts(newSelection);
                                    console.log('Product added to try-on selection:', {
                                      productId: product.id,
                                      sku: product.sku,
                                      totalSelected: newSelection.length
                                    });
                                  }
                                  setPreviewedProduct(null);
                                }}
                                className={cn(
                                  "flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors",
                                  product.extraction_status === 'pending' || product.extraction_status === 'failed'
                                    ? "bg-accent-blue text-white hover:bg-accent-blue/90"
                                    : "col-span-2 bg-accent-blue text-white hover:bg-accent-blue/90"
                                )}
                              >
                                <Sparkles className="w-4 h-4" />
                                Use for Try-On
                              </button>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Delete Product
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-surface-raised border border-dashed border-surface-border flex items-center justify-center mx-auto mb-4">
                    <Shirt className="w-10 h-10 text-text-muted" />
                  </div>
                  <p className="text-text-secondary">Click a product to preview</p>
                  <p className="text-sm text-text-muted mt-1">Or select a model to start try-on</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generation overlay */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-accent-purple animate-spin mx-auto mb-4" />
                    <p className="font-medium">Generating try-on images...</p>
                    <p className="text-sm text-text-muted mt-1">This may take a few moments</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel - Models & Controls */}
          <aside className="w-80 border-l border-surface-border bg-surface-raised flex flex-col">
            {/* Model Selector */}
            <div className="p-4 border-b border-surface-border">
              <h3 className="text-sm font-medium mb-3">Select Model</h3>
              {modelsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <User className="w-12 h-12 mx-auto text-text-muted mb-2" />
                  <p className="text-xs text-text-muted">No AI models yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        'aspect-[3/4] rounded-lg border overflow-hidden transition-all relative group',
                        selectedModel === model.id
                          ? 'border-accent-purple ring-2 ring-accent-purple/30'
                          : 'border-surface-border hover:border-text-muted'
                      )}
                    >
                      {model.thumbnail_url ? (
                        <img
                          src={model.thumbnail_url}
                          alt={model.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-surface-overlay flex items-center justify-center">
                          <User className="w-8 h-8 text-text-muted" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-surface/90 to-transparent p-1">
                        <p className="text-2xs font-medium text-center">{model.model_code}</p>
                      </div>
                      {selectedModel === model.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent-purple flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Expression Selector */}
            <div className="p-4 border-b border-surface-border">
              <h3 className="text-sm font-medium mb-3">Expression</h3>
              <div className="flex flex-wrap gap-2">
                {EXPRESSIONS.map((expr) => (
                  <button
                    key={expr}
                    onClick={() => setSelectedExpression(expr)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      selectedExpression === expr
                        ? 'bg-accent-purple text-white'
                        : 'bg-surface-overlay text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {expr}
                  </button>
                ))}
              </div>
            </div>

            {/* Generation Options */}
            <div className="p-4 border-b border-surface-border">
              <h3 className="text-sm font-medium mb-3">Generation Options</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Variations</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-surface-overlay text-text-secondary hover:text-text-primary transition-all"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Quality</label>
                  <select className="input text-sm">
                    <option>Standard</option>
                    <option>High</option>
                    <option>Draft (Fast)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Natural Language Prompt */}
            <div className="p-4 border-b border-surface-border">
              <h3 className="text-sm font-medium mb-3">Quick Command</h3>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., 'Put SKU TH8-001 and TH8-002 on model D01, casual and smiling'"
                  className="input text-sm min-h-[80px] resize-none pr-10"
                />
                <button
                  onClick={handlePromptSubmit}
                  disabled={!prompt.trim() || isGenerating}
                  className="absolute bottom-2 right-2 p-2 rounded-lg bg-accent-purple text-white disabled:opacity-50 hover:bg-accent-purple/90 transition-all"
                >
                  <Brain className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-auto p-4 border-t border-surface-border">
              <button
                onClick={handleGenerate}
                disabled={!selectedModel || selectedProducts.length === 0 || isGenerating}
                className="btn-primary w-full py-3"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Try-On
                  </>
                )}
              </button>
              {(!selectedModel || selectedProducts.length === 0) && (
                <p className="text-xs text-text-muted text-center mt-2">
                  Select a model and at least one product
                </p>
              )}
            </div>
          </aside>

          {/* Agent Panel (Slide-out) */}
          <AnimatePresence>
            {showAgentPanel && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-surface-border bg-surface-raised overflow-hidden"
              >
                <div className="w-80 h-full flex flex-col">
                  <div className="p-4 border-b border-surface-border flex items-center justify-between">
                    <h3 className="font-medium">Agent Pipeline</h3>
                    <button onClick={() => setShowAgentPanel(false)} className="btn-ghost p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 p-4 space-y-3">
                    {/* Agent nodes */}
                    {[
                      { name: 'Orchestrator', icon: Brain, color: 'purple', status: 'ready' },
                      { name: 'Garment Extract', icon: Shirt, color: 'green', status: 'ready' },
                      { name: 'Model Manager', icon: User, color: 'blue', status: 'ready' },
                      { name: 'Virtual Try-On', icon: Sparkles, color: 'amber', status: 'ready' },
                      { name: 'QC Agent', icon: Check, color: 'red', status: 'ready' },
                    ].map((agent, index) => (
                      <motion.div
                        key={agent.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="card p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            agent.color === 'purple' && 'bg-accent-purple/20 text-accent-purple',
                            agent.color === 'green' && 'bg-accent-green/20 text-accent-green',
                            agent.color === 'blue' && 'bg-accent-blue/20 text-accent-blue',
                            agent.color === 'amber' && 'bg-accent-amber/20 text-accent-amber',
                            agent.color === 'red' && 'bg-accent-red/20 text-accent-red',
                          )}>
                            <agent.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-text-muted">Ready</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-accent-green" />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-surface-border">
                    <button className="btn-secondary w-full">
                      <Workflow className="w-4 h-4" />
                      Edit Workflow
                    </button>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Product Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <ProductUpload
            onSuccess={(productId) => {
              console.log('Product uploaded:', productId);
              refetchProducts();
              setShowUpload(false);
            }}
            onClose={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkUpload && (
          <BulkUpload
            onSuccess={(productIds) => {
              console.log(`${productIds.length} products uploaded:`, productIds);
              refetchProducts();
              setShowBulkUpload(false);
            }}
            onClose={() => setShowBulkUpload(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
