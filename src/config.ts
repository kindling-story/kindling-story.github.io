/**
 * Central configuration for the Kindling story experience.
 * Edit these values to tune animations, colors, and behavior.
 */

// =============================================================================
// ANIMATION
// =============================================================================

export const ANIMATION = {
  /** Duration for node/edge grow-in animation (ms) */
  nodeDuration: 800,
  
  /** Duration for label fade-in animation (ms) */
  labelDuration: 400,
  
  /** Total animation duration (computed) */
  get totalDuration() {
    return this.nodeDuration + this.labelDuration;
  },
};

// =============================================================================
// COLORS
// =============================================================================

export const COLORS = {
  // Background & UI
  bgDeep: "#0a0a0f",
  bgSurface: "#12121a",
  bgElevated: "#1a1a25",
  borderSubtle: "#2a2a35",
  
  // Text
  textPrimary: "#e8e4df",
  textMuted: "#8a8680",
  
  // Accents
  accentWarm: "#ffaa64",
  accentGlow: "#ffd4a8",
  accentCool: "#96b8ff",
  
  // Graph
  defaultNodeColor: "#ffaa64",
  defaultEdgeColor: "#4a4a5a",
  labelColor: "#e8e4df",
};

// =============================================================================
// GRAPH SETTINGS
// =============================================================================

export const GRAPH = {
  /** Default node size if not specified in GEXF */
  defaultNodeSize: 20,
  
  /** Default edge thickness */
  defaultEdgeSize: 2,
  
  /** Label font family */
  labelFont: "Crimson Text, Georgia, serif",
  
  /** Label font size */
  labelSize: 14,
  
  /** Label font weight */
  labelWeight: "500",
};

// =============================================================================
// CAMERA
// =============================================================================

export const CAMERA = {
  /** Initial zoom level (1 = default, lower = zoomed in, higher = zoomed out) */
  initialRatio: 1,
  
  /** Initial camera center X (0-1, 0.5 = center) */
  initialX: 0.5,
  
  /** Initial camera center Y (0-1, 0.5 = center) */
  initialY: 0.5,
};

// =============================================================================
// PATHS
// =============================================================================

export const PATHS = {
  /** Path to the story graph file */
  storyGraph: "/story.gexf",
  
  /** Base path for content items (relative to public/) */
  itemsBase: "/",
};
