import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ActiveImage, SampleImageInfo, HistoryEntry, ImageAnalysisResult } from '../types';
import { api } from '../services/api';

interface ImageContextType {
  activeImage: ActiveImage | null;
  sampleImages: SampleImageInfo[];
  history: HistoryEntry[];
  isLoadingSamples: boolean;
  isAnalyzing: boolean;
  backendHealthy: boolean | null;
  uploadFile: (file: File) => Promise<ActiveImage>;
  loadSample: (sampleId: string) => Promise<ActiveImage>;
  setActiveImage: (img: ActiveImage | null) => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  checkBackendHealth: () => Promise<boolean>;
  refreshAnalysis: (imageId?: string) => Promise<ImageAnalysisResult | null>;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

const HISTORY_STORAGE_KEY = 'imagerevive_session_history';

export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeImage, setActiveImage] = useState<ActiveImage | null>(null);
  const [sampleImages, setSampleImages] = useState<SampleImageInfo[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await api.checkHealth();
      const healthy = res.status === 'healthy';
      setBackendHealthy(healthy);
      return healthy;
    } catch {
      setBackendHealthy(false);
      return false;
    }
  }, []);

  // Fetch samples on load and set default image if none active
  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoadingSamples(true);
      const isUp = await checkBackendHealth();
      if (!isUp) {
        setIsLoadingSamples(false);
        return;
      }

      try {
        const samples = await api.getSamples();
        if (mounted) {
          setSampleImages(samples);
          // If no active image, automatically load the first sample (Cameraman)
          if (!activeImage && samples.length > 0) {
            const defaultSample = samples[0];
            const analysis = await api.analyzeImage(defaultSample.id);
            setActiveImage({
              id: defaultSample.id,
              dataUrl: defaultSample.data_url,
              filename: `${defaultSample.id}.png`,
              width: defaultSample.width,
              height: defaultSample.height,
              analysis,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load sample images:', err);
      } finally {
        if (mounted) setIsLoadingSamples(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [checkBackendHealth]);

  const uploadFile = async (file: File): Promise<ActiveImage> => {
    setIsAnalyzing(true);
    try {
      const res = await api.uploadImage(file);
      const newActive: ActiveImage = {
        id: res.image_id,
        dataUrl: res.data_url,
        filename: res.filename,
        width: res.analysis.width,
        height: res.analysis.height,
        analysis: res.analysis,
      };
      setActiveImage(newActive);
      return newActive;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSample = async (sampleId: string): Promise<ActiveImage> => {
    setIsAnalyzing(true);
    try {
      const sample = await api.getSampleById(sampleId);
      const analysis = await api.analyzeImage(sample.id);
      const newActive: ActiveImage = {
        id: sample.id,
        dataUrl: sample.data_url,
        filename: `${sample.id}.png`,
        width: sample.width,
        height: sample.height,
        analysis,
      };
      setActiveImage(newActive);
      return newActive;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refreshAnalysis = async (imageId?: string): Promise<ImageAnalysisResult | null> => {
    const targetId = imageId || activeImage?.id;
    if (!targetId) return null;
    try {
      const analysis = await api.analyzeImage(targetId);
      if (activeImage && activeImage.id === targetId) {
        setActiveImage((prev) => (prev ? { ...prev, analysis } : null));
      }
      return analysis;
    } catch (err) {
      console.error('Failed to refresh analysis:', err);
      return null;
    }
  };

  const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, 50); // limit to recent 50 operations
      try {
        // Save metadata without large base64 strings to prevent storage overflow
        const lightweight = updated.map((item) => ({
          ...item,
          outputImageBase64: item.outputImageBase64 ? item.outputImageBase64.substring(0, 100) + '...' : '',
        }));
        sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(lightweight));
      } catch {
        // Ignore quota limits
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      sessionStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <ImageContext.Provider
      value={{
        activeImage,
        sampleImages,
        history,
        isLoadingSamples,
        isAnalyzing,
        backendHealthy,
        uploadFile,
        loadSample,
        setActiveImage,
        addHistoryEntry,
        clearHistory,
        checkBackendHealth,
        refreshAnalysis,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

export const useImage = (): ImageContextType => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImage must be used within an ImageProvider');
  }
  return context;
};
