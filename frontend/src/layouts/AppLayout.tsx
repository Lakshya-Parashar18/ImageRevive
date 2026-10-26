import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';
import { LocomotiveScrollWrapper } from '../components/common/LocomotiveScrollWrapper';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Your Image Workspace',
    subtitle: 'Upload an image, explore its properties, and apply enhancements or filters.',
  },
  '/inspector': {
    title: 'Image Inspector',
    subtitle: 'Explore image dimensions, color channels, intensity distributions, and individual pixels.',
  },
  '/enhancement': {
    title: 'Enhance',
    subtitle: 'Adjust brightness and contrast, redistribute intensity values, and refine image appearance.',
  },
  '/filtering': {
    title: 'Filters',
    subtitle: 'Smooth noise, sharpen details, and explore how spatial kernels transform an image.',
  },
  '/restoration': {
    title: 'Restore',
    subtitle: 'Experiment with noise reduction and restoration techniques to recover useful image detail.',
  },
  '/arena': {
    title: 'Compare',
    subtitle: 'Apply different processing methods to the same image and inspect their results side by side.',
  },
  '/history': {
    title: 'History',
    subtitle: 'Review recent edits, revisit available results, and download processed images.',
  },
  '/guide': {
    title: 'Processing Guide',
    subtitle: 'Understand the techniques behind image enhancement, filtering, and restoration.',
  },
  '/about': {
    title: 'Processing Guide',
    subtitle: 'Understand the techniques behind image enhancement, filtering, and restoration.',
  },
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const currentMeta = PAGE_META[location.pathname] || {
    title: 'ImageRevive',
    subtitle: 'An intelligent image enhancement and analysis studio.',
  };

  return (
    <div className="min-h-screen bg-main text-primary flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header pageTitle={currentMeta.title} pageSubtitle={currentMeta.subtitle} />

        <LocomotiveScrollWrapper>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </LocomotiveScrollWrapper>
      </div>
    </div>
  );
};
