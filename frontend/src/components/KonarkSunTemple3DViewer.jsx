import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Eye, Sun, Box, RefreshCw, ZoomIn, ZoomOut, Play, Pause, Compass, Info, Check, Shield, Clock, Users, ArrowUp, Navigation, Layers, Sparkles, MapPin } from 'lucide-react';

export default function KonarkSunTemple3DViewer() {
  const mountRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);
  const [lightMode, setLightMode] = useState('day'); // 'day', 'sunset', 'night', 'sunrise'
  const [selectedComponent, setSelectedComponent] = useState('all');
  const [selectedWheelIndex, setSelectedWheelIndex] = useState(0); // 0 to 23
  const [exploreWheelMode, setExploreWheelMode] = useState(false);
  const [explodedView, setExplodedView] = useState(false);
  const [sitePlanMode, setSitePlanMode] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState(12); // 6 AM to 6 PM (12 = Noon)
  const [showCrowdHeatmap, setShowCrowdHeatmap] = useState(false);
  const [showSafePaths, setShowSafePaths] = useState(false);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore', 'wheel_detail', 'engineering', 'authenticity'

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const templeGroupRef = useRef(null);
  const reqIdRef = useRef(null);
  const sunLightRef = useRef(null);
  
  // Component references for exploded view
  const jagamohanaMeshRef = useRef(null);
  const deulaMeshRef = useRef(null);
  const natamandiraMeshRef = useRef(null);
  const wheelsGroupRef = useRef(null);
  const horsesGroupRef = useRef(null);
  const platformMeshRef = useRef(null);

  const crowdHeatmapGroupRef = useRef(null);
  const safePathsGroupRef = useRef(null);

  // Archaeological classification metadata for educational authenticity
  const componentInfo = {
    all: {
      title: "Konark Sun Temple (Surya Deula), Odisha, India",
      category: "UNESCO World Heritage Archaeological Site (1250 CE)",
      status: "🟢 Surviving & 🟡 Archaeological Remains",
      style: "Traditional Kalinga / Odisha Chariot Architecture",
      desc: "Conceived as a colossal stone chariot of Sun God Surya with 24 carved monolithic wheels and 7 galloping horses. Built by King Narasimhadeva I of the Eastern Ganga Dynasty. Preserves the surviving Jagamohana assembly hall, ruined sanctum base, and open Natamandira.",
      highlights: ["24 Carved Sundial Wheels", "7 Galloping Chariot Horses", "39m Stepped Jagamohana", "Open Pillared Natamandira", "Khondalite & Chlorite Stonework"]
    },
    jagamohana: {
      title: "1. Jagamohana (Pida Deula Assembly Hall)",
      category: "🟢 Surviving Structure (Intact 39m Roof)",
      status: "🟢 Surviving",
      style: "Pida Deula Tiered Stepped Pyramidal Roof",
      desc: "The monumental 39-meter high assembly hall. Features a massive tiered pyramidal roof composed of multi-layered horizontal stone cornices (Pidhas) decorated with life-sized stone sculptures of celestial musicians.",
      highlights: ["Tiered Pidha Roof Cornices", "Celestial Musician Statues", "Green Chlorite Reliefs", "Monolithic Pillar Support"]
    },
    deula: {
      title: "2. Main Temple Sanctum Base (Deula / Vimana Ruins)",
      category: "🟡 Archaeological Remains & 🔵 Historical Reconstruction",
      status: "🟡 Remains",
      style: "Soaring Rekha Deula Tower Base",
      desc: "The historic main sanctum tower that originally soared to 70m. Today, the surviving massive stone platform, lower carved walls, and chlorite idols of Lord Surya remain preserved.",
      highlights: ["70m Original Tower Outline", "Equinox Sun Alignment", "Chlorite Surya Statues", "Heavy Khondalite Foundation"]
    },
    natamandira: {
      title: "3. Natamandira (Open Dance & Music Hall)",
      category: "🟡 Archaeological Remains (Open Roofless Pillars)",
      status: "🟡 Remains",
      style: "Elevated Open Pillared Performance Shrine",
      desc: "An exquisite open pillared hall situated to the east of the main temple where Mahari dancers performed sacred dances for Lord Surya. Features 128 carved stone panels depicting classical Odissi dance postures.",
      highlights: ["128 Odissi Dance Postures", "Intricate Relief Friezes", "Carved Musician Panels", "Elevated Platform Base"]
    },
    wheels: {
      title: "4. 24 Carved Monolithic Stone Wheels (Sundials)",
      category: "🟢 Surviving & Intact Monolithic Artistry",
      status: "🟢 Surviving",
      style: "12 Pairs of 3-Meter Diameter Monolithic Wheels",
      desc: "24 enormous stone wheels positioned along the platform walls, symbolizing the 24 hours of the day and 12 months. Each wheel features 8 major spokes, 8 minor spokes, central hub, and acts as an astronomical sundial.",
      highlights: ["8 Major & 8 Minor Spokes", "Astronomical Sundial Function", "Concentric Floral Rings", "Erotic & Daily Life Reliefs"]
    },
    horses: {
      title: "5. Seven Galloping Chariot Horses",
      category: "🟢 Surviving & Preserved Stone Sculptures",
      status: "🟢 Surviving",
      style: "Dynamically Sculpted Monolithic Stone Horses",
      desc: "Seven magnificent galloping stone horses flanking the eastern entrance, representing the seven days of the week and the seven colors of sun rays (Gayatri, Brihati, Usnih, Jagati, Trishtubh, Anushtubh, Pankti).",
      highlights: ["7 Sacred Chariot Horses", "Dynamic Stone Anatomy", "Regal Harness Carvings", "Eastern Entrance Guard"]
    },
    staircase: {
      title: "6. Monumental Entrance Staircase",
      category: "🟢 Surviving Stone Entrance Platform",
      status: "🟢 Surviving",
      style: "Grand Central Terraced Flight of Steps",
      desc: "Broad stone staircase leading to the elevated chariot platform. Flanked by massive stone lions crushing elephants (Gaja-Simha), symbolizing spiritual pride over material wealth.",
      highlights: ["Broad Khondalite Steps", "Gaja-Simha Gate Statues", "Terraced Entrance Porch", "Visitor Access Corridor"]
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a101d);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(24, 18, 34);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    sunLight.position.set(30, 45, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-20, 20, -20);
    scene.add(fillLight);

    // Ground Soft Glow
    const groundLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 0.4);
    scene.add(groundLight);

    // 5. Materials (Khondalite Stone, Chlorite, Sandstone)
    const khondaliteMat = new THREE.MeshStandardMaterial({
      color: 0x9a6b4c, // Authentic Weathered Reddish-Brown Khondalite Stone
      roughness: 0.85,
      metalness: 0.1
    });

    const darkKhondaliteMat = new THREE.MeshStandardMaterial({
      color: 0x6e4730,
      roughness: 0.9,
      metalness: 0.05
    });

    const chloriteMat = new THREE.MeshStandardMaterial({
      color: 0x2e4a3e, // Green Chlorite Relief Accent Stone
      roughness: 0.5,
      metalness: 0.2
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.8
    });

    const courtyardMat = new THREE.MeshStandardMaterial({
      color: 0x3d3127,
      roughness: 0.95
    });

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a29,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });

    // =========================================================================
    // --- BUILD KONARK SUN TEMPLE 3D MONUMENTAL CHARIOT MODEL (THREE.JS) ---
    // =========================================================================
    const templeGroup = new THREE.Group();
    templeGroupRef.current = templeGroup;

    // A. Open Heritage Courtyard & Landscaped Archaeological Park (Matches Reference Photo)
    const courtyard = new THREE.Mesh(new THREE.CylinderGeometry(42, 45, 0.4, 64), courtyardMat);
    courtyard.position.y = -0.2;
    courtyard.receiveShadow = true;
    templeGroup.add(courtyard);

    // Green Archaeological Lawn Sections
    const lawn1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 14), grassMat);
    lawn1.position.set(-18, -0.1, 18);
    templeGroup.add(lawn1);

    const lawn2 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 14), grassMat);
    lawn2.position.set(18, -0.1, -18);
    templeGroup.add(lawn2);

    // B. Elevated Chariot Platform Base (Khondalite Terrace)
    const platformGeo = new THREE.BoxGeometry(22, 2.2, 14);
    const platform = new THREE.Mesh(platformGeo, khondaliteMat);
    platform.position.set(0, 1.1, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    platformMeshRef.current = platform;
    templeGroup.add(platform);

    // Platform Carved Upper Molding Band
    const moldingBand = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.3, 14.6), darkKhondaliteMat);
    moldingBand.position.set(0, 2.2, 0);
    templeGroup.add(moldingBand);

    // C. Monumental Front Entrance Staircase
    const stepsCount = 8;
    for (let i = 0; i < stepsCount; i++) {
      const stepWidth = 6.0 - i * 0.2;
      const stepHeight = 0.22;
      const stepDepth = 0.6;
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), khondaliteMat);
      step.position.set(11.3 + i * 0.5, 0.11 + i * 0.22, 0);
      step.castShadow = true;
      templeGroup.add(step);
    }

    // Side Stone Balustrade Walls with Guardian Lions (Gaja-Simha)
    const balustradeL = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 0.6), darkKhondaliteMat);
    balustradeL.position.set(13.2, 1.0, 3.2);
    templeGroup.add(balustradeL);

    const balustradeR = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.4, 0.6), darkKhondaliteMat);
    balustradeR.position.set(13.2, 1.0, -3.2);
    templeGroup.add(balustradeR);

    // Gaja-Simha Lions on Balustrade Towers
    const lionL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.8), chloriteMat);
    lionL.position.set(15.2, 2.1, 3.2);
    templeGroup.add(lionL);

    const lionR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.8), chloriteMat);
    lionR.position.set(15.2, 2.1, -3.2);
    templeGroup.add(lionR);

    // D. 24 MONOLITHIC CARVED STONE WHEELS (SUNDIALS)
    const wheelsGroup = new THREE.Group();
    wheelsGroupRef.current = wheelsGroup;

    const wheelRadius = 1.35;
    const createStoneWheel = (xPos, zPos, isSouthSide) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(xPos, 1.3, zPos);
      if (!isSouthSide) wheelGroup.rotation.y = Math.PI;

      // Outer Carved Rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.18, 16, 32), darkKhondaliteMat);
      rim.castShadow = true;
      wheelGroup.add(rim);

      // Central Hub Cylinder
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.45, 16), chloriteMat);
      hub.rotation.x = Math.PI / 2;
      hub.castShadow = true;
      wheelGroup.add(hub);

      // Central Sundial Gnomon Pin
      const gnomon = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 12), goldAccentMat);
      gnomon.rotation.x = Math.PI / 2;
      gnomon.position.z = 0.25;
      wheelGroup.add(gnomon);

      // 8 Major Spokes + 8 Minor Spokes
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;

        // Major Spoke with Carving Medallion
        const majorSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, wheelRadius * 1.8, 0.14), khondaliteMat);
        majorSpoke.rotation.z = angle;
        majorSpoke.castShadow = true;
        wheelGroup.add(majorSpoke);

        // Medallion on Major Spoke
        const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 12), chloriteMat);
        medallion.rotation.x = Math.PI / 2;
        medallion.position.set(
          Math.cos(angle + Math.PI / 2) * (wheelRadius * 0.6),
          Math.sin(angle + Math.PI / 2) * (wheelRadius * 0.6),
          0.08
        );
        wheelGroup.add(medallion);

        // Minor Spoke between Major Spokes
        const minorAngle = angle + Math.PI / 8;
        const minorSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, wheelRadius * 1.7, 0.08), khondaliteMat);
        minorSpoke.rotation.z = minorAngle;
        wheelGroup.add(minorSpoke);
      }

      // Concentric Decorative Ring
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius * 0.55, 0.08, 12, 24), darkKhondaliteMat);
      wheelGroup.add(innerRing);

      return wheelGroup;
    };

    // Place 12 wheels on South Wall (+Z = 7.1) and 12 wheels on North Wall (-Z = -7.1)
    const wheelXPositions = [-9.0, -7.2, -5.4, -3.6, -1.8, 0.0, 1.8, 3.6, 5.4, 7.2, 9.0, 10.2];
    wheelXPositions.forEach((x, idx) => {
      const wheelS = createStoneWheel(x, 7.1, true);
      wheelsGroup.add(wheelS);

      const wheelN = createStoneWheel(x, -7.1, false);
      wheelsGroup.add(wheelN);
    });
    templeGroup.add(wheelsGroup);

    // E. SEVEN GALLOPING CHARIOT HORSES AT FRONT ENTRANCE
    const horsesGroup = new THREE.Group();
    horsesGroupRef.current = horsesGroup;

    const horseXPositions = [12.8, 13.6, 14.4, 15.2, 16.0, 16.8, 17.6];
    const horseZOffsets = [-2.4, -1.6, -0.8, 0.0, 0.8, 1.6, 2.4];

    horseXPositions.forEach((hx, idx) => {
      const hz = horseZOffsets[idx];
      const horseGroup = new THREE.Group();
      horseGroup.position.set(hx, 0.6, hz);

      // Dynamic Horse Body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.6, 12), khondaliteMat);
      body.rotation.z = -Math.PI / 4;
      body.castShadow = true;
      horseGroup.add(body);

      // Horse Head & Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.0, 10), khondaliteMat);
      neck.position.set(0.6, 0.7, 0);
      neck.rotation.z = Math.PI / 6;
      horseGroup.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.35), chloriteMat);
      head.position.set(0.9, 1.2, 0);
      horseGroup.add(head);

      // Galloping Legs
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.0, 8), khondaliteMat);
      leg1.position.set(0.4, -0.4, 0.2);
      leg1.rotation.z = -Math.PI / 6;
      horseGroup.add(leg1);

      const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.0, 8), khondaliteMat);
      leg2.position.set(0.4, -0.4, -0.2);
      leg2.rotation.z = Math.PI / 8;
      horseGroup.add(leg2);

      horsesGroup.add(horseGroup);
    });
    templeGroup.add(horsesGroup);

    // F. JAGAMOHANA (SURVIVING 39m ASSEMBLY HALL - STEPPED PIDA ROOF)
    const jagamohanaGroup = new THREE.Group();
    jagamohanaMeshRef.current = jagamohanaGroup;
    jagamohanaGroup.position.set(2.0, 2.2, 0);

    // Cubic Base Hall
    const jagaBase = new THREE.Mesh(new THREE.BoxGeometry(9.6, 4.2, 9.6), khondaliteMat);
    jagaBase.position.y = 2.1;
    jagaBase.castShadow = true;
    jagamohanaGroup.add(jagaBase);

    // Chlorite Relief Frieze Belt
    const reliefBelt = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.6, 9.8), chloriteMat);
    reliefBelt.position.y = 3.8;
    jagamohanaGroup.add(reliefBelt);

    // Multi-Tiered Stepped Pyramidal Roof (Pidha Layers)
    const pidhaTiers = 7;
    for (let i = 0; i < pidhaTiers; i++) {
      const tierWidth = 9.8 - i * 1.1;
      const tierHeight = 0.55;
      const pidha = new THREE.Mesh(new THREE.BoxGeometry(tierWidth, tierHeight, tierWidth), khondaliteMat);
      pidha.position.y = 4.4 + i * 0.55;
      pidha.castShadow = true;
      jagamohanaGroup.add(pidha);

      // Recessed Kanthi Accent Band
      if (i < pidhaTiers - 1) {
        const kanthi = new THREE.Mesh(new THREE.BoxGeometry(tierWidth - 0.4, 0.15, tierWidth - 0.4), darkKhondaliteMat);
        kanthi.position.y = 4.4 + i * 0.55 + 0.35;
        jagamohanaGroup.add(kanthi);
      }
    }

    // Crown Amalaka Disc on Jagamohana
    const jAmalaka = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.6, 24), chloriteMat);
    jAmalaka.position.y = 8.6;
    jagamohanaGroup.add(jAmalaka);

    const jKalasha = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 16), goldAccentMat);
    jKalasha.position.y = 9.4;
    jagamohanaGroup.add(jKalasha);

    templeGroup.add(jagamohanaGroup);

    // G. DEULA / MAIN SANCTUM RUINS (ACCURATE PRESENT-DAY ARCHAEOLOGICAL APPEARANCE)
    const deulaGroup = new THREE.Group();
    deulaMeshRef.current = deulaGroup;
    deulaGroup.position.set(-6.5, 2.2, 0);

    // 🟢 Surviving Ruined Sanctum Base & Lower Walls
    const deulaBase = new THREE.Mesh(new THREE.BoxGeometry(9.0, 3.5, 9.0), darkKhondaliteMat);
    deulaBase.position.y = 1.75;
    deulaBase.castShadow = true;
    deulaGroup.add(deulaBase);

    // 🟡 Archaeological Remains Wall Projections
    const remainsWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.2, 7.2), khondaliteMat);
    remainsWall.position.y = 4.6;
    deulaGroup.add(remainsWall);

    // 🔵 Interpretive Reconstruction Outline of the Original 70m Spire
    const interpretOutline = new THREE.Mesh(new THREE.ConeGeometry(4.2, 10.0, 4), outlineMat);
    interpretOutline.position.y = 10.5;
    deulaGroup.add(interpretOutline);

    templeGroup.add(deulaGroup);

    // H. NATYA MANDAPA (NATAMANDIRA - OPEN ROOFLESS PILLARED DANCE HALL)
    const natyaGroup = new THREE.Group();
    natamandiraMeshRef.current = natyaGroup;
    natyaGroup.position.set(10.5, 2.2, 0);

    const natyaBase = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 6.5), khondaliteMat);
    natyaBase.position.y = 0.6;
    natyaGroup.add(natyaBase);

    // 16 Open Monolithic Pillars (Accurate Roofless Archaeological Appearance)
    for (let px = -2.4; px <= 2.4; px += 1.6) {
      for (let pz = -2.4; pz <= 2.4; pz += 1.6) {
        if (Math.abs(px) === 2.4 || Math.abs(pz) === 2.4) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.4, 12), chloriteMat);
          pillar.position.set(px, 2.2, pz);
          pillar.castShadow = true;
          natyaGroup.add(pillar);
        }
      }
    }

    templeGroup.add(natyaGroup);

    // I. CROWD MANAGEMENT HEATMAP OVERLAY LAYER
    const crowdGroup = new THREE.Group();
    crowdHeatmapGroupRef.current = crowdGroup;
    crowdGroup.visible = false;

    const heatHigh = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xef4444, opacity: 0.55, transparent: true, side: THREE.DoubleSide })
    );
    heatHigh.rotation.x = Math.PI / 2;
    heatHigh.position.set(11.0, 2.3, 0);
    crowdGroup.add(heatHigh);

    const heatMed = new THREE.Mesh(
      new THREE.CircleGeometry(6.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, opacity: 0.45, transparent: true, side: THREE.DoubleSide })
    );
    heatMed.rotation.x = Math.PI / 2;
    heatMed.position.set(2.0, 2.3, 0);
    crowdGroup.add(heatMed);

    templeGroup.add(crowdGroup);

    // J. SAFE WALKING PATHS OVERLAY
    const safeGroup = new THREE.Group();
    safePathsGroupRef.current = safeGroup;
    safeGroup.visible = false;

    const pathPoints = [
      new THREE.Vector3(18, 0.4, 0),
      new THREE.Vector3(10.5, 2.3, 0),
      new THREE.Vector3(2.0, 2.3, 0),
      new THREE.Vector3(2.0, 2.3, 6.5),
      new THREE.Vector3(-6.5, 2.3, 6.5)
    ];
    const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
    const tubeGeo = new THREE.TubeGeometry(pathCurve, 64, 0.25, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, opacity: 0.7, transparent: true });
    const safeTube = new THREE.Mesh(tubeGeo, tubeMat);
    safeGroup.add(safeTube);

    templeGroup.add(safeGroup);

    scene.add(templeGroup);

    // 6. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (isRotating && templeGroup) {
        templeGroup.rotation.y += delta * 0.15;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [isRotating]);

  // Handle Sundial Time of Day Sunlight & Shadow Animation
  useEffect(() => {
    if (!sunLightRef.current) return;
    const hour = Math.max(6, Math.min(18, simulatedTime));
    const angle = ((hour - 6) / 12) * Math.PI;

    const sunX = Math.cos(angle) * 45;
    const sunY = Math.sin(angle) * 45 + 5;
    const sunZ = 20;

    sunLightRef.current.position.set(sunX, sunY, sunZ);
  }, [simulatedTime]);

  // Exploded 3D View Handler (Explore Architectural Layers)
  useEffect(() => {
    if (jagamohanaMeshRef.current && deulaMeshRef.current && natamandiraMeshRef.current && wheelsGroupRef.current) {
      if (explodedView) {
        jagamohanaMeshRef.current.position.y = 5.5;
        deulaMeshRef.current.position.x = -11.5;
        natamandiraMeshRef.current.position.x = 16.5;
        wheelsGroupRef.current.position.y = -1.5;
      } else {
        jagamohanaMeshRef.current.position.y = 2.2;
        deulaMeshRef.current.position.x = -6.5;
        natamandiraMeshRef.current.position.x = 10.5;
        wheelsGroupRef.current.position.y = 0;
      }
    }
  }, [explodedView]);

  // Light Mode Switch (Day / Sunset / Night / Sunrise)
  useEffect(() => {
    if (!sceneRef.current || !sunLightRef.current) return;

    if (lightMode === 'day') {
      sceneRef.current.background = new THREE.Color(0x0a101d);
      sunLightRef.current.color.setHex(0xffedd5);
      sunLightRef.current.intensity = 1.4;
    } else if (lightMode === 'sunrise') {
      sceneRef.current.background = new THREE.Color(0x3b1510);
      sunLightRef.current.color.setHex(0xfb923c);
      sunLightRef.current.intensity = 2.0;
    } else if (lightMode === 'sunset') {
      sceneRef.current.background = new THREE.Color(0x2a0d16);
      sunLightRef.current.color.setHex(0xf97316);
      sunLightRef.current.intensity = 1.8;
    } else if (lightMode === 'night') {
      sceneRef.current.background = new THREE.Color(0x030712);
      sunLightRef.current.color.setHex(0x38bdf8);
      sunLightRef.current.intensity = 0.5;
    }
  }, [lightMode]);

  // Toggle Heatmap & Safe Paths
  useEffect(() => {
    if (crowdHeatmapGroupRef.current) crowdHeatmapGroupRef.current.visible = showCrowdHeatmap;
  }, [showCrowdHeatmap]);

  useEffect(() => {
    if (safePathsGroupRef.current) safePathsGroupRef.current.visible = showSafePaths;
  }, [showSafePaths]);

  // Preset Camera View Functions
  const setCameraView = (viewType) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    setIsRotating(false);
    setSitePlanMode(viewType === 'siteplan');

    if (viewType === 'front') {
      cam.position.set(28, 8, 0);
      cam.lookAt(0, 4, 0);
    } else if (viewType === 'east_sunrise') {
      cam.position.set(34, 6, 0);
      cam.lookAt(0, 5, 0);
      setLightMode('sunrise');
      setSimulatedTime(6.5);
    } else if (viewType === 'wheels') {
      cam.position.set(2, 4, 14);
      cam.lookAt(2, 2, 0);
      setSelectedComponent('wheels');
    } else if (viewType === 'horses') {
      cam.position.set(20, 5, 4);
      cam.lookAt(14, 2, 0);
      setSelectedComponent('horses');
    } else if (viewType === 'siteplan') {
      cam.position.set(0, 48, 1);
      cam.lookAt(0, 0, 0);
    } else if (viewType === 'jagamohana') {
      cam.position.set(12, 18, 14);
      cam.lookAt(2, 8, 0);
      setSelectedComponent('jagamohana');
    } else if (viewType === 'deula') {
      cam.position.set(-14, 14, 16);
      cam.lookAt(-6, 5, 0);
      setSelectedComponent('deula');
    } else {
      cam.position.set(24, 18, 34);
      cam.lookAt(0, 5, 0);
      setSelectedComponent('all');
    }
  };

  const activeInfo = componentInfo[selectedComponent] || componentInfo.all;

  const getFormattedTime = (t) => {
    const hrs = Math.floor(t);
    const mins = Math.floor((t - hrs) * 60);
    const period = hrs >= 12 ? 'PM' : 'AM';
    const displayHrs = hrs > 12 ? hrs - 12 : hrs === 0 ? 12 : hrs;
    return `${displayHrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '18px', border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
      {/* 1. Header & Museum Mode Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass style={{ color: 'var(--accent-cyan)' }} />
            Konark Sun Temple (Surya Deula) Interactive 3D Model
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Surviving Archaeological Appearance • 24 Carved Wheels • 7 Horses • Kalinga Solitary Chariot Architecture
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsRotating(!isRotating)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid var(--accent-cyan)',
              background: isRotating ? 'var(--accent-cyan)' : 'transparent',
              color: isRotating ? '#000' : 'var(--accent-cyan)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCw size={14} className={isRotating ? "spin" : ""} />
            {isRotating ? '360° Orbiting' : 'Paused'}
          </button>

          <button
            onClick={() => setExplodedView(!explodedView)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid var(--accent-purple)',
              background: explodedView ? 'var(--accent-purple)' : 'transparent',
              color: explodedView ? '#fff' : 'var(--accent-purple)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Layers size={14} />
            {explodedView ? 'Exploded 3D Layers ON' : 'Explore 3D Layers'}
          </button>

          <button
            onClick={() => setLightMode(lightMode === 'day' ? 'sunrise' : lightMode === 'sunrise' ? 'sunset' : lightMode === 'sunset' ? 'night' : 'day')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid #f59e0b',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sun size={14} />
            Lighting: {lightMode.toUpperCase()}
          </button>
        </div>
      </div>

      {/* 2. Archaeological Classification Authenticity Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(0,0,0,0.25)', padding: '10px 16px', borderRadius: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>Archaeological Categories:</span>
        <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
          🟢 Surviving Structure (Jagamohana, Platform)
        </span>
        <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
          🟡 Archaeological Remains (Natamandira Ruins, Deula Base)
        </span>
        <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
          🔵 Interpretive Reconstruction (Original 70m Spire Outline)
        </span>
      </div>

      {/* 3. Preset Camera Viewpoints Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin' }}>
        {[
          { id: 'all', label: '🌐 Full Chariot Complex' },
          { id: 'east_sunrise', label: '🌅 East Sunrise View (Surya Rays)' },
          { id: 'front', label: '🏛️ Front Staircase View' },
          { id: 'wheels', label: '☸️ 24 Sundial Wheels View' },
          { id: 'horses', label: '🐎 7 Galloping Horses View' },
          { id: 'jagamohana', label: '🛕 Jagamohana Pida Roof' },
          { id: 'deula', label: '🟡 Deula Ruined Base & Outline' },
          { id: 'siteplan', label: '🚁 Top-Down Site Plan (EAST →)' }
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setCameraView(v.id)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: selectedComponent === v.id || (v.id === 'siteplan' && sitePlanMode) ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
              background: selectedComponent === v.id || (v.id === 'siteplan' && sitePlanMode) ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              color: selectedComponent === v.id || (v.id === 'siteplan' && sitePlanMode) ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* 4. 3D WebGL Viewport + Compass & Sundial Slider */}
      <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#0a101d', marginTop: '10px' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {/* East Sunrise Compass Indicator */}
        <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(15, 23, 42, 0.85)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border-color)', color: '#fbbf24', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Navigation size={14} style={{ transform: 'rotate(90deg)', color: '#f59e0b' }} /> EAST &rarr; SUNRISE (Surya)
        </div>

        {/* Crowd Density & Safety Overlay Controls */}
        <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowCrowdHeatmap(!showCrowdHeatmap)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: showCrowdHeatmap ? '#ef4444' : 'rgba(15, 23, 42, 0.85)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Users size={14} /> {showCrowdHeatmap ? '🔥 Heatmap ON' : '👥 Visitor Density Overlay'}
          </button>

          <button
            onClick={() => setShowSafePaths(!showSafePaths)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid #38bdf8',
              background: showSafePaths ? '#0284c7' : 'rgba(15, 23, 42, 0.85)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Shield size={14} /> {showSafePaths ? '🛡️ Safe Paths ON' : '🚶 Safe Tour Routes'}
          </button>
        </div>

        {/* Interactive 24 Sundial Time Simulator Overlay Slider */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.92)',
          padding: '10px 20px',
          borderRadius: '24px',
          border: '1px solid var(--accent-cyan)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          width: '90%',
          maxWidth: '540px'
        }}>
          <Clock size={20} style={{ color: '#fbbf24' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              <span>☸️ Interactive Sundial Shadow Simulator:</span>
              <strong style={{ color: '#fbbf24', fontSize: '12px' }}>{getFormattedTime(simulatedTime)}</strong>
            </div>
            <input
              type="range"
              min="6"
              max="18"
              step="0.25"
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
            />
          </div>
        </div>
      </div>

      {/* 5. Interactive Educational & Architectural Information Tabs */}
      <div style={{ marginTop: '18px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <button
            onClick={() => setActiveTab('explore')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: activeTab === 'explore' ? '1px solid var(--accent-cyan)' : 'none',
              background: activeTab === 'explore' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'explore' ? '#000' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            🏛️ Architectural Details
          </button>

          <button
            onClick={() => setActiveTab('wheel_detail')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: activeTab === 'wheel_detail' ? '1px solid #f59e0b' : 'none',
              background: activeTab === 'wheel_detail' ? '#f59e0b' : 'transparent',
              color: activeTab === 'wheel_detail' ? '#000' : '#fbbf24',
              cursor: 'pointer'
            }}
          >
            ☸️ Explore 24 Sundial Wheels
          </button>

          <button
            onClick={() => setActiveTab('engineering')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: activeTab === 'engineering' ? '1px solid var(--accent-purple)' : 'none',
              background: activeTab === 'engineering' ? 'var(--accent-purple)' : 'transparent',
              color: activeTab === 'engineering' ? '#fff' : 'var(--accent-purple)',
              cursor: 'pointer'
            }}
          >
            ⚙️ Engineering & Solar Astronomy
          </button>
        </div>

        {activeTab === 'explore' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--accent-cyan)' }}>{activeInfo.title}</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}><strong>Style:</strong> {activeInfo.style}</span>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8', fontSize: '11px', fontWeight: 800 }}>
                {activeInfo.category}
              </span>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{activeInfo.desc}</p>

            <div>
              <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Key Architectural Highlights:</strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {activeInfo.highlights.map((h, i) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    ✓ {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wheel_detail' && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#fbbf24' }}>
              Konark's 24 Monolithic Sundial Wheels (Solar Timekeeping Concept)
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The 24 wheels carved into the temple platform represent the 24 hours of a solar day (and 12 months). Each wheel has 8 major spokes representing the 8 Praharas (3-hour periods) of the day, and 8 minor spokes.
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {Array.from({ length: 24 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedWheelIndex(idx);
                    setCameraView('wheels');
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: selectedWheelIndex === idx ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                    background: selectedWheelIndex === idx ? '#f59e0b' : 'transparent',
                    color: selectedWheelIndex === idx ? '#000' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Wheel {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </button>
              ))}
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                Inspecting Wheel #{selectedWheelIndex + 1} ({selectedWheelIndex < 12 ? 'South Side Wheel' : 'North Side Wheel'})
              </strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Carved with 8 major spokes with relief medallions, 8 minor spokes, central chlorite hub gnomon pin, and concentric lotus scrollwork bands. Drag the Sundial Shadow Simulator slider above to observe shadow angles cast by sunlight across the spokes!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'engineering' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>1. Celestial Chariot Concept</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Designed as Sun God Surya's colossal stone chariot moving across the heavens, pulled by 7 galloping horses symbolizing the 7 days of the week.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: '#fbbf24' }}>2. Equinox & Sunrise Orientation</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Oriented along a precise East-West axis so that the first rays of the morning sun pass through the Natamandira and illuminate the main sanctum idol.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <strong style={{ fontSize: '13px', color: '#4ade80' }}>3. Khondalite & Chlorite Masonry</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Constructed using interlocking Khondalite stone blocks linked with iron dowels, with green chlorite stone reserved for fine relief statues and doorway lintels.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
