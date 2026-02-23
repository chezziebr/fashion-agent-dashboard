import { create } from 'zustand';
import { Product, AIModel, ModelPose, ModelExpression, Job, GeneratedImage } from '@/types';

interface CanvasState {
  selectedModel: AIModel | null;
  selectedPose: ModelPose | null;
  selectedExpression: ModelExpression | null;
  appliedProducts: Product[];
}

interface GenerationState {
  isGenerating: boolean;
  currentJobId: string | null;
  progress: number;
  currentStep: string | null;
}

interface DashboardStore {
  // Canvas state
  canvas: CanvasState;
  setSelectedModel: (model: AIModel | null) => void;
  setSelectedPose: (pose: ModelPose | null) => void;
  setSelectedExpression: (expression: ModelExpression | null) => void;
  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  clearProducts: () => void;

  // Generation state
  generation: GenerationState;
  startGeneration: (jobId: string) => void;
  updateProgress: (progress: number, step?: string) => void;
  completeGeneration: () => void;
  failGeneration: (error: string) => void;

  // Results
  generatedImages: GeneratedImage[];
  addGeneratedImages: (images: GeneratedImage[]) => void;
  clearGeneratedImages: () => void;
  updateImageStatus: (imageId: string, status: GeneratedImage['status']) => void;

  // Jobs
  recentJobs: Job[];
  setRecentJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;

  // UI state
  showAgentPanel: boolean;
  toggleAgentPanel: () => void;
  activeTab: 'products' | 'models' | 'outputs' | 'agents';
  setActiveTab: (tab: 'products' | 'models' | 'outputs' | 'agents') => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Canvas state
  canvas: {
    selectedModel: null,
    selectedPose: null,
    selectedExpression: null,
    appliedProducts: [],
  },
  
  setSelectedModel: (model) =>
    set((state) => ({
      canvas: { ...state.canvas, selectedModel: model },
    })),
    
  setSelectedPose: (pose) =>
    set((state) => ({
      canvas: { ...state.canvas, selectedPose: pose },
    })),
    
  setSelectedExpression: (expression) =>
    set((state) => ({
      canvas: { ...state.canvas, selectedExpression: expression },
    })),
    
  addProduct: (product) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        appliedProducts: state.canvas.appliedProducts.some(p => p.id === product.id)
          ? state.canvas.appliedProducts
          : [...state.canvas.appliedProducts, product],
      },
    })),
    
  removeProduct: (productId) =>
    set((state) => ({
      canvas: {
        ...state.canvas,
        appliedProducts: state.canvas.appliedProducts.filter(p => p.id !== productId),
      },
    })),
    
  clearProducts: () =>
    set((state) => ({
      canvas: { ...state.canvas, appliedProducts: [] },
    })),

  // Generation state
  generation: {
    isGenerating: false,
    currentJobId: null,
    progress: 0,
    currentStep: null,
  },
  
  startGeneration: (jobId) =>
    set({
      generation: {
        isGenerating: true,
        currentJobId: jobId,
        progress: 0,
        currentStep: 'Initializing...',
      },
    }),
    
  updateProgress: (progress, step) =>
    set((state) => ({
      generation: {
        ...state.generation,
        progress,
        currentStep: step ?? state.generation.currentStep,
      },
    })),
    
  completeGeneration: () =>
    set({
      generation: {
        isGenerating: false,
        currentJobId: null,
        progress: 100,
        currentStep: 'Complete',
      },
    }),
    
  failGeneration: (error) =>
    set({
      generation: {
        isGenerating: false,
        currentJobId: null,
        progress: 0,
        currentStep: `Failed: ${error}`,
      },
    }),

  // Results
  generatedImages: [],
  
  addGeneratedImages: (images) =>
    set((state) => ({
      generatedImages: [...images, ...state.generatedImages],
    })),
    
  clearGeneratedImages: () =>
    set({ generatedImages: [] }),
    
  updateImageStatus: (imageId, status) =>
    set((state) => ({
      generatedImages: state.generatedImages.map((img) =>
        img.id === imageId ? { ...img, status } : img
      ),
    })),

  // Jobs
  recentJobs: [],
  
  setRecentJobs: (jobs) =>
    set({ recentJobs: jobs }),
    
  addJob: (job) =>
    set((state) => ({
      recentJobs: [job, ...state.recentJobs.slice(0, 19)],
    })),

  // UI state
  showAgentPanel: false,
  
  toggleAgentPanel: () =>
    set((state) => ({ showAgentPanel: !state.showAgentPanel })),
    
  activeTab: 'products',
  
  setActiveTab: (tab) =>
    set({ activeTab: tab }),
}));
