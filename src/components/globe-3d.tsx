"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphData, GraphNode } from "@/lib/wiki-shared";
import { useWikiConfig } from "@/client/wiki-config";
import { Link, useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface GlobeProps {
  graphData: GraphData;
}

interface NodeData {
  mesh: THREE.Mesh;
  data: {
    slug: string;
    title: string;
    categories: string[];
    backlinkCount: number;
    wordCount: number;
    summary?: string;
  };
  label?: THREE.Sprite;
}

/* ── Search ── */

function GlobeSearch({
  graphData,
  onSelect,
}: {
  graphData: GraphData;
  onSelect: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ slug: string; label: string }[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matched: { slug: string; label: string }[] = [];
    graphData.nodes?.forEach((node) => {
      if (node.title?.toLowerCase().includes(q)) {
        matched.push({ slug: node.slug, label: node.title });
      }
    });
    matched.sort((a, b) => a.label.localeCompare(b.label));
    setResults(matched.slice(0, 8));
  }, [query, graphData.nodes]);

  const handleSelect = (slug: string) => {
    onSelect(slug);
    setQuery("");
    setResults([]);
  };

  return (
    <div
      className="absolute left-4 right-4 z-10 sm:right-auto sm:w-64"
      style={{ top: "calc(env(safe-area-inset-top) + 4.75rem)" }}
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a concept..."
        className="surface w-full rounded-full px-4 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
      />
      {results.length > 0 && (
        <div className="surface-raised mt-2 overflow-hidden rounded-2xl">
          {results.map((r) => (
            <button
              key={r.slug}
              type="button"
              onClick={() => handleSelect(r.slug)}
              className="block w-full px-4 py-2 text-left text-sm font-display text-[var(--foreground)] transition-colors hover:bg-[var(--teal-soft)]/50"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Globe({ graphData }: GlobeProps) {
  const config = useWikiConfig();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const nodesRef = useRef<NodeData[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    node: NodeData["data"] | null;
    position: { x: number; y: number };
  }>({ node: null, position: { x: 0, y: 0 } });

  // Build a lookup map for node data
  const nodeMap = useRef(new Map<string, NodeData>());
  useEffect(() => {
    const map = new Map<string, NodeData>();
    nodesRef.current.forEach(nodeData => {
      map.set(nodeData.data.slug, nodeData);
    });
    nodeMap.current = map;
  }, [nodesRef.current.length]);

  const handleSearchSelect = useCallback((slug: string) => {
    const nodeData = nodeMap.current.get(slug);
    if (nodeData && cameraRef.current) {
      // Move camera to focus on the selected node
      const targetPosition = nodeData.mesh.position.clone();
      const distance = 12;
      const direction = targetPosition.clone().normalize();
      const newPosition = targetPosition.clone().add(direction.multiplyScalar(distance));

      // Animate camera position
      const startPosition = cameraRef.current.position.clone();
      const startTime = Date.now();
      const duration = 500;

      const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        cameraRef.current!.position.lerpVectors(startPosition, newPosition, eased);
        cameraRef.current!.lookAt(targetPosition);

        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        }
      };

      animateCamera();
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xfaf7f3); // Main theme background
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 20;
      camera.position.y = 5;
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 0.5;
      controls.enableZoom = true;
      controls.minDistance = 8;
      controls.maxDistance = 40;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0xffffff, 1);
      pointLight.position.set(10, 10, 10);
      scene.add(pointLight);

      const pointLight2 = new THREE.PointLight(0x6366f1, 0.8); // Teal light
      pointLight2.position.set(-10, -10, 10);
      scene.add(pointLight2);

      // Create sphere (globe surface) - hidden wireframe
      const globeGeometry = new THREE.SphereGeometry(8, 64, 64);
      const globeMaterial = new THREE.MeshPhongMaterial({
        color: 0xe8e4de, // Light beige matching theme
        transparent: true,
        opacity: 0, // Hidden
        wireframe: false,
        visible: false, // Completely hide the sphere
      });
      const globe = new THREE.Mesh(globeGeometry, globeMaterial);
      scene.add(globe);

      // Add subtle atmosphere glow (faint outline)
      const atmosphereGeometry = new THREE.SphereGeometry(8.2, 64, 64);
      const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x85b9c9, // Teal from theme
        transparent: true,
        opacity: 0.03, // Very subtle
        side: THREE.BackSide,
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      scene.add(atmosphere);

      // Create nodes on sphere surface
      const nodes: NodeData[] = [];
      nodesRef.current = nodes;

      // Create a mapping from slug to node index
      const slugToIndex = new Map<string, number>();

      if (graphData.nodes && graphData.nodes.length > 0) {
        graphData.nodes.forEach((nodeData, index) => {
          // Store the mapping
          slugToIndex.set(nodeData.slug, index);
          // Generate spherical coordinates
          const phi = Math.acos(-1 + (2 * index) / graphData.nodes.length);
          const theta = Math.sqrt(graphData.nodes.length * Math.PI) * phi;

          const x = 8 * Math.cos(theta) * Math.sin(phi);
          const y = 8 * Math.sin(theta) * Math.sin(phi);
          const z = 8 * Math.cos(phi);

          // Color based on page type/category - using theme colors
          const colors = [
            0x85b9c9, // Teal (main theme)
            0xf4b183, // Peach (from theme)
            0xc4a7e7, // Lavender (from theme)
            0x6b6673, // Muted foreground
          ];
          const color = colors[index % colors.length];

          // Node size based on connections
          const nodeSize = Math.max(0.15, Math.min(0.4, (nodeData.backlinkCount || 0) * 0.05 + 0.15));

          const nodeGeometry = new THREE.SphereGeometry(nodeSize, 16, 16);
          const nodeMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 100,
          });
          const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
          node.position.set(x, y, z);

          // Store node data for tooltips
          const nodeDataEntry: NodeData = {
            mesh: node,
            data: {
              slug: nodeData.slug,
              title: nodeData.title,
              categories: nodeData.categories || [],
              backlinkCount: nodeData.backlinkCount || 0,
              wordCount: nodeData.wordCount || 0,
              summary: nodeData.summary,
            },
          };

          // Create text label for this node
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const fontSize = 28;
          const padding = 8;
          const title = nodeData.title;

          if (ctx) {
            canvas.width = 512;
            canvas.height = 64;

            // Transparent background - no fill
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dark text
            ctx.font = `${fontSize}px Urbanist, sans-serif`;
            ctx.fillStyle = '#15131a'; // Dark text from theme
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(title, canvas.width / 2, canvas.height / 2);
          }

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0, // Hidden by default
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.set(x, y + 0.8, z); // Position above node
          sprite.scale.set(4, 0.5, 1); // Scale sprite
          scene.add(sprite);

          nodeDataEntry.label = sprite;
          nodes.push(nodeDataEntry);

          // Add glow effect
          const glowGeometry = new THREE.SphereGeometry(nodeSize * 1.5, 16, 16);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2,
          });
          const glow = new THREE.Mesh(glowGeometry, glowMaterial);
          scene.add(glow);

          scene.add(node);
        });

        // Create edges between connected nodes - more visible
        if (graphData.edges && graphData.edges.length > 0) {
          graphData.edges.forEach((edgeData) => {
            // Use slug mapping to find node indices
            const sourceIndex = slugToIndex.get(edgeData.source);
            const targetIndex = slugToIndex.get(edgeData.target);

            if (sourceIndex !== undefined && targetIndex !== undefined) {
              const sourceNode = nodes[sourceIndex];
              const targetNode = nodes[targetIndex];

              if (sourceNode && targetNode) {
                const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
                  sourceNode.mesh.position,
                  targetNode.mesh.position,
                ]);

                // Make edges much more visible
                const edgeMaterial = new THREE.LineBasicMaterial({
                  color: 0xcccccc, // Light gray
                  transparent: true,
                  opacity: 0.8, // Much more visible
                  linewidth: 2,
                });
                const edge = new THREE.Line(edgeGeometry, edgeMaterial);
                scene.add(edge);

                // Add stronger glow effect
                const glowGeometry = new THREE.BufferGeometry().setFromPoints([
                  sourceNode.mesh.position,
                  targetNode.mesh.position,
                ]);
                const glowMaterial = new THREE.LineBasicMaterial({
                  color: 0x85b9c9, // Teal glow
                  transparent: true,
                  opacity: 0.4, // More visible
                  linewidth: 3,
                });
                const glowEdge = new THREE.Line(glowGeometry, glowMaterial);
                scene.add(glowEdge);
              }
            }
          });
        }
      }

      // Add subtle background decoration (replacing starfield for theme)
      const dotsGeometry = new THREE.BufferGeometry();
      const dotPositions = [];
      for (let i = 0; i < 500; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        dotPositions.push(x, y, z);
      }
      dotsGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(dotPositions, 3)
      );
      const dotsMaterial = new THREE.PointsMaterial({
        color: 0xc4c0cc, // Muted color from theme
        size: 0.15,
        transparent: true,
        opacity: 0.4,
      });
      const dots = new THREE.Points(dotsGeometry, dotsMaterial);
      scene.add(dots);

      setIsLoading(false);

      // Mouse interaction handler
      const handleMouseMove = (event: MouseEvent) => {
        if (!containerRef.current || !cameraRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast for node detection
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const nodeMeshes = nodes.map(n => n.mesh);
        const intersects = raycasterRef.current.intersectObjects(nodeMeshes);

        if (intersects.length > 0) {
          const intersectedMesh = intersects[0].object as THREE.Mesh;
          const nodeData = nodes.find(n => n.mesh === intersectedMesh);
          if (nodeData) {
            setTooltip({
              node: nodeData.data,
              position: {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
              },
            });
            containerRef.current.style.cursor = 'pointer';
          }
        } else {
          setTooltip(prev => ({ ...prev, node: null }));
          if (containerRef.current) {
            containerRef.current.style.cursor = 'default';
          }
        }
      };

      if (containerRef.current) {
        containerRef.current.addEventListener('mousemove', handleMouseMove);
      }

      // Animation loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);

        // Auto-rotate
        if (scene) {
          scene.rotation.y += 0.001;
        }

        // Check camera distance for label visibility
        if (cameraRef.current) {
          const cameraDistance = cameraRef.current.position.distanceTo(scene.position);
          const zoomThreshold = 15; // Show labels when zoomed in closer than this

          nodes.forEach(nodeData => {
            if (nodeData.label) {
              // Calculate distance from camera to this node
              const nodeDistance = cameraRef.current!.position.distanceTo(nodeData.mesh.position);

              // Show labels when zoomed in and node is close enough
              const shouldShow = nodeDistance < zoomThreshold;
              nodeData.label.material.opacity = THREE.MathUtils.lerp(
                nodeData.label.material.opacity,
                shouldShow ? 1 : 0,
                0.1 // Smooth transition
              );
            }
          });
        }

        controls.update();
        renderer.render(scene, camera);
      };

      animate();

      // Handle resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('mousemove', handleMouseMove);
        }
        window.removeEventListener("resize", handleResize);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (rendererRef.current) {
          rendererRef.current.dispose();
          if (containerRef.current) {
            containerRef.current.removeChild(rendererRef.current.domElement);
          }
        }
        if (sceneRef.current) {
          // Dispose all objects
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              if (Array.isArray(object.material)) {
                object.material.forEach((m) => m.dispose());
              } else {
                object.material.dispose();
              }
            }
            if (object instanceof THREE.Sprite) {
              if (object.material.map) {
                object.material.map.dispose();
              }
              object.material.dispose();
            }
          });
        }
      };
    } catch (err) {
      console.error("Error initializing 3D globe:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize 3D visualization"
      );
      setIsLoading(false);
    }
  }, [graphData]);

  return (
    <div className="fixed inset-0" style={{ background: "#faf7f3" }}>
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-2 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:gap-3 sm:px-6 sm:pb-4 sm:pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <Link to="/" className="font-display text-lg text-[var(--foreground)] sm:text-xl">
          {config.siteTitle}
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <span className="surface hidden items-center gap-2 rounded-full px-3.5 py-2 text-xs text-[var(--muted-foreground)] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--lavender)]" />
            <span className="font-semibold tabular-nums text-[var(--foreground)]">
              {graphData.nodes?.length || 0}
            </span>
            <span>{config.navigation.conceptsLabel}</span>
            <span>·</span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">
              {graphData.edges?.length || 0}
            </span>
            <span>{config.navigation.connectionsLabel}</span>
          </span>
          <Link
            to="/"
            className="surface rounded-full px-3.5 py-2 text-sm font-medium text-[var(--foreground)] transition-[transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] sm:px-4"
          >
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">{config.navigation.backToWikiLabel}</span>
          </Link>
        </div>
      </header>

      {/* Search */}
      <GlobeSearch graphData={graphData} onSelect={handleSearchSelect} />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]">
            <div className="surface-raised rounded-2xl p-8 text-center max-w-md">
              <div className="text-6xl mb-4">🌐</div>
              <h2 className="font-display text-2xl text-[var(--foreground)] mb-2">
                Visualization Error
              </h2>
              <p className="text-[var(--muted-foreground)] mb-6">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-full bg-[var(--foreground)] text-[var(--background)] px-6 py-3 font-medium transition-opacity duration-200 hover:opacity-90"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}

        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]">
            <div className="text-center">
              <div className="text-6xl animate-bounce mb-4">🌐</div>
              <p className="text-[var(--muted-foreground)]">
                Loading 3D visualization...
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && graphData.nodes?.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]">
            <div className="surface-raised rounded-2xl p-8 text-center max-w-md">
              <div className="text-6xl mb-4">🌐</div>
              <h2 className="font-display text-2xl text-[var(--foreground)] mb-2">
                No Data Available
              </h2>
              <p className="text-[var(--muted-foreground)] mb-6">
                No wiki pages found to visualize. Add some content to your wiki first!
              </p>
            </div>
          </div>
        )}

        {/* Tooltip */}
        {tooltip.node && (
          <div
            className="surface-raised pointer-events-none absolute z-20 max-w-xs rounded-2xl px-4 py-2.5"
            style={{ left: tooltip.position.x + 14, top: tooltip.position.y - 12 }}
          >
            <p className="font-display text-[0.95rem] text-[var(--foreground)]">{tooltip.node.title}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[0.7rem] font-medium text-[var(--muted-foreground)]">
              <span>{tooltip.node.backlinkCount} connections</span>
              <span>·</span>
              <span>{tooltip.node.wordCount} words</span>
            </div>
            {tooltip.node.categories.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" style={{ boxShadow: `0 0 8px #85b9c980` }} />
                <span className="text-[0.7rem] font-semibold text-[var(--muted-foreground)]">
                  {tooltip.node.categories.join(", ")}
                </span>
              </div>
            )}
            {tooltip.node.summary && (
              <p className="mt-2 line-clamp-2 text-[0.7rem] leading-relaxed text-[var(--muted-foreground)]">
                {tooltip.node.summary}
              </p>
            )}
          </div>
        )}

        <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
