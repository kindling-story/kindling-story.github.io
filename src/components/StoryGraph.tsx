import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Graph from "graphology";
import { parse } from "graphology-gexf/browser";
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
  useSigma,
} from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { ANIMATION, COLORS, GRAPH, CAMERA, PATHS } from "../config";

// Content file structure
interface ItemContent {
  type: "text" | "richtext" | "markdown" | "object3d";
  title: string;
  content?: string;
  contentHtml?: string;
}

// Data passed when a node is clicked
interface NodeClickData {
  id: string;
  label: string;
  contentRef: string;
}

// Full popup state including loaded content
interface PopupState {
  nodeId: string;
  label: string;
  content: ItemContent | null;
  loading: boolean;
  error: string | null;
}

interface StoryGraphInnerProps {
  gexfData: string;
  discoveredNodes: Set<string>;
  onNodeClick: (data: NodeClickData) => void;
  isFirstLoad: boolean;
  onFirstLoadComplete: () => void;
  animatingNodes: Set<string>;
  animationProgress: number;
}

// Inner component that handles the graph logic
const StoryGraphInner: React.FC<StoryGraphInnerProps> = ({
  gexfData,
  discoveredNodes,
  onNodeClick,
  isFirstLoad,
  onFirstLoadComplete,
  animatingNodes,
  animationProgress,
}) => {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();

  // Animation has two phases:
  // Phase 1 (0-1): Node grows, label hidden
  // Phase 2 (1-2): Node at full size, label fades in
  const nodeProgress = Math.min(animationProgress, 1);
  const labelProgress = Math.max(0, animationProgress - 1);

  // Update label color from node attribute
  useEffect(() => {
    sigma.setSetting("labelColor", { attribute: "labelColor" });
  }, [sigma]);

  // Load and filter the graph based on discovered nodes
  useEffect(() => {
    const fullGraph = parse(Graph, gexfData);
    const visibleGraph = new Graph();

    // Add only discovered nodes
    fullGraph.forEachNode((nodeId, attributes) => {
      if (discoveredNodes.has(nodeId)) {
        const isAnimating = animatingNodes.has(nodeId);
        const sizeMultiplier = isAnimating ? nodeProgress : 1;
        // Fade label during phase 2 using RGBA
        const labelAlpha = isAnimating ? labelProgress : 1;
        
        visibleGraph.addNode(nodeId, {
          ...attributes,
          x: attributes.x ?? 0,
          y: attributes.y ?? 0,
          size: (attributes.size ?? GRAPH.defaultNodeSize) * sizeMultiplier,
          color: attributes.color ?? COLORS.defaultNodeColor,
          label: attributes.label ?? nodeId,
          labelColor: `rgba(232, 228, 223, ${labelAlpha})`,
          forceLabel: isAnimating && labelProgress > 0.1 ? true : undefined,
        });
      }
    });

    // Add edges between discovered nodes
    fullGraph.forEachEdge((edgeId, attributes, source, target) => {
      if (discoveredNodes.has(source) && discoveredNodes.has(target)) {
        const isAnimating = animatingNodes.has(source) || animatingNodes.has(target);
        const sizeMultiplier = isAnimating ? nodeProgress : 1;
        
        visibleGraph.addEdge(source, target, {
          ...attributes,
          color: COLORS.defaultEdgeColor,
          size: GRAPH.defaultEdgeSize * sizeMultiplier,
        });
      }
    });

    loadGraph(visibleGraph);

    // Set initial camera position on first load
    if (isFirstLoad && visibleGraph.order > 0) {
      const camera = sigma.getCamera();
      camera.setState({
        x: CAMERA.initialX,
        y: CAMERA.initialY,
        ratio: CAMERA.initialRatio,
        angle: 0,
      });
      onFirstLoadComplete();
    }
  }, [gexfData, discoveredNodes, loadGraph, sigma, isFirstLoad, onFirstLoadComplete, animatingNodes, nodeProgress, labelProgress]);

  // Handle click events
  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        const nodeId = event.node;
        
        // Ignore clicks on animating nodes
        if (animatingNodes.has(nodeId)) {
          return;
        }
        
        const graph = sigma.getGraph();
        const attrs = graph.getNodeAttributes(nodeId);

        onNodeClick({
          id: nodeId,
          label: attrs.label || nodeId,
          contentRef: attrs.contentRef || "",
        });
      },
    });
  }, [registerEvents, sigma, onNodeClick, animatingNodes]);


  return null;
};

