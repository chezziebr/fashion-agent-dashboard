'use client';

import { useState } from 'react';
import ModelPrepare from '@/components/model/ModelPrepare';
import ModelManager from '@/components/model/ModelManager';
import Link from 'next/link';
import { ArrowLeft, Upload, Library } from 'lucide-react';

export default function ModelPreparePage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-surface-raised rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'upload'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload & Prepare
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'library'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Library className="w-4 h-4" />
              Model Library
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' ? (
          <ModelPrepare
            onComplete={(result) => {
              console.log('Model prepared:', result);
              // Switch to library tab to see the results
              setActiveTab('library');
            }}
          />
        ) : (
          <ModelManager />
        )}
      </div>
    </div>
  );
}
