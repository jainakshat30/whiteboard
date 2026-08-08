export const DefaultStyles = {
  // Generic Node Styles
  node: {
    strokeColor: '#1e1e1e',
    fillColor: '#ffffff',
    strokeWidth: 2,
    strokeStyle: 'solid' as const,
    roughness: 0.5,
    roundness: 'round' as const,
    opacity: 100,
  },
  
  // Group Node Styles (Containers)
  group: {
    strokeColor: '#6366f1', // Indigo to distinguish groups
    fillColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'dashed' as const,
    roughness: 0,
    roundness: 'sharp' as const,
    opacity: 100,
  },

  // Edge / Connector Styles
  edge: {
    strokeColor: '#6b7280', // Gray-500
    fillColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid' as const,
    roughness: 0,
    roundness: 'sharp' as const,
    opacity: 100,
  },
};