// Main exported component
export const StoryGraph: React.FC = () => {
  const [gexfData, setGexfData] = useState<string | null>(null);
  const [discoveredNodes, setDiscoveredNodes] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [fullGraph, setFullGraph] = useState<Graph | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [animatingNodes, setAnimatingNodes] = useState<Set<string>>(new Set());
  const [animationProgress, setAnimationProgress] = useState(2);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFirstLoadComplete = useCallback(() => {
    setIsFirstLoad(false);
  }, []);

  // Start animation for a set of new nodes
  const startNodeAnimation = useCallback((newNodes: Set<string>) => {
    if (newNodes.size === 0) return;
    
    setAnimatingNodes(newNodes);
    setAnimationProgress(0);

    // Phase 1: Node grows (0-1), Phase 2: Label appears (1-2)
    const { nodeDuration, labelDuration, totalDuration } = ANIMATION;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / totalDuration, 1);
      
      // Map 0-1 raw progress to 0-2 animation progress
      let animProgress: number;
      if (elapsed < nodeDuration) {
        // Phase 1: Node growing (ease-out cubic)
        const phase1Progress = elapsed / nodeDuration;
        animProgress = 1 - Math.pow(1 - phase1Progress, 3);
      } else {
        // Phase 2: Label appearing (ease-out)
        const phase2Elapsed = elapsed - nodeDuration;
        const phase2Progress = phase2Elapsed / labelDuration;
        const easedPhase2 = 1 - Math.pow(1 - phase2Progress, 2);
        animProgress = 1 + easedPhase2;
      }
      
      setAnimationProgress(animProgress);

      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        setAnimatingNodes(new Set());
        setAnimationProgress(2);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Wait for container to have dimensions
  useEffect(() => {
    const checkContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0) {
          setContainerReady(true);
          return true;
        }
      }
      return false;
    };

    if (!checkContainer()) {
      // Check again after a frame
      const rafId = requestAnimationFrame(() => {
        if (!checkContainer()) {
          // Fallback: wait a bit longer
          setTimeout(checkContainer, 100);
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, []);

  // Load the GEXF file
  useEffect(() => {
    fetch(PATHS.storyGraph)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((data) => {
        setGexfData(data);
        
        // Parse graph to find initially visible nodes
        const graph = parse(Graph, data);
        setFullGraph(graph);
        
        const initialNodes = new Set<string>();
        graph.forEachNode((nodeId, attributes) => {
          if (attributes.initiallyVisible === true || attributes.initiallyVisible === "true") {
            initialNodes.add(nodeId);
          }
        });
        
        // If no nodes are marked as initially visible, show the first node
        if (initialNodes.size === 0) {
          const firstNode = graph.nodes()[0];
          if (firstNode) {
            initialNodes.add(firstNode);
          }
        }
        
        // Animate the initial nodes
        startNodeAnimation(initialNodes);
        setDiscoveredNodes(initialNodes);
      })
      .catch((err) => console.error("Failed to load story:", err));
  }, [startNodeAnimation]);

  // Handle node click - fetch content and show popup
  const handleNodeClick = useCallback(async (data: NodeClickData) => {
    // Show popup immediately with loading state
    setPopup({
      nodeId: data.id,
      label: data.label,
      content: null,
      loading: true,
      error: null,
    });

    // Fetch the content
    try {
      const response = await fetch(`${PATHS.itemsBase}${data.contentRef}`);
      if (!response.ok) {
        throw new Error(`Failed to load content: ${response.status}`);
      }
      const content: ItemContent = await response.json();
      
      setPopup((prev) => prev ? {
        ...prev,
        content,
        loading: false,
      } : null);
    } catch (err) {
      setPopup((prev) => prev ? {
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load content",
      } : null);
    }
  }, []);

  // Handle popup close - reveal connected nodes
  const handleClosePopup = useCallback(() => {
    if (popup && fullGraph) {
      const newDiscovered = new Set(discoveredNodes);
      const newNodes = new Set<string>();
      
      // Reveal all nodes connected by outgoing edges from the clicked node
      fullGraph.forEachOutNeighbor(popup.nodeId, (neighborId) => {
        if (!discoveredNodes.has(neighborId)) {
          newNodes.add(neighborId);
        }
        newDiscovered.add(neighborId);
      });
      
      // Start animation BEFORE updating discovered nodes
      // This ensures animatingNodes is set when the new nodes first render
      if (newNodes.size > 0) {
        startNodeAnimation(newNodes);
      }
      setDiscoveredNodes(newDiscovered);
    }
    setPopup(null);
  }, [popup, fullGraph, discoveredNodes, startNodeAnimation]);

  // Sigma settings for dark theme
  const sigmaSettings = useMemo(
    () => ({
      defaultNodeColor: COLORS.defaultNodeColor,
      defaultEdgeColor: COLORS.defaultEdgeColor,
      labelColor: { color: COLORS.labelColor },
      labelFont: GRAPH.labelFont,
      labelSize: GRAPH.labelSize,
      labelWeight: GRAPH.labelWeight,
      renderEdgeLabels: false,
      enableEdgeEvents: false,
      // Prevent auto-rescaling when nodes are added/removed
      autoRescale: false,
      autoCenter: false,
    }),
    []
  );

  // Render content based on type
  const renderPopupContent = () => {
    if (!popup) return null;
    
    if (popup.loading) {
      return <div className="popup-loading">Reading...</div>;
    }
    
    if (popup.error) {
      return <div className="popup-error">{popup.error}</div>;
    }
    
    if (!popup.content) {
      return <div className="popup-error">No content available.</div>;
    }

    const { content } = popup;
    
    switch (content.type) {
      case "richtext":
        return (
          <div 
            className="popup-text popup-richtext"
            dangerouslySetInnerHTML={{ __html: content.contentHtml || "" }}
          />
        );
      case "markdown":
        return (
          <div className="popup-text popup-markdown">
            <Markdown remarkPlugins={[remarkBreaks]}>{content.content || ""}</Markdown>
          </div>
        );
      case "text":
      default:
        return <div className="popup-text">{content.content}</div>;
    }
  };

  return (
    <div className="story-container">
      <div 
        ref={containerRef} 
        className="story-sigma-wrapper"
        style={{ height: "calc(100vh - 150px)", width: "100%", position: "relative" }}
      >
        {!gexfData && (
          <div className="story-loading">
            <div className="loading-text">Awakening...</div>
          </div>
        )}
        {gexfData && containerReady && (
          <SigmaContainer
            className="story-sigma"
            style={{ height: "100%", width: "100%" }}
            settings={sigmaSettings}
          >
            <StoryGraphInner
              gexfData={gexfData}
              discoveredNodes={discoveredNodes}
              onNodeClick={handleNodeClick}
              isFirstLoad={isFirstLoad}
              onFirstLoadComplete={handleFirstLoadComplete}
              animatingNodes={animatingNodes}
              animationProgress={animationProgress}
            />
          </SigmaContainer>
        )}
        {/* Invisible overlay to block mouse events during animation */}
        {animatingNodes.size > 0 && (
          <div className="animation-blocker" />
        )}
      </div>

      {popup && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="popup-title">{popup.content?.title || popup.label}</h2>
            {renderPopupContent()}
            {!popup.loading && (
              <button className="popup-close" onClick={handleClosePopup}>
                Continue
              </button>
            )}
          </div>
        </div>
      )}

      <div className="story-hint">
        Click a node to reveal its secrets
      </div>
    </div>
  );
};
