import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Eye, Sun, Box, RefreshCw, ZoomIn, ZoomOut, Play, Pause, Compass, Info, Check, Shield } from 'lucide-react';

export default function Heritage3DViewer({ siteId = 'jagannath_temple', siteName = 'Shree Jagannath Temple' }) {
  const mountRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [lightMode, setLightMode] = useState('day'); // 'day', 'sunset', 'night', 'pbr'
  const [selectedComponent, setSelectedComponent] = useState('all'); // 'all', 'vimana', 'jagamohana', 'natamandira', 'bhogamandapa', 'nilachakra', 'arunstambha', 'simhadwara', 'vyaghradwara', 'hastidwara', 'ashwadwara'
  
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const groupRef = useRef(null);
  const reqIdRef = useRef(null);
  const materialsRef = useRef([]);
  const componentMeshesRef = useRef({});

  // Architectural info metadata for interactive click/select panel
  const componentInfo = {
    all: {
      title: "Shree Jagannath Temple Enclosed Sacred Complex",
      style: "Traditional Kalinga / Odisha Temple Architecture (12th Century CE)",
      axis: "East-West Axis Sequence with 4 Directional Gates",
      desc: "Comprehensive sacred complex enclosed by the massive Outer Meghanada Pacheri and Inner Kurma Bheda walls. Houses four main structures along the main axis and four directional gates (Lion, Tiger, Elephant, Horse).",
      highlights: ["65m Rekha Deula Vimana", "Pancharatha Segments", "Nila Chakra", "4 Directional Gates", "Aruna Stambha"]
    },
    vimana: {
      title: "1. Vimana / Bada Deula (Main Sanctum)",
      style: "Pancharatha Rekha Deula (Tall Curvilinear Spire Tower)",
      axis: "Western End (Sanctum Sanctorum)",
      desc: "The tallest and dominant 65m structure containing the Holy Trinity: Lord Jagannath, Lord Balabhadra, and Devi Subhadra. Features pancharatha vertical projections, soaring curvilinear shikhara, ribbed stone Amalaka disc, and golden Kalasha.",
      highlights: ["Pancharatha Wall Segments", "Curvilinear Shikhara Taper", "Crown Amalaka Disc", "Nila Chakra Apex"]
    },
    jagamohana: {
      title: "2. Jagamohana / Mukhasala (Assembly Hall)",
      style: "Pidha Deula (Stepped Pyramidal Roof Architecture)",
      axis: "Directly in front of Vimana",
      desc: "Large assembly hall where devotees gather for sacred view (Darshan). Features a characteristic stepped pyramidal roof composed of multi-tiered horizontal stone layers (Potalas) separated by recessed Kanthis.",
      highlights: ["Stepped Pidha Roof", "Carved Stone Cornices", "Tiered Potala Layers", "Crowing Kalasha"]
    },
    natamandira: {
      title: "3. Natamandira (Dance & Music Hall)",
      style: "Pillared Audience & Performance Hall",
      axis: "Center Corridor",
      desc: "Open pillared hall traditionally used for sacred dance (Mahari dance) and musical recitals for the pleasure of the deities. Features 16 monolithic stone pillars and carved platforms.",
      highlights: ["16 Monolithic Stone Pillars", "Carved Platform Base", "Polished Chlorite Detailing", "Traditional Roof Moldings"]
    },
    bhogamandapa: {
      title: "4. Bhogamandapa (Hall of Offering & Prasad)",
      style: "Broad Stepped Pyramidal Roof Hall",
      axis: "Eastern Outer Front",
      desc: "Outer hall where Mahaprasad food offerings are presented to the Lord. Features intricate stone relief carvings depicting divine motifs, mythical lions, and traditional Odisha floral bands.",
      highlights: ["Mahaprasad Offering Shrine", "Intricate Relief Friezes", "Broad Stepped Pyramids", "Sculpted Bas-reliefs"]
    },
    nilachakra: {
      title: "Nila Chakra & Sacred Patita Pavana Flag",
      style: "8-Spoked Sacred Blue-Metal Alloy Wheel",
      axis: "Top Apex of Vimana Spire (65m Height)",
      desc: "The iconic 8-spoked blue metal alloy wheel mounted on top of the main Vimana. Above it waves the sacred red Patita Pavana flag, changed daily by brave temple Chunara servitors.",
      highlights: ["Blue Metal Alloy Sheen", "8 Sacred Radial Spokes", "Daily Red Flag Hoisting", "Visible from Entire City"]
    },
    arunstambha: {
      title: "Monolithic Aruna Stambha (Sun Pillar)",
      style: "16-Sided Monolithic Chlorite Stone Pillar (11 Meters)",
      axis: "Outside Eastern Simha Dwara Gate",
      desc: "The magnificent 11-meter monolithic chlorite column originally brought from Konark Sun Temple. Features a 16-sided shaft topped with the capital of Aruna, the charioteer of Sun God Surya.",
      highlights: ["11-Meter Monolith", "16-Sided Chlorite Shaft", "Aruna Sun God Capital", "Konark Sun Heritage"]
    },
    simhadwara: {
      title: "Eastern Entrance — Singha Dwara (Lion Gate)",
      style: "Principal Eastern Gateway with Guardian Lion Sculptures",
      axis: "Eastern Boundary Wall Entrance",
      desc: "The primary and most prominent eastern entrance to the Jagannath Temple. Flanked by two grand crouching stone guardian lions (Singha) and stepped portal leading to Baisipahacha 22 sacred steps.",
      highlights: ["Guardian Lion Sculptures", "22 Sacred Steps Portal", "Meghanada Fortification", "Eastern Gateway Arches"]
    },
    vyaghradwara: {
      title: "Western Entrance — Vyaghra Dwara (Tiger Gate)",
      style: "Western Fortified Gateway with Tiger Sculptures",
      axis: "Western Boundary Wall Entrance",
      desc: "The western gate of the temple complex flanked by powerful stone tiger sculptures (Vyaghra). Traditionally used by saints, ascetics, and sadhus entering the sacred precinct.",
      highlights: ["Crouching Tiger Sculptures", "Western Fortified Arch", "Traditional Stone Carvings", "Meghanada Integration"]
    },
    hastidwara: {
      title: "Northern Entrance — Hasti Dwara (Elephant Gate)",
      style: "Northern Fortified Gateway with Elephant Sculptures",
      axis: "Northern Boundary Wall Entrance",
      desc: "The northern gate guarded by royal stone elephant sculptures (Hasti). Connects to the sacred Snana Bedi bathing pavilion and Anand Bazaar Mahaprasad courtyard.",
      highlights: ["Royal Elephant Sculptures", "Snana Bedi Corridor", "Northern Gateway Arches", "Anand Bazaar Access"]
    },
    ashwadwara: {
      title: "Southern Entrance — Ashwa Dwara (Horse Gate)",
      style: "Southern Fortified Gateway with Horse Sculptures",
      axis: "Southern Boundary Wall Entrance",
      desc: "The southern entrance flanked by galloping stone horse sculptures (Ashwa) mounted by warriors. Symbolizes royal martial heritage and leads to temple administrative kitchens.",
      highlights: ["Galloping Horse Sculptures", "Southern Gateway Arch", "Kitchen Corridor Access", "Traditional Odisha Stonework"]
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(
      lightMode === 'night' ? 0x090d16 : 
      lightMode === 'sunset' ? 0x1a0f2e : 
      lightMode === 'pbr' ? 0x070a12 : 0x0d1424
    );

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(22, 16, 32);
    camera.lookAt(0, 4, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = lightMode === 'night' ? 0.8 : 1.1;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Procedural Textures Generator (Sandstone & Weathered Stone)
    const createStoneTexture = (type) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      if (type === 'sandstone') {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
          const offset = (y / 32) % 2 === 0 ? 0 : 32;
          for (let x = offset; x < 256; x += 64) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
          }
        }
        for (let i = 0; i < 4000; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
          ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
      } else if (type === 'chlorite') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#475569';
        for (let i = 0; i < 3000; i++) {
          ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);
      return texture;
    };

    const sandstoneTex = createStoneTexture('sandstone');
    const chloriteTex = createStoneTexture('chlorite');

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(
      0xffffff, 
      lightMode === 'night' ? 0.35 : lightMode === 'sunset' ? 0.6 : 0.8
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      lightMode === 'sunset' ? 0xfb923c : lightMode === 'night' ? 0x38bdf8 : 0xfffbeb,
      lightMode === 'night' ? 0.7 : 1.4
    );
    dirLight.position.set(28, 38, 22);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 0.4);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    if (lightMode === 'night') {
      const spotLight = new THREE.SpotLight(0x38bdf8, 3, 60, Math.PI / 4, 0.5);
      spotLight.position.set(-10, 25, 20);
      spotLight.target.position.set(-8, 14, 0);
      scene.add(spotLight);
      scene.add(spotLight.target);
    }

    // 6. Main 3D Model Root Group
    const modelGroup = new THREE.Group();
    groupRef.current = modelGroup;
    scene.add(modelGroup);

    materialsRef.current = [];
    componentMeshesRef.current = {};

    const createMat = (color, roughness = 0.6, metalness = 0.1, map = null, emissive = 0x000000) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        map,
        emissive,
        emissiveIntensity: 0.2,
        wireframe
      });
      materialsRef.current.push(mat);
      return mat;
    };

    // 7. Base Courtyard & Foundation Plinth
    const groundGeo = new THREE.BoxGeometry(38, 1.2, 28);
    const groundMat = createMat(0x1e293b, 0.9, 0.1);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    modelGroup.add(ground);

    if (siteId === 'jagannath_temple') {
      // =========================================================================
      // --- REALISTIC SHREE JAGANNATH TEMPLE COMPLEX 3D MODEL (KALINGA STYLE) ---
      // =========================================================================

      // A. OUTER MEGHANADA PACHERI (FORTIFIED BOUNDARY WALL)
      const outerWallGroup = new THREE.Group();
      const wallMat = createMat(0xd97706, 0.7, 0.1, sandstoneTex);
      
      // North Wall (with Hasti Dwara Elephant Gate cutout)
      const wallN1 = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 1.2), wallMat);
      wallN1.position.set(-8, 1.6, -12);
      outerWallGroup.add(wallN1);

      const wallN2 = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 1.2), wallMat);
      wallN2.position.set(6, 1.6, -12);
      outerWallGroup.add(wallN2);

      // South Wall (with Ashwa Dwara Horse Gate cutout)
      const wallS1 = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 1.2), wallMat);
      wallS1.position.set(-8, 1.6, 12);
      outerWallGroup.add(wallS1);

      const wallS2 = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 1.2), wallMat);
      wallS2.position.set(6, 1.6, 12);
      outerWallGroup.add(wallS2);

      // West Wall (with Vyaghra Dwara Tiger Gate cutout)
      const wallW1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 10), wallMat);
      wallW1.position.set(-16.6, 1.6, 7.6);
      outerWallGroup.add(wallW1);

      const wallW2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 10), wallMat);
      wallW2.position.set(-16.6, 1.6, -7.6);
      outerWallGroup.add(wallW2);

      // East Wall (with Singha Dwara Lion Gate cutout)
      const wallE1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 10), wallMat);
      wallE1.position.set(14.6, 1.6, 7.6);
      outerWallGroup.add(wallE1);

      const wallE2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 10), wallMat);
      wallE2.position.set(14.6, 1.6, -7.6);
      outerWallGroup.add(wallE2);

      // Corner Watchtowers (Gumuta)
      [[-16.6, -12], [-16.6, 12], [14.6, -12], [14.6, 12]].forEach(([x, z]) => {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.5, 2.4), wallMat);
        tower.position.set(x, 2.25, z);
        outerWallGroup.add(tower);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2, 4), createMat(0xb45309));
        roof.position.set(x, 5.5, z);
        roof.rotation.y = Math.PI / 4;
        outerWallGroup.add(roof);
      });

      modelGroup.add(outerWallGroup);
      componentMeshesRef.current.outer_wall = outerWallGroup;

      // B. INNER KURMA BHEDA WALL
      const kurmaWallGroup = new THREE.Group();
      const kurmaMat = createMat(0xb45309, 0.8, 0.1);
      const kWallN = new THREE.Mesh(new THREE.BoxGeometry(26, 2.2, 0.8), kurmaMat);
      kWallN.position.set(-2, 1.1, -8.5);
      kurmaWallGroup.add(kWallN);

      const kWallS = new THREE.Mesh(new THREE.BoxGeometry(26, 2.2, 0.8), kurmaMat);
      kWallS.position.set(-2, 1.1, 8.5);
      kurmaWallGroup.add(kWallS);

      modelGroup.add(kurmaWallGroup);

      // =========================================================================
      // --- FOUR DIRECTIONAL TEMPLE GATES (DWARAS) WITH SCULPTURES ---
      // =========================================================================

      // 1. EAST GATE — SINGHA DWARA (LION GATE) & GUARDIAN LIONS
      const simhadwaraGroup = new THREE.Group();
      const gateArchE = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 4.5), createMat(0x92400e, 0.6, 0.1));
      gateArchE.position.set(14.6, 2.1, 0);
      simhadwaraGroup.add(gateArchE);

      const gateRoofE = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.5, 4), createMat(0xd97706));
      gateRoofE.position.set(14.6, 5.45, 0);
      gateRoofE.rotation.y = Math.PI / 4;
      simhadwaraGroup.add(gateRoofE);

      // Twin Crouching Guardian Lion Sculptures (Singha)
      [[-1.8, 0xef4444], [1.8, 0xef4444]].forEach(([zOffset]) => {
        const lionBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.8), createMat(0x78350f));
        lionBase.position.set(16.2, 0.4, zOffset);
        simhadwaraGroup.add(lionBase);

        const lionBody = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), createMat(0xf59e0b, 0.4, 0.3));
        lionBody.position.set(16.2, 1.0, zOffset);
        simhadwaraGroup.add(lionBody);
      });
      modelGroup.add(simhadwaraGroup);
      componentMeshesRef.current.simhadwara = simhadwaraGroup;

      // 2. WEST GATE — VYAGHRA DWARA (TIGER GATE) & GUARDIAN TIGERS
      const vyaghradwaraGroup = new THREE.Group();
      const gateArchW = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 4.5), createMat(0x92400e, 0.6, 0.1));
      gateArchW.position.set(-16.6, 2.1, 0);
      vyaghradwaraGroup.add(gateArchW);

      const gateRoofW = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.5, 4), createMat(0xd97706));
      gateRoofW.position.set(-16.6, 5.45, 0);
      gateRoofW.rotation.y = Math.PI / 4;
      vyaghradwaraGroup.add(gateRoofW);

      // Twin Crouching Guardian Tiger Sculptures (Vyaghra)
      [[-1.8], [1.8]].forEach(([zOffset]) => {
        const tigerBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.8), createMat(0x78350f));
        tigerBase.position.set(-18.2, 0.4, zOffset);
        vyaghradwaraGroup.add(tigerBase);

        const tigerBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.7), createMat(0xd97706, 0.4, 0.2));
        tigerBody.position.set(-18.2, 1.0, zOffset);
        vyaghradwaraGroup.add(tigerBody);
      });
      modelGroup.add(vyaghradwaraGroup);
      componentMeshesRef.current.vyaghradwara = vyaghradwaraGroup;

      // 3. NORTH GATE — HASTI DWARA (ELEPHANT GATE) & GUARDIAN ELEPHANTS
      const hastidwaraGroup = new THREE.Group();
      const gateArchN = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.2, 2.2), createMat(0x92400e, 0.6, 0.1));
      gateArchN.position.set(-1, 2.1, -12);
      hastidwaraGroup.add(gateArchN);

      const gateRoofN = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.5, 4), createMat(0xd97706));
      gateRoofN.position.set(-1, 5.45, -12);
      gateRoofN.rotation.y = Math.PI / 4;
      hastidwaraGroup.add(gateRoofN);

      // Twin Royal Elephant Sculptures (Hasti)
      [[-2.8], [0.8]].forEach(([xOffset]) => {
        const elephantBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.1), createMat(0x334155));
        elephantBase.position.set(xOffset, 0.4, -13.5);
        hastidwaraGroup.add(elephantBase);

        const elephantBody = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), createMat(0x475569, 0.5, 0.2));
        elephantBody.position.set(xOffset, 1.1, -13.5);
        hastidwaraGroup.add(elephantBody);
      });
      modelGroup.add(hastidwaraGroup);
      componentMeshesRef.current.hastidwara = hastidwaraGroup;

      // 4. SOUTH GATE — ASHWA DWARA (HORSE GATE) & GUARDIAN HORSES
      const ashwadwaraGroup = new THREE.Group();
      const gateArchS = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.2, 2.2), createMat(0x92400e, 0.6, 0.1));
      gateArchS.position.set(-1, 2.1, 12);
      ashwadwaraGroup.add(gateArchS);

      const gateRoofS = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.5, 4), createMat(0xd97706));
      gateRoofS.position.set(-1, 5.45, 12);
      gateRoofS.rotation.y = Math.PI / 4;
      ashwadwaraGroup.add(gateRoofS);

      // Twin Galloping Horse Sculptures (Ashwa)
      [[-2.8], [0.8]].forEach(([xOffset]) => {
        const horseBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.1), createMat(0x78350f));
        horseBase.position.set(xOffset, 0.4, 13.5);
        ashwadwaraGroup.add(horseBase);

        const horseBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.1, 12), createMat(0x92400e, 0.4, 0.2));
        horseBody.position.set(xOffset, 1.1, 13.5);
        ashwadwaraGroup.add(horseBody);
      });
      modelGroup.add(ashwadwaraGroup);
      componentMeshesRef.current.ashwadwara = ashwadwaraGroup;

      // =========================================================================
      // --- MAIN FOUR AXIAL STRUCTURES (WEST TO EAST SEQUENCE) ---
      // =========================================================================

      // -------------------------------------------------------------------------
      // 1. VIMANA / BADA DEULA (Pancharatha Rekha Deula - 65m Main Sanctum)
      // -------------------------------------------------------------------------
      const vimanaGroup = new THREE.Group();

      const vBase1 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.5, 7.5), createMat(0xd97706, 0.6, 0.1, sandstoneTex));
      vBase1.position.set(-10, 1.25, 0);
      vBase1.castShadow = true;
      vimanaGroup.add(vBase1);

      const vBase2 = new THREE.Mesh(new THREE.BoxGeometry(6.8, 4, 6.8), createMat(0xb45309, 0.6, 0.1, sandstoneTex));
      vBase2.position.set(-10, 4.5, 0);
      vBase2.castShadow = true;
      vimanaGroup.add(vBase2);

      const shikharaHeights = [
        { w: 6.2, h: 2.2, y: 7.6 },
        { w: 5.6, h: 2.2, y: 9.8 },
        { w: 5.0, h: 2.0, y: 11.9 },
        { w: 4.3, h: 2.0, y: 13.9 },
        { w: 3.6, h: 1.8, y: 15.8 },
        { w: 2.8, h: 1.6, y: 17.5 },
        { w: 2.0, h: 1.4, y: 19.0 }
      ];

      shikharaHeights.forEach(layer => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(layer.w, layer.h, layer.w),
          createMat(0xd97706, 0.5, 0.1, sandstoneTex)
        );
        mesh.position.set(-10, layer.y, 0);
        mesh.castShadow = true;
        vimanaGroup.add(mesh);
      });

      const amalakaGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.9, 16);
      const amalakaMat = createMat(0x92400e, 0.4, 0.2);
      const amalaka = new THREE.Mesh(amalakaGeo, amalakaMat);
      amalaka.position.set(-10, 20.15, 0);
      amalaka.castShadow = true;
      vimanaGroup.add(amalaka);

      const kalasha = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 16), createMat(0xfacc15, 0.2, 0.8));
      kalasha.position.set(-10, 21.4, 0);
      vimanaGroup.add(kalasha);

      // NILA CHAKRA & PATITA PAVANA FLAG
      const nilaChakraGroup = new THREE.Group();
      const wheelGeo = new THREE.TorusGeometry(1.05, 0.18, 16, 32);
      const wheelMat = createMat(
        selectedComponent === 'nilachakra' ? 0x60a5fa : 0x1d4ed8, 
        0.2, 
        0.9, 
        null, 
        selectedComponent === 'nilachakra' ? 0x2563eb : 0x000000
      );
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.y = Math.PI / 4;
      nilaChakraGroup.add(wheel);

      for (let i = 0; i < 8; i++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8), wheelMat);
        spoke.rotation.z = (i * Math.PI) / 4;
        nilaChakraGroup.add(spoke);
      }

      const flagStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), createMat(0xfacc15, 0.2, 0.9));
      flagStaff.position.set(0, 1.2, 0);
      nilaChakraGroup.add(flagStaff);

      const flagGeo = new THREE.ConeGeometry(0.65, 1.8, 3);
      const flagMat = createMat(0xef4444, 0.3, 0.1);
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0, 2.2, 0);
      flag.rotation.z = -Math.PI / 2;
      nilaChakraGroup.add(flag);

      nilaChakraGroup.position.set(-10, 22.8, 0);
      vimanaGroup.add(nilaChakraGroup);
      componentMeshesRef.current.nilachakra = nilaChakraGroup;

      modelGroup.add(vimanaGroup);
      componentMeshesRef.current.vimana = vimanaGroup;

      // -------------------------------------------------------------------------
      // 2. JAGAMOHANA / MUKHASALA (Pidha Deula Assembly Hall)
      // -------------------------------------------------------------------------
      const jagamohanaGroup = new THREE.Group();
      const jBase = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4.2, 5.8), createMat(0xb45309, 0.6, 0.1, sandstoneTex));
      jagamohanaGroup.position.set(-3.5, 4.6, 0);
      jBase.castShadow = true;
      jagamohanaGroup.add(jBase);

      const pidhaTiers = [
        { w: 5.4, h: 1.2, y: 2.7 },
        { w: 4.4, h: 1.2, y: 3.9 },
        { w: 3.4, h: 1.2, y: 5.1 },
        { w: 2.4, h: 1.0, y: 6.2 }
      ];

      pidhaTiers.forEach(p => {
        const pidha = new THREE.Mesh(new THREE.ConeGeometry(p.w, p.h, 4), createMat(0xd97706, 0.6, 0.1, sandstoneTex));
        pidha.position.set(0, p.y, 0);
        pidha.rotation.y = Math.PI / 4;
        pidha.castShadow = true;
        jagamohanaGroup.add(pidha);
      });

      const jKalasha = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), createMat(0xfacc15, 0.2, 0.8));
      jKalasha.position.set(0, 7.3, 0);
      jagamohanaGroup.add(jKalasha);

      modelGroup.add(jagamohanaGroup);
      componentMeshesRef.current.jagamohana = jagamohanaGroup;

      // -------------------------------------------------------------------------
      // 3. NATAMANDIRA (Pillared Dance & Music Hall)
      // -------------------------------------------------------------------------
      const natamandiraGroup = new THREE.Group();
      const nBase = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.0, 5.2), createMat(0x92400e, 0.7, 0.1));
      natamandiraGroup.position.set(2.5, 3.5, 0);
      natamandiraGroup.add(nBase);

      for (let x = -2; x <= 2; x += 1.3) {
        for (let z = -2; z <= 2; z += 1.3) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.5, 12), createMat(0x475569, 0.4, 0.3, chloriteTex));
          col.position.set(x, 2.25, z);
          natamandiraGroup.add(col);
        }
      }

      const nRoof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.4, 5.4), createMat(0xb45309, 0.6, 0.1));
      nRoof.position.set(0, 4.2, 0);
      natamandiraGroup.add(nRoof);

      modelGroup.add(natamandiraGroup);
      componentMeshesRef.current.natamandira = natamandiraGroup;

      // -------------------------------------------------------------------------
      // 4. BHOGAMANDAPA (Hall for Food Offerings & Mahaprasad)
      // -------------------------------------------------------------------------
      const bhogamandapaGroup = new THREE.Group();
      const bBase = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.5, 4.8), createMat(0xd97706, 0.6, 0.1, sandstoneTex));
      bhogamandapaGroup.position.set(8.2, 4.25, 0);
      bhogamandapaGroup.add(bBase);

      const bRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 3.6, 4), createMat(0xb45309, 0.6, 0.1));
      bRoof.position.set(0, 3.55, 0);
      bRoof.rotation.y = Math.PI / 4;
      bhogamandapaGroup.add(bRoof);

      const bKalasha = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), createMat(0xfacc15, 0.2, 0.8));
      bKalasha.position.set(0, 5.8, 0);
      bhogamandapaGroup.add(bKalasha);

      modelGroup.add(bhogamandapaGroup);
      componentMeshesRef.current.bhogamandapa = bhogamandapaGroup;

      // -------------------------------------------------------------------------
      // 5. MONOLITHIC ARUNA STAMBHA (11-Meter Sun Pillar outside Lion Gate)
      // -------------------------------------------------------------------------
      const arunaGroup = new THREE.Group();
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.0, 16), createMat(0x334155, 0.4, 0.6, chloriteTex));
      pedestal.position.set(17.8, 0.5, 0);
      arunaGroup.add(pedestal);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 9.2, 16), createMat(0x475569, 0.3, 0.7, chloriteTex));
      shaft.position.set(17.8, 5.6, 0);
      shaft.castShadow = true;
      arunaGroup.add(shaft);

      const capitalBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.6, 16), createMat(0xfacc15, 0.2, 0.8));
      capitalBase.position.set(17.8, 10.5, 0);
      arunaGroup.add(capitalBase);

      const arunaStatue = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), createMat(0xfbbf24, 0.2, 0.9));
      arunaStatue.position.set(17.8, 11.0, 0);
      arunaGroup.add(arunaStatue);

      modelGroup.add(arunaGroup);
      componentMeshesRef.current.arunstambha = arunaGroup;

      // Courtyard Subsidiary Shrines (Vimala & Lakshmi Shrines)
      [[-8, -5], [-8, 5], [4, -5], [4, 5]].forEach(([sx, sz]) => {
        const shrine = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 4), createMat(0xd97706));
        shrine.position.set(sx, 2.2, sz);
        shrine.rotation.y = Math.PI / 4;
        modelGroup.add(shrine);
      });

    } else if (siteId === 'konark_temple') {
      // Konark Sun Temple 3D Model
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 12), createMat(0xd97706));
      plinth.position.y = 1;
      modelGroup.add(plinth);

      const jagamohana = new THREE.Mesh(new THREE.ConeGeometry(5, 11, 4), createMat(0xf59e0b));
      jagamohana.position.set(0, 8.5, 0);
      jagamohana.rotation.y = Math.PI / 4;
      modelGroup.add(jagamohana);

      const kalasa = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), createMat(0xfacc15, 0.2, 0.9));
      kalasa.position.set(0, 14.5, 0);
      modelGroup.add(kalasa);
    } else {
      // Puri Golden Beach Model
      const sand = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 10), createMat(0xfde047, 0.9, 0.0));
      sand.position.set(0, 0.4, 3);
      modelGroup.add(sand);

      const ocean = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 8), createMat(0x0284c7, 0.1, 0.8));
      ocean.position.set(0, 0.3, -5);
      modelGroup.add(ocean);
    }

    // 8. Animation & Dynamic Camera Focus Interpolation
    let targetCameraPos = { x: 22, y: 16, z: 32 };
    let targetLookAt = { x: 0, y: 4, z: 0 };

    if (selectedComponent === 'vimana') {
      targetCameraPos = { x: -18, y: 18, z: 16 };
      targetLookAt = { x: -10, y: 12, z: 0 };
    } else if (selectedComponent === 'jagamohana') {
      targetCameraPos = { x: -8, y: 10, z: 12 };
      targetLookAt = { x: -3.5, y: 6, z: 0 };
    } else if (selectedComponent === 'natamandira') {
      targetCameraPos = { x: 2, y: 8, z: 10 };
      targetLookAt = { x: 2.5, y: 4, z: 0 };
    } else if (selectedComponent === 'bhogamandapa') {
      targetCameraPos = { x: 14, y: 8, z: 10 };
      targetLookAt = { x: 8.2, y: 4, z: 0 };
    } else if (selectedComponent === 'nilachakra') {
      targetCameraPos = { x: -14, y: 24, z: 6 };
      targetLookAt = { x: -10, y: 22.8, z: 0 };
    } else if (selectedComponent === 'arunstambha') {
      targetCameraPos = { x: 22, y: 8, z: 8 };
      targetLookAt = { x: 17.8, y: 6, z: 0 };
    } else if (selectedComponent === 'simhadwara') {
      targetCameraPos = { x: 22, y: 6, z: 6 };
      targetLookAt = { x: 14.6, y: 3, z: 0 };
    } else if (selectedComponent === 'vyaghradwara') {
      targetCameraPos = { x: -24, y: 6, z: 6 };
      targetLookAt = { x: -16.6, y: 3, z: 0 };
    } else if (selectedComponent === 'hastidwara') {
      targetCameraPos = { x: -1, y: 8, z: -20 };
      targetLookAt = { x: -1, y: 3, z: -12 };
    } else if (selectedComponent === 'ashwadwara') {
      targetCameraPos = { x: -1, y: 8, z: 20 };
      targetLookAt = { x: -1, y: 3, z: 12 };
    }

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      if (isRotating && modelGroup && selectedComponent === 'all') {
        modelGroup.rotation.y += 0.005;
      }

      if (cameraRef.current) {
        cameraRef.current.position.x += (targetCameraPos.x - cameraRef.current.position.x) * 0.05;
        cameraRef.current.position.y += (targetCameraPos.y - cameraRef.current.position.y) * 0.05;
        cameraRef.current.position.z += (targetCameraPos.z - cameraRef.current.position.z) * 0.05;
        cameraRef.current.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Interactive Mouse Controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !modelGroup) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      modelGroup.rotation.y += deltaX * 0.008;
      modelGroup.rotation.x += deltaY * 0.005;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [siteId, isRotating, wireframe, lightMode, selectedComponent]);

  const activeInfo = componentInfo[selectedComponent] || componentInfo.all;

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* 1. Component Selector Toolbar (10+ Interactive Architectural Nodes) */}
      {siteId === 'jagannath_temple' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          padding: '8px 12px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid var(--border-color)',
          scrollbarWidth: 'thin'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-cyan)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Compass size={14} /> Focus Architectural Element:
          </span>

          {[
            { id: 'all', label: '🏛️ Full Complex' },
            { id: 'vimana', label: '🛕 Vimana (65m Spire)' },
            { id: 'jagamohana', label: '🏛️ Jagamohana' },
            { id: 'natamandira', label: '💃 Natamandira' },
            { id: 'bhogamandapa', label: '🍲 Bhogamandapa' },
            { id: 'simhadwara', label: '🦁 Singha Dwara (East)' },
            { id: 'vyaghradwara', label: '🐅 Vyaghra Dwara (West)' },
            { id: 'hastidwara', label: '🐘 Hasti Dwara (North)' },
            { id: 'ashwadwara', label: '🐎 Ashwa Dwara (South)' },
            { id: 'nilachakra', label: '☸️ Nila Chakra' },
            { id: 'arunstambha', label: '🏛️ Aruna Stambha' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedComponent(item.id);
                setIsRotating(item.id === 'all');
              }}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '6px',
                border: selectedComponent === item.id ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)',
                background: selectedComponent === item.id ? 'var(--accent-cyan)' : 'transparent',
                color: selectedComponent === item.id ? '#000' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* 2. 3D WebGL Canvas Viewport */}
      <div style={{ position: 'relative', width: '100%', height: '460px', borderRadius: '16px', overflow: 'hidden', background: '#070a12', border: '1px solid var(--border-color)' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

        {/* Floating Component Info Overlay Card */}
        {siteId === 'jagannath_temple' && activeInfo && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            maxWidth: '380px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            color: 'var(--text-primary)',
            pointerEvents: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} /> {activeInfo.title}
              </h4>
            </div>

            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              🏛️ Style: {activeInfo.style}
            </span>

            <p style={{ margin: '4px 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {activeInfo.desc}
            </p>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {activeInfo.highlights.map((h, idx) => (
                <span key={idx} style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8', fontSize: '9px', fontWeight: 700 }}>
                  ✓ {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Control Overlay Bar */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          padding: '8px 14px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              🎮 3D WebGL Controls:
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Drag mouse to orbit | Click component to zoom focus</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsRotating(!isRotating)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: isRotating ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: isRotating ? '#38bdf8' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isRotating ? <Pause size={12} /> : <Play size={12} />}
              {isRotating ? 'Pause Orbit' : 'Auto Orbit'}
            </button>

            <button
              onClick={() => setWireframe(!wireframe)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: wireframe ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                color: wireframe ? '#c084fc' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Box size={12} />
              {wireframe ? 'Solid Render' : 'Wireframe 3D'}
            </button>

            <button
              onClick={() => setLightMode(lightMode === 'day' ? 'sunset' : lightMode === 'sunset' ? 'night' : lightMode === 'night' ? 'pbr' : 'day')}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sun size={12} />
              Lighting: {lightMode.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
