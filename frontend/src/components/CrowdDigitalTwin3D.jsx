import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCw, Eye, Box, RefreshCw, ZoomIn, ZoomOut, Play, Pause, 
  ShieldAlert, Activity, ArrowRight, Layers, HelpCircle
} from 'lucide-react';

export default function CrowdDigitalTwin3D({ 
  zonesData = [], 
  simulationResult = null, 
  selectedZoneId = null, 
  onSelectZone = null 
}) {
  const mountRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [activeZoneHover, setActiveZoneHover] = useState(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const groupRef = useRef(null);
  const reqIdRef = useRef(null);
  const particlesRef = useRef([]);

  // Map zone risk to THREE colors
  const getRiskColorHex = (risk) => {
    switch (String(risk).toLowerCase()) {
      case 'low': return 0x10b981;       // Green
      case 'medium':
      case 'moderate': return 0xf59e0b;  // Amber/Yellow
      case 'high': return 0xf97316;      // Orange
      case 'critical': return 0xef4444;  // Red
      default: return 0x3b82f6;          // Blue
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Initialize Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c16);
    scene.fog = new THREE.FogExp2(0x0a0c16, 0.015);
    sceneRef.current = scene;

    // 2. Initialize Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 45, 65);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Initialize Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(30, 50, 30);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa855f7, 1.5, 100);
    pointLight.position.set(-20, 20, -20);
    scene.add(pointLight);

    // 5. Build Floor & Ground Grid
    const gridHelper = new THREE.GridHelper(100, 40, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // Main Group for zones & animations
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    groupRef.current = mainGroup;

    // 6. Build 3D Zones Platform
    // Preset spatial layout for Bada Danda operational sections
    const defaultZoneLayouts = [
      { id: 'ZONE-BADA-A', name: 'Zone A - Entry Section', posX: -24, posZ: 0, sizeX: 18, sizeZ: 14 },
      { id: 'ZONE-BADA-B', name: 'Zone B - Central Section', posX: 0, posZ: 0, sizeX: 20, sizeZ: 16 },
      { id: 'ZONE-BADA-C', name: 'Zone C - Exit Section', posX: 24, posZ: 0, sizeX: 18, sizeZ: 14 },
    ];

    // Combine loaded backend zones with preset 3D coordinates
    const zonesToRender = (zonesData.length > 0 ? zonesData : defaultZoneLayouts).map((z, idx) => {
      const preset = defaultZoneLayouts[idx % defaultZoneLayouts.length];
      const simMatch = simulationResult?.simulated_zones?.[String(z.id)];

      return {
        id: z.id || preset.id,
        code: z.code || preset.id,
        name: z.name || preset.name,
        posX: preset.posX,
        posZ: preset.posZ,
        sizeX: preset.sizeX,
        sizeZ: preset.sizeZ,
        capacity: z.capacity_limit || z.capacity || 5000,
        current_crowd: z.current_occupancy || z.current_crowd || 2000,
        occupancy_pct: simMatch ? simMatch.simulated_occ_pct : (z.occupancy_percentage || Math.round((((z.current_occupancy || 2000) / (z.capacity_limit || 5000)) * 100) * 10) / 10),
        risk: simMatch ? simMatch.simulated_risk : (z.risk_level || 'low'),
        is_simulated: !!simMatch
      };
    });

    // Create 3D Zone Mesh Elements
    const zoneMeshes = [];
    zonesToRender.forEach((z) => {
      const colorHex = getRiskColorHex(z.risk);
      const isSelected = selectedZoneId && (selectedZoneId === z.id || selectedZoneId === z.code);

      // Base Platform Geometry
      const geom = new THREE.BoxGeometry(z.sizeX, 2, z.sizeZ);
      const mat = new THREE.MeshPhongMaterial({
        color: colorHex,
        transparent: true,
        opacity: isSelected ? 0.85 : 0.45,
        wireframe: false,
        shininess: 80
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(z.posX, 1, z.posZ);
      mesh.userData = { zone: z };
      mainGroup.add(mesh);
      zoneMeshes.push(mesh);

      // Outer Wireframe Glow Box
      const wireGeom = new THREE.BoxGeometry(z.sizeX + 0.4, 2.4, z.sizeZ + 0.4);
      const wireMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x06b6d4 : colorHex,
        wireframe: true,
        transparent: true,
        opacity: 0.8
      });
      const wireMesh = new THREE.Mesh(wireGeom, wireMat);
      wireMesh.position.set(z.posX, 1.1, z.posZ);
      mainGroup.add(wireMesh);

      // Entry/Exit Gate Markers
      const gateGeom = new THREE.CylinderGeometry(0.6, 0.6, 3, 16);
      const gateMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      
      const gateLeft = new THREE.Mesh(gateGeom, gateMat);
      gateLeft.position.set(z.posX - z.sizeX / 2 + 0.5, 2.5, z.posZ);
      mainGroup.add(gateLeft);

      const gateRight = new THREE.Mesh(gateGeom, gateMat);
      gateRight.position.set(z.posX + z.sizeX / 2 - 0.5, 2.5, z.posZ);
      mainGroup.add(gateRight);
    });

    // 7. Draw Connection Lines & Elevated Redirection Arcs between Zones (Zone A -> Zone B -> Zone C)
    for (let i = 0; i < zonesToRender.length - 1; i++) {
      const z1 = zonesToRender[i];
      const z2 = zonesToRender[i + 1];

      const startVec = new THREE.Vector3(z1.posX + z1.sizeX / 2, 1.5, z1.posZ);
      const endVec = new THREE.Vector3(z2.posX - z2.sizeX / 2, 1.5, z2.posZ);

      // Base Dashed Connection Line
      const lineGeom = new THREE.BufferGeometry().setFromPoints([startVec, endVec]);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 1,
        gapSize: 0.5,
        linewidth: 2
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.computeLineDistances();
      mainGroup.add(line);

      // Elevated Redirection Flow Arc (Visualizing "Where Crowd Goes")
      const midVec = new THREE.Vector3(
        (startVec.x + endVec.x) / 2,
        6.0,
        (startVec.z + endVec.z) / 2
      );
      const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
      const arcGeom = new THREE.TubeGeometry(curve, 20, 0.25, 8, false);
      const arcMat = new THREE.MeshBasicMaterial({
        color: simulationResult ? 0x06b6d4 : 0xa855f7,
        transparent: true,
        opacity: 0.75
      });
      const arcMesh = new THREE.Mesh(arcGeom, arcMat);
      mainGroup.add(arcMesh);

      // 3D Directional Flow Arrow Cones (pointing from Z1 -> Z2)
      const arrowGeom = new THREE.ConeGeometry(0.8, 2.2, 12);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
      arrowMesh.position.set((startVec.x + endVec.x) / 2, 1.5, z1.posZ);
      arrowMesh.rotation.z = -Math.PI / 2; // Point right (A -> B -> C)
      mainGroup.add(arrowMesh);
    }

    // 8. Anonymous Flow Particles (Simulated Crowd Flow Indicators)
    const particleList = [];
    const particleGeom = new THREE.SphereGeometry(0.35, 8, 8);

    // Generate 45 anonymous moving dots across zones with dynamic directional shift
    for (let i = 0; i < 45; i++) {
      const zTarget = zonesToRender[i % zonesToRender.length];
      const isRedirected = simulationResult && zTarget.id === 'ZONE-BADA-B';

      const pMat = new THREE.MeshBasicMaterial({ 
        color: isRedirected ? 0xf59e0b : 0x38bdf8, 
        transparent: true, 
        opacity: 0.9 
      });
      const pMesh = new THREE.Mesh(particleGeom, pMat);
      
      pMesh.position.set(
        zTarget.posX + (Math.random() - 0.5) * (zTarget.sizeX - 2),
        2.2,
        zTarget.posZ + (Math.random() - 0.5) * (zTarget.sizeZ - 2)
      );

      pMesh.userData = {
        originX: pMesh.position.x,
        targetZoneIdx: i % zonesToRender.length,
        speed: (0.06 + Math.random() * 0.08) * (simulationResult ? 1.5 : 1.0),
        dir: 1
      };

      mainGroup.add(pMesh);
      particleList.push(pMesh);
    }
    particlesRef.current = particleList;

    // 9. Animation Loop
    let angle = 0;
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      // Slow orbital rotation if enabled
      if (isRotating && mainGroup) {
        angle += 0.003;
        mainGroup.rotation.y = Math.sin(angle) * 0.15;
      }

      // Animate particle flow between zones
      if (showParticles && particlesRef.current) {
        particlesRef.current.forEach((p, idx) => {
          p.position.x += p.userData.speed * p.userData.dir;

          // Loop particles cleanly across Bada Danda corridor
          if (p.position.x > 32) {
            p.position.x = -32;
          } else if (p.position.x < -32) {
            p.position.x = 32;
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // 10. Mouse Drag Interaction for Manual Rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !mainGroup) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      mainGroup.rotation.y += deltaX * 0.005;
      mainGroup.rotation.x += deltaY * 0.005;

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [zonesData, simulationResult, selectedZoneId, isRotating, showParticles]);

  const handleZoomIn = () => {
    if (cameraRef.current) cameraRef.current.position.z -= 5;
  };

  const handleZoomOut = () => {
    if (cameraRef.current) cameraRef.current.position.z += 5;
  };

  const handleResetCamera = () => {
    if (cameraRef.current && groupRef.current) {
      cameraRef.current.position.set(0, 45, 65);
      cameraRef.current.lookAt(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
    }
  };

  const str = (v) => String(v);

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#0a0c16' }}>
      
      {/* Three.js Canvas Container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Top Banner Disclaimer */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '15px',
        background: 'rgba(10, 12, 22, 0.85)',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(10px)',
        padding: '8px 16px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.82rem',
        color: 'var(--text-primary)',
        zIndex: 10
      }}>
        <Box size={16} style={{ color: 'var(--accent-cyan)' }} />
        <div>
          <span style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>3D OPERATIONAL DIGITAL TWIN</span>
          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
            {simulationResult ? "⚡ What-If Simulation State Active" : "📍 Operational Monitoring Zones"}
          </span>
        </div>
      </div>

      {/* 3D Zone Overlay Cards */}
      <div style={{
        position: 'absolute',
        bottom: '15px',
        left: '15px',
        right: '15px',
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '5px',
        zIndex: 10
      }}>
        {(zonesData.length > 0 ? zonesData : [
          { id: 'ZONE-BADA-A', name: 'Zone A - Entry Section', occupancy_percentage: 47, risk_level: 'medium' },
          { id: 'ZONE-BADA-B', name: 'Zone B - Central Section', occupancy_percentage: 50, risk_level: 'medium' },
          { id: 'ZONE-BADA-C', name: 'Zone C - Exit Section', occupancy_percentage: 40, risk_level: 'low' }
        ]).map((z) => {
          const simMatch = simulationResult?.simulated_zones?.[String(z.id)];
          const occ = simMatch ? simMatch.simulated_occ_pct : (z.occupancy_percentage || Math.round((((z.current_occupancy || 2000)/(z.capacity_limit || 5000))*100) * 10) / 10);
          const risk = simMatch ? simMatch.simulated_risk : (z.risk_level || 'low');
          const isSelected = selectedZoneId && (selectedZoneId === z.id || selectedZoneId === z.code);

          return (
            <div
              key={z.id}
              onClick={() => onSelectZone && onSelectZone(z.id)}
              style={{
                flex: '1',
                minWidth: '200px',
                background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(15, 23, 42, 0.85)',
                border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{z.name}</span>
                <span className={`badge-risk risk-${risk.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                  {risk.toUpperCase()}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Occupancy:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{occ}%</strong>
              </div>

              {simMatch && (
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '4px' }}>
                  ⚡ Simulated Change: {simMatch.crowd_change >= 0 ? `+${simMatch.crowd_change}` : simMatch.crowd_change} persons
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top Right Controls Panel */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          onClick={() => setIsRotating(!isRotating)}
          style={{
            background: isRotating ? 'rgba(6, 182, 212, 0.2)' : 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          title={isRotating ? "Pause Auto-Rotation" : "Enable Auto-Rotation"}
        >
          {isRotating ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          onClick={() => setShowParticles(!showParticles)}
          style={{
            background: showParticles ? 'rgba(168, 85, 247, 0.2)' : 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          title={showParticles ? "Hide Crowd Flow Particles" : "Show Crowd Flow Particles"}
        >
          <Activity size={16} />
        </button>

        <button
          onClick={handleZoomIn}
          style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>

        <button
          onClick={handleZoomOut}
          style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={handleResetCamera}
          style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
          title="Reset Camera View"
        >
          <RefreshCw size={16} />
        </button>
      </div>

    </div>
  );
}
