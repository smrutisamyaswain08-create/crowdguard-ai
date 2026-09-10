import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Volume2, VolumeX, Sparkles, Play, Pause, BookOpen, Bot, MessageSquare, RefreshCw, CheckCircle2, Languages, Mic, AlertCircle, Box, RotateCcw, FastForward, Send, ShieldCheck, HeartHandshake, Lightbulb, User } from 'lucide-react';

export default function AIPersonAvatarGuide({ onSelectTopic }) {
  const mountRef = useRef(null);
  
  // Speech & Playback Control States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [activeTopic, setActiveTopic] = useState('overview');
  const [selectedLang, setSelectedLang] = useState('or'); // Odia Default Active
  const [expressionMode, setExpressionMode] = useState('welcome');
  
  // Subtitles & Audio Notice
  const [subtitleText, setSubtitleText] = useState('');
  const [audioNotice, setAudioNotice] = useState('');

  // Visitor Interactive Q&A Chat States
  const [userQuery, setUserQuery] = useState('');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [chatLog, setChatLog] = useState([
    { sender: 'avatar', text: 'Namaste! Welcome to Puri. I am your Youth AI Heritage Guide. Ask me anything about the history, culture, or architecture of Puri!' }
  ]);
  
  // Three.js & Speech Refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const avatarGroupRef = useRef(null);
  const headRef = useRef(null);
  const mouthRef = useRef(null);
  const eyeLRef = useRef(null);
  const eyeRRef = useRef(null);
  const eyebrowLRef = useRef(null);
  const eyebrowRRef = useRef(null);
  const reqIdRef = useRef(null);
  const currentAudioRef = useRef(null);
  const speechUtteranceRef = useRef(null);
  const availableVoicesRef = useRef([]);

  // Wikipedia Trained Historical Knowledge Base
  const wikiKnowledgeBase = {
    overview: {
      expression: 'welcome',
      title_en: "1. Overview & 12th Century History (Wikipedia Archive)",
      title_hi: "1. जगन्नाथ मंदिर का इतिहास एवं उत्पत्ति (12वीं शताब्दी)",
      title_or: "୧. ପୁରୀ ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିରର ଇତିହାସ ଓ ଉତ୍ପତ୍ତି (୧୨ଶ ଶତାବ୍ଦୀ)",
      chapter_en: "Chapter I: Foundational History",
      chapter_hi: "अध्याय 1: स्थापना एवं राजवंश इतिहास",
      chapter_or: "ଅଧ୍ୟାୟ ୧: ପ୍ରତିଷ୍ଠା ଓ ରାଜବଂଶ ଇତିହାସ (ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଆ କଥନ)",
      text_en: "Namaste! Welcome to Puri. I am your Youth AI Heritage Guide. According to Wikipedia records, the Shree Jagannath Temple of Puri is a famous 12th-century Hindu temple dedicated to Jagannath, a form of Vishnu. Located in Puri, Odisha, it was constructed by King Anantavarman Chodaganga Deva of the Eastern Ganga Dynasty. The temple is one of the four sacred Char Dham pilgrimage sites of India.",
      text_hi: "नमस्ते! पूरी में आपका स्वागत है। मैं आपका युवा एआई हेरिटेज गाइड हूँ। विकिपीडिया अभिलेखागार के अनुसार, ओडिशा के पूरी शहर में स्थित श्री जगन्नाथ मंदिर 12वीं शताब्दी का अत्यंत पवित्र एवं प्रसिद्ध हिंदू मंदिर है। इस दिव्य मंदिर का निर्माण 12वीं शताब्दी में पूर्वी गंगा राजवंश के महान राजा अनंतवर्मन चोडगंगा देव द्वारा करवाया गया था। यह भारत के चार पवित्र धामों में से एक है।",
      text_or: "ନମସ୍କାର! ପୁରୀକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ମୁଁ ଆପଣଙ୍କର ଯୁବ ଏଆଇ ହେରିଟେଜ୍ ଗାଇଡ୍। ଉଇକିପିଡ଼ିଆ ତଥ୍ୟ ଅନୁସାରେ, ଓଡ଼ିଶାର ପବିତ୍ର ଧାମ ପୁରୀରେ ଅବସ୍ଥିତ ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିର ଦ୍ୱାଦଶ ଶତାବ୍ଦୀର ଏକ ଅତ୍ୟନ୍ତ ପବିତ୍ର ଓ ବିଶ୍ୱପ୍ରସିଦ୍ଧ ହିନ୍ଦୁ ମନ୍ଦିର। ଏହି ଦିବ୍ୟ ମନ୍ଦିର ପୂର୍ବ ଗଙ୍ଗ ବଂଶର ମହାନ ରାଜା ଅନନ୍ତବର୍ମନ୍ ଚୋଡ଼ଗଙ୍ଗ ଦେବଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ ହୋଇଥିଲା। ଏହା ଭାରତର ପବିତ୍ର ଚାରିଧାମ ମଧ୍ୟରୁ ଅନ୍ୟତମ ଶ୍ରେଷ୍ଠ ଧାମ।",
      speech_text_or: "Namaste! Puri ku aapananku swagata. Mun aapanankara Youth AI Heritage Guide. Wikipedia tathya anusare, Odisha ra pabitra dhama Puri re abasthita Shree Jagannath Mandira dwadasha shatabdira eka atyanta pabitra o bishwaprasiddha Hindu mandira. Ehi dibya mandira Purba Ganga banshara mahana raja Anantavarman Chodaganga Deva nka dwara nirmita hoithila."
    },
    architecture: {
      expression: 'history',
      title_en: "2. Kalinga Architecture & 65m Spire (Wikipedia Archive)",
      title_hi: "2. कलिंग वास्तुकला एवं 65 मीटर मुख्य देउल शिखर",
      title_or: "୨. ପବିତ୍ର କଳିଙ୍ଗ ସ୍ଥାପତ୍ୟ କଳା ଓ ୬୫ ମିଟର ଦେଉଳ ସିଖର",
      chapter_en: "Chapter II: Sacred Architecture",
      chapter_hi: "अध्याय 2: पवित्र कलिंग स्थापत्य शैली",
      chapter_or: "ଅଧ୍ୟାୟ ୨: ପବିତ୍ର କଳିଙ୍ଗ ସ୍ଥାପତ୍ୟ ଶୈଳୀ (ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଆ କଥନ)",
      text_en: "Wikipedia documents that the main temple is a soaring 65-meter curvilinear Rekha Deula tower built in Pancharatha Kalinga architectural style. It is surrounded by two fortified outer stone walls: Meghanada Pacheri and Kurma Bheda. The complex houses four sequential axial halls: Vimana, Jagamohana, Natamandira, and Bhogamandapa.",
      text_hi: "जगन्नाथ मंदिर की स्थापत्य कला पारम्परिक कलिंग वास्तुकला की पंचरथ रेखा देउल शैली का अद्वितीय उदाहरण है। मुख्य मंदिर की ऊंचाई 65 मीटर अर्थात 214 फीट है। यह मंदिर दो विशाल किलेनुमा प्राचीरों - मेघनाद पचेरी और कूर्म भेड़ा से सुरक्षित है। इसमें चार मुख्य मंडप हैं: विमान, जगमोहन, नटमंदिर और भोगमंडप।",
      text_or: "ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିରର ସ୍ଥାପତ୍ୟ କଳା ପାରମ୍ପରିକ କଳିଙ୍ଗ ସ୍ଥାପତ୍ୟର ପଞ୍ଚରଥ ରେଖା ଦେଉଳ ଶୈଳୀର ଅନନ୍ୟ ନିଦର୍ଶନ। ମୁଖ୍ୟ ମନ୍ଦିରର ଉଚ୍ଚତା ୬୫ ମିଟର। ଏହା ଦୁଇଟି ବିଶାଳ ପାଚେରୀ 'ମେଘନାଦ ପାଚେରୀ' ଏବଂ 'କୂର୍ମ ଭେଡ଼ା' ଦ୍ୱାରା ବେଷ୍ଟିତ। ଏଥିରେ ୪ଟି ମୁଖ୍ୟ ମଣ୍ଡପ ରହିଛି: ବିମାନ, ଜଗମୋହନ, ନଟମନ୍ଦିର ଓ ଭୋଗମଣ୍ଡପ। ଏହାର ୪ଟି ଦ୍ୱାର ହେଲା: ସିଂହଦ୍ୱାର, ବ୍ୟାଘ୍ରଦ୍ୱାର, ହସ୍ତୀଦ୍ୱାର ଏବଂ ଅଶ୍ୱଦ୍ୱାର।",
      speech_text_or: "Shree Jagannath Mandira ra sthapatya kala paramparika Kalinga sthapatya ra Pancharatha Rekha Deula shailira ananya nidarshana. Mukhya mandira ra uchata 65 meter. Eha duiti bishala pacheri Meghanada Pacheri ebang Kurma Bheda dwara beshtita. Ethire charoti mukhya mandapa rahibhi: Vimana, Jagamohana, Natamandira o Bhogamandapa."
    },
    nilachakra: {
      expression: 'important',
      title_en: "3. Nila Chakra & Patita Pavana Flag (Wikipedia Archive)",
      title_hi: "3. पवित्र नीलचक्र एवं पतित पावन लाल ध्वज",
      title_or: "୩. ପବିତ୍ର ନୀଳଚକ୍ର ଓ ଶ୍ରୀପତିତପାବନ ବାନା",
      chapter_en: "Chapter III: Sacred Apex Symbols",
      chapter_hi: "अध्याय 3: सर्वोच्च शिखर प्रतीक एवं ध्वज",
      chapter_or: "ଅଧ୍ୟାୟ ୩: ମନ୍ଦିର ଚୂଡ଼ା ପ୍ରତୀକ ଓ ବାନା (ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଆ କଥନ)",
      text_en: "Wikipedia records state that the Nila Chakra is a high-grade 8-spoked blue metal alloy wheel crowning the apex of the main Vimana. Above the Nila Chakra, temple servitors (Chunaras) perform a daily risky ritual of scaling the 65m spire to change the sacred Patita Pavana red flag.",
      text_hi: "नीलचक्र मुख्य मंदिर के 65 मीटर ऊंचे शिखर पर स्थापित अष्टधातु निर्मित 8 अराओं वाला अत्यंत पवित्र चक्र है। प्रतिदिन संध्या समय, मंदिर के साहसी चुनरा सेवक बिना किसी सुरक्षा उपकरण के 65 मीटर ऊंचे शिखर पर चढ़कर लाल पतित पावन ध्वज को बदलते हैं।",
      text_or: "ନୀଳଚକ୍ର ମୁଖ୍ୟ ମନ୍ଦିରର ୬୫ ମିଟର ଉଚ୍ଚ ସିଖରରେ ସ୍ଥାପିତ ୮ଟି ଅର ବିଶିଷ୍ଟ ଅଷ୍ଟଧାତୁ ନିର୍ମିତ ପବିତ୍ର ଚକ୍ର। ଏହାର ଉପରେ ଶ୍ରୀପତିତପାବନ ବାନା ପ୍ରତିଦିନ ସନ୍ଧ୍ୟାରେ ଚୁନରା ସେବକଙ୍କ ଦ୍ୱାରା ୬୫ ମିଟର ଉଚ୍ଚତା ଚଢ଼ି ବଦଳାଯାଏ। ଏହି ବାନା ପବନର ବିପରୀତ ଦିଗରେ ଉଡ଼ିବା ଏବଂ ପୁରୀର ଯେକୌଣସି ସ୍ଥାନରୁ ନୀଳଚକ୍ର ସଦା ସମ୍ମୁଖୀନ ଦେଖାଯିବା ଏକ ଦିବ୍ୟ ଚମତ୍କାର।",
      speech_text_or: "Nilachakra mukhya mandira ra 65 meter ucha sikharare sthapita 8 ti ara bishishta ashtadhatu nirmita pabitra chakra. Ehara upare Shreepatitapabana bana pratidina sandhyare Chunara sebakanka dwara 65 meter uchata chadhi badalajae."
    },
    mahaprasad: {
      expression: 'discovery',
      title_en: "4. Sacred Mahaprasad & Anand Bazaar (Wikipedia Archive)",
      title_hi: "4. पवित्र 56 भोग महाप्रसाद एवं आनंद बाजार",
      title_or: "୪. ପବିତ୍ର ୫୬ ଭୋଗ ମହାପ୍ରସାଦ ଓ ଆନନ୍ଦ ବଜାର",
      chapter_en: "Chapter IV: Sacred Offerings",
      chapter_hi: "अध्याय 4: छप्पन भोग महाप्रसाद",
      chapter_or: "ଅଧ୍ୟାୟ ୪: ଅଭଡ଼ା ମହାପ୍ରସାଦ ଓ ବିଶ୍ୱର ବିଶାଳ ରୋଷଘର (ସମ୍ପୂର୍ଣ୍ଣ)",
      text_en: "According to Wikipedia, the temple kitchen is the largest kitchen in the world, where Mahaprasad is cooked in 56 varieties using thousands of earthen pots stacked 7 levels high over wood fires. The Prasad is served to thousands of daily devotees in the open-air Anand Bazaar courtyard.",
      text_hi: "जगन्नाथ मंदिर की रसोई दुनिया की सबसे बड़ी रसोई मानी जाती है। यहाँ प्रतिदिन भगवान जगन्नाथ के लिए 56 प्रकार के दिव्य व्यंजन अर्थात छप्पन भोग महाप्रसाद तैयार किए जाते हैं। इसे आनंद बाजार में प्रतिदिन हजारों भक्तों के बीच वितरित किया जाता है।",
      text_or: "ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିର ରୋଷଘର ବିଶ୍ୱର ସବୁଠାରୁ ବିଶାଳ ରୋଷଘର। ଏଠାରେ ପ୍ରତିଦିନ ମହାପ୍ରଭୁଙ୍କ ପାଇଁ ୫୬ ପ୍ରକାରର ମହାପ୍ରସାଦ (ଛପନ ଭୋଗ) ମାଟି କୁଡ଼ୁଆରେ ୭ଟି କୁଡ଼ୁଆ ଉପରକୁ ଉପର ରଖି କାଠ ନିଆଁରେ ରନ୍ଧାଯାଏ। ଏହି ଅଭଡ଼ା ମହାପ୍ରସାଦକୁ ଆନନ୍ଦ ବଜାରରେ ହଜାର ହଜାର ଭକ୍ତ ସେବନ କରନ୍ତି।",
      speech_text_or: "Shree Jagannath Mandira rosaghara bishwara sabutharu bishala rosaghara. Ethare pratidina Mahaprabhunka pain 56 prakarara Mahaprasada mati kudua re 7 ti kudua uparaku upara rakhi katha nianre randhajae."
    },
    rathayatra: {
      expression: 'safety',
      title_en: "5. World Famous Ratha Yatra & Nabakalebara (Wikipedia Archive)",
      title_hi: "5. विश्व प्रसिद्ध रथ यात्रा एवं नवकलेवर अनुष्ठान",
      title_or: "୫. ବିଶ୍ୱପ୍ରସିଦ୍ଧ ଘୋଷଯାତ୍ରା ଓ ନବକଳେବର",
      chapter_en: "Chapter V: Festivals & Rituals",
      chapter_hi: "अध्याय 5: भव्य रथ यात्रा उत्सव",
      chapter_or: "ଅଧ୍ୟାୟ ୫: ବିଶ୍ୱପ୍ରସିଦ୍ଧ ଘୋଷଯାତ୍ରା ଓ ନବକଳେବର (ସମ୍ପୂର୍ଣ୍ଣ)",
      text_en: "Wikipedia describes the annual Ratha Yatra (Chariot Festival) where Lord Jagannath, Lord Balabhadra, and Devi Subhadra are pulled on three grand wooden chariots (Nandighosha, Taladhwaja, Darpadalana) to Gundicha Temple. The temple also observes Nabakalebara, a sacred re-embodiment ritual performed every 12 to 19 years.",
      text_hi: "विश्व प्रसिद्ध रथ यात्रा जगन्नाथ मंदिर का सबसे बड़ा उत्सव है। इसमें भगवान जगन्नाथ नंदीघोष रथ पर, बलभद्र तालध्वज रथ पर और सुभद्रा दर्पदलन रथ पर सवार होकर गुंडिचा मंदिर जाते हैं।",
      text_or: "ବିଶ୍ୱପ୍ରସିଦ୍ଧ ଘୋଷଯାତ୍ରାରେ ମହାପ୍ରଭୁ ଶ୍ରୀଜଗନ୍ନାଥ (ନନ୍ଦିଘୋଷ), ବଳଭଦ୍ର (ତାଳଧ୍ୱଜ) ଓ ଦେବୀ ସୁଭଦ୍ରା (ଦର୍ପଦଳନ) ତିନୋଟି ବିଶାଳ ରଥରେ ବିଜେ କରି ଗୁଣ୍ଡିଚା ମନ୍ଦିର ଜାଆନ୍ତି। ପ୍ରତି ୧୨ ରୁ ୧୯ ବର୍ଷରେ ପବିତ୍ର ନବକଳେବର ଅନୁଷ୍ଠିତ ହୁଏ, ଯେଉଁଥିରେ ପବିତ୍ର ନୀମ ଦାରୁରୁ ନୂତନ ବିଗ୍ରହ ନିର୍ମାଣ କରାଯାଏ।",
      speech_text_or: "Bishwaprasiddha Ghosayatra re Mahaprabhu Shree Jagannath Nandighosha rathare, Balabhadra Taladhwaja rathare o Devi Subhadra Darpadalana rathare bije jaanti."
    }
  };

  const currentTopicData = wikiKnowledgeBase[activeTopic] || wikiKnowledgeBase.overview;

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        availableVoicesRef.current = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    const textKey = `text_${selectedLang}`;
    setSubtitleText(currentTopicData[textKey] || currentTopicData.text_or || currentTopicData.text_hi || currentTopicData.text_en);
    if (currentTopicData.expression) {
      setExpressionMode(currentTopicData.expression);
    }
  }, [activeTopic, selectedLang]);

  // THREE.JS YOUTH / YOUNG INDIAN MALE AI AVATAR MODEL ENGINE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 440;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.1, 7.2);
    camera.lookAt(0, 2.3, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2.3, 0);
    controls.maxPolarAngle = Math.PI / 1.8;
    controls.minDistance = 4;
    controls.maxDistance = 12;

    // Vibrant Youth Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.3);
    scene.add(ambientLight);

    const keyAmberLight = new THREE.DirectionalLight(0xf59e0b, 2.4);
    keyAmberLight.position.set(4, 8, 5);
    keyAmberLight.castShadow = true;
    scene.add(keyAmberLight);

    const rimMagentaLight = new THREE.PointLight(0xbe185d, 2.0, 20);
    rimMagentaLight.position.set(-4, 5, -2);
    scene.add(rimMagentaLight);

    const fillSkyLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fillSkyLight.position.set(-5, 4, 4);
    scene.add(fillSkyLight);

    // =========================================================================
    // --- BUILD FRESH YOUNG INDIAN MALE 3D HUMAN AVATAR CHARACTER MESH ---
    // =========================================================================
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;

    // 1. Pedestal Base
    const pedestalBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 0.35, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 })
    );
    pedestalBase.position.y = 0.18;
    avatarGroup.add(pedestalBase);

    // 2. Smooth Radiant Youthful Indian Skin Material
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf0b892, // Radiant Fresh Indian Youth Skin Tone
      roughness: 0.32,
      metalness: 0.03
    });

    // 3. Bright Yellow Silk Dhoti with Crisp Red Border
    const dhotiMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.08 });
    const dhotiBorderMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.12 });

    const dhotiTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.80, 2.1, 32), dhotiMat);
    dhotiTorso.position.y = 1.45;
    avatarGroup.add(dhotiTorso);

    const dhotiHem = new THREE.Mesh(new THREE.CylinderGeometry(0.81, 0.82, 0.12, 32), dhotiBorderMat);
    dhotiHem.position.y = 0.45;
    avatarGroup.add(dhotiHem);

    // Dhoti Waist Folds
    for (let f = -2; f <= 2; f++) {
      const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 1.8, 12), dhotiMat);
      fold.position.set(f * 0.16, 1.35, 0.62);
      fold.rotation.z = f * 0.04;
      avatarGroup.add(fold);
    }

    // 4. Rich Magenta/Pink Uttariya Shawl with Golden Trim
    const shawlMat = new THREE.MeshStandardMaterial({ color: 0xbe185d, roughness: 0.35, metalness: 0.12 });
    const shawlGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.75 });

    const shawlLoop = new THREE.Mesh(new THREE.TorusGeometry(0.80, 0.15, 20, 36), shawlMat);
    shawlLoop.position.set(0, 2.15, 0);
    shawlLoop.rotation.x = Math.PI / 2.8;
    shawlLoop.rotation.z = -Math.PI / 12;
    avatarGroup.add(shawlLoop);

    const shawlDrapeRight = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 1.4, 20), shawlMat);
    shawlDrapeRight.position.set(0.61, 1.5, 0.15);
    shawlDrapeRight.rotation.z = -Math.PI / 16;
    avatarGroup.add(shawlDrapeRight);

    const shawlGoldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.035, 16, 36), shawlGoldMat);
    shawlGoldTrim.position.set(0, 2.15, 0);
    shawlGoldTrim.rotation.x = Math.PI / 2.8;
    avatarGroup.add(shawlGoldTrim);

    // 5. Traditional Gold Chain & Dark Brown Rudraksha Mala
    const goldChainMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.85 });
    const rudrakshaMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, metalness: 0.0 });

    const goldChain = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.026, 16, 36), goldChainMat);
    goldChain.position.set(0, 2.48, 0.12);
    goldChain.rotation.x = Math.PI / 2.4;
    avatarGroup.add(goldChain);

    const rudrakshaGroup = new THREE.Group();
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), rudrakshaMat);
      bead.position.set(Math.cos(angle) * 0.54, 2.45 - Math.sin(angle) * 0.15, Math.sin(angle) * 0.32 + 0.1);
      rudrakshaGroup.add(bead);
    }
    avatarGroup.add(rudrakshaGroup);

    // 6. Youthful Slender Neck & Head Group
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.42, 24), skinMat);
    neck.position.y = 2.75;
    avatarGroup.add(neck);

    const headGroup = new THREE.Group();
    headRef.current = headGroup;
    headGroup.position.set(0, 3.25, 0);

    // Smooth Youthful Sculpted Head Sphere
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.50, 36, 36), skinMat);
    headGroup.add(headMesh);

    // Youthful Sculpted Nose & Ears
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.20, 16), skinMat);
    nose.position.set(0, 0.02, 0.52);
    nose.rotation.x = -Math.PI / 10;
    headGroup.add(nose);

    const earGeo = new THREE.SphereGeometry(0.11, 16, 16);
    earGeo.scale(0.5, 1, 0.6);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.51, 0.02, 0);
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.51, 0.02, 0);
    headGroup.add(earR);

    // Traditional Red Chandan Forehead Tilak & Gold Bindu
    const tilakRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
    const tilakRed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.04), tilakRedMat);
    tilakRed.position.set(0, 0.18, 0.49);
    headGroup.add(tilakRed);

    const binduMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.5 });
    const tilakBindu = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), binduMat);
    tilakBindu.position.set(0, 0.18, 0.51);
    headGroup.add(tilakBindu);

    // Stylish Modern Side-Swept Youth Haircut
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1715, roughness: 0.75, metalness: 0.05 });
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.54, 28, 28), hairMat);
    hairTop.position.set(0, 0.17, -0.04);
    headGroup.add(hairTop);

    // Stylish Youth Front Fringe Volume Strands
    for (let c = -4; c <= 4; c++) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), hairMat);
      curl.position.set(c * 0.09, 0.41, 0.39);
      headGroup.add(curl);
    }

    // Expressive Youth Eyebrows
    const eyebrowMat = new THREE.MeshStandardMaterial({ color: 0x1c1715, roughness: 0.8 });
    const eyebrowGeo = new THREE.BoxGeometry(0.14, 0.025, 0.03);

    const eyebrowL = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    eyebrowL.position.set(-0.16, 0.14, 0.48);
    eyebrowL.rotation.z = Math.PI / 36;
    eyebrowLRef.current = eyebrowL;
    headGroup.add(eyebrowL);

    const eyebrowR = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    eyebrowR.position.set(0.16, 0.14, 0.48);
    eyebrowR.rotation.z = -Math.PI / 36;
    eyebrowRRef.current = eyebrowR;
    headGroup.add(eyebrowR);

    // Bright Expressive Youth 3D Eyes with Pupil Specular Highlight
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x291a10, roughness: 0.05, metalness: 0.95 });

    const eyeLGroup = new THREE.Group();
    eyeLGroup.position.set(-0.16, 0.04, 0.45);
    const eyeLSphere = new THREE.Mesh(new THREE.SphereGeometry(0.070, 20, 20), eyeWhiteMat);
    const irisL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), irisMat);
    irisL.position.z = 0.05;
    eyeLGroup.add(eyeLSphere);
    eyeLGroup.add(irisL);
    eyeLRef.current = eyeLGroup;
    headGroup.add(eyeLGroup);

    const eyeRGroup = new THREE.Group();
    eyeRGroup.position.set(0.16, 0.04, 0.45);
    const eyeRSphere = new THREE.Mesh(new THREE.SphereGeometry(0.070, 20, 20), eyeWhiteMat);
    const irisR = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), irisMat);
    irisR.position.z = 0.05;
    eyeRGroup.add(eyeRSphere);
    eyeRGroup.add(irisR);
    eyeRRef.current = eyeRGroup;
    headGroup.add(eyeRGroup);

    // Clean White Teeth & Youthful Smiling Lips Mesh
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.03), teethMat);
    teeth.position.set(0, -0.20, 0.46);
    headGroup.add(teeth);

    const lipMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 });
    const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.065, 0.05), lipMat);
    mouthMesh.position.set(0, -0.21, 0.48);
    mouthRef.current = mouthMesh;
    headGroup.add(mouthMesh);

    avatarGroup.add(headGroup);

    // 7. Youthful Arms & 5-Finger Hands in Namaste Pose 🙏
    const armMat = skinMat;
    const armGeo = new THREE.CylinderGeometry(0.135, 0.115, 1.05, 20);

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.38, 1.85, 0.48);
    leftArm.rotation.z = -Math.PI / 4.2;
    leftArm.rotation.y = Math.PI / 5.5;
    avatarGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.38, 1.85, 0.48);
    rightArm.rotation.z = Math.PI / 4.2;
    rightArm.rotation.y = -Math.PI / 5.5;
    avatarGroup.add(rightArm);

    const palmL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.21, 0.08), armMat);
    palmL.position.set(-0.06, 2.15, 0.68);
    avatarGroup.add(palmL);

    const palmR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.21, 0.08), armMat);
    palmR.position.set(0.06, 2.15, 0.68);
    avatarGroup.add(palmR);

    // 5 Individual Sculpted Fingers on Each Hand
    for (let f = 0; f < 5; f++) {
      const fingerGeo = new THREE.CylinderGeometry(0.0135, 0.0135, 0.15, 10);
      
      const fingerL = new THREE.Mesh(fingerGeo, skinMat);
      fingerL.position.set(-0.05, 2.25 + (f * 0.02), 0.70 - (f * 0.03));
      fingerL.rotation.z = Math.PI / 20;
      avatarGroup.add(fingerL);

      const fingerR = new THREE.Mesh(fingerGeo, skinMat);
      fingerR.position.set(0.05, 2.25 + (f * 0.02), 0.70 - (f * 0.03));
      fingerR.rotation.z = -Math.PI / 20;
      avatarGroup.add(fingerR);
    }

    scene.add(avatarGroup);

    // Render Animation Loop with Eyebrow Movement, Blinking & Lip Sync
    let clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      controls.update();

      // Idle breathing movement
      avatarGroup.position.y = Math.sin(time * 2.2) * 0.03;

      // Natural eye blinking loop (~every 3.5s)
      const blinkTime = time % 3.5;
      const isBlinking = blinkTime > 3.35;
      if (eyeLRef.current && eyeRRef.current) {
        const eyeScaleY = isBlinking ? 0.1 : 1.0;
        eyeLRef.current.scale.y = eyeScaleY;
        eyeRRef.current.scale.y = eyeScaleY;
      }

      // Dynamic Youth Eyebrow & Speech Animations
      if (isPlaying && !isPaused) {
        if (mouthRef.current) {
          mouthRef.current.scale.y = 1 + Math.sin(time * 19) * 0.85;
          mouthRef.current.scale.x = 1 + Math.cos(time * 14) * 0.25;
        }

        if (headRef.current) {
          headRef.current.rotation.y = Math.sin(time * 2.8) * 0.14;
          headRef.current.rotation.x = Math.cos(time * 3.2) * 0.07;
        }

        if (eyebrowLRef.current && eyebrowRRef.current) {
          eyebrowLRef.current.position.y = 0.14 + Math.sin(time * 4) * 0.015;
          eyebrowRRef.current.position.y = 0.14 + Math.sin(time * 4) * 0.015;
        }
      } else {
        if (mouthRef.current) mouthRef.current.scale.set(1, 1, 1);
        if (headRef.current) headRef.current.rotation.set(0, 0, 0);
        if (eyebrowLRef.current && eyebrowRRef.current) {
          eyebrowLRef.current.position.y = 0.14;
          eyebrowRRef.current.position.y = 0.14;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      controls.dispose();
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [isPlaying, isPaused]);

  // STOP ALL AUDIO & SPEECH INSTANCES
  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  // GUARANTEED SPEECH SYNTHESIS ENGINE (DUAL TTS ENGINE)
  const handleStartNarration = (textOverride = null, langToUse = selectedLang) => {
    setAudioNotice('');

    // RESUME IF PAUSED
    if (isPaused) {
      if (currentAudioRef.current) {
        currentAudioRef.current.play();
        setIsPaused(false);
        setIsPlaying(true);
        setAudioNotice('▶️ Resumed Audio Speech...');
        return;
      }
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsPlaying(true);
        setAudioNotice('▶️ Resumed Web Speech...');
        return;
      }
    }

    // PAUSE IF PLAYING
    if (isPlaying && !isPaused) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        setIsPaused(true);
        setAudioNotice('⏸️ Audio Paused (Press Resume to continue)');
        return;
      }
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setAudioNotice('⏸️ Speech Paused (Press Resume to continue)');
        return;
      }
      stopAllAudio();
      return;
    }

    stopAllAudio();

    let textToSpeak = textOverride || currentTopicData[`text_${langToUse}`] || currentTopicData.text_or || currentTopicData.text_en;
    let ttsLangCode = langToUse === 'or' ? 'hi' : langToUse === 'hi' ? 'hi' : 'en';

    setSubtitleText(textToSpeak);

    // ENGINE 1: Responsive High-Quality Cloud Voice Audio Endpoint
    const cleanText = (langToUse === 'or' ? (textOverride || currentTopicData.speech_text_or || currentTopicData.text_or) : textToSpeak).slice(0, 200);
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLangCode}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

    const audio = new Audio(googleTtsUrl);
    audio.playbackRate = voiceSpeed;
    audio.volume = isMuted ? 0 : 1.0;
    currentAudioRef.current = audio;

    audio.onplay = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setAudioNotice(`🔊 Youth Avatar Speaking in ${langToUse === 'or' ? 'Odia (ଓଡ଼ିଆ)' : langToUse === 'hi' ? 'Hindi (हिन्दी)' : 'English'}...`);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
      currentAudioRef.current = null;
      setAudioNotice('');
    };

    audio.onerror = () => {
      // ENGINE 2: Web Speech Synthesis Fallback
      currentAudioRef.current = null;

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        speechUtteranceRef.current = utterance;
        utterance.lang = langToUse === 'or' ? 'hi-IN' : langToUse === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = (langToUse === 'or' ? 0.88 : 0.95) * voiceSpeed;
        utterance.pitch = 1.0;
        utterance.volume = isMuted ? 0 : 1.0;

        const voices = availableVoicesRef.current.length > 0 ? availableVoicesRef.current : window.speechSynthesis.getVoices();
        const indianVoice = voices.find(v => v.lang.includes('IN') || v.lang.includes('hi') || v.name.includes('India'));
        if (indianVoice) utterance.voice = indianVoice;

        utterance.onstart = () => {
          setIsPlaying(true);
          setIsPaused(false);
          setAudioNotice(`🔊 Speaking via System Voice Engine...`);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setIsPaused(false);
          setAudioNotice('');
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          setIsPaused(false);
          setAudioNotice('');
        };

        window.speechSynthesis.speak(utterance);
      }
    };

    audio.play().catch(err => {
      console.warn("Cloud Audio Autoplay blocked, triggering Web Speech API fallback:", err);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langToUse === 'or' ? 'hi-IN' : langToUse === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = voiceSpeed;
        utterance.onstart = () => {
          setIsPlaying(true);
          setIsPaused(false);
        };
        utterance.onend = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  const handleReplay = () => {
    stopAllAudio();
    setTimeout(() => {
      handleStartNarration();
    }, 120);
  };

  const handleToggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = newMuteState ? 0 : 1.0;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking && speechUtteranceRef.current) {
      speechUtteranceRef.current.volume = newMuteState ? 0 : 1.0;
    }
  };

  const handleSpeedChange = (speed) => {
    setVoiceSpeed(speed);
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = speed;
    }
    if (isPlaying) {
      stopAllAudio();
      setTimeout(() => {
        handleStartNarration();
      }, 120);
    }
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLang(newLang);
    if (isPlaying) {
      handleStartNarration(null, newLang);
    }
  };

  const handleTopicSelect = (topicKey) => {
    setActiveTopic(topicKey);
    if (onSelectTopic) onSelectTopic(topicKey);
    stopAllAudio();
  };

  const handleSendVisitorQuery = (e) => {
    if (e) e.preventDefault();
    if (!userQuery.trim()) return;

    const query = userQuery.trim();
    setUserQuery('');

    const newLog = [...chatLog, { sender: 'visitor', text: query }];
    setChatLog(newLog);

    let responseText = "";
    let expr = "history";

    const qLower = query.toLowerCase();
    if (qLower.includes('jagannath temple') || qLower.includes('temple')) {
      responseText = "Certainly! The Shree Jagannath Temple of Puri is a magnificent 12th-century sanctuary constructed by King Anantavarman Chodaganga Deva. Its 65-meter spire dominates the skyline and houses Lord Jagannath, Balabhadra, and Devi Subhadra.";
      expr = "history";
    } else if (qLower.includes('mahaprasad') || qLower.includes('food') || qLower.includes('prasad')) {
      responseText = "Mahaprasad is cooked in the world's largest traditional temple kitchen! 56 varieties of sacred food are prepared daily in thousands of clay pots over wood fires, then served to devotees at Anand Bazaar.";
      expr = "discovery";
    } else if (qLower.includes('flag') || qLower.includes('nila chakra') || qLower.includes('bana')) {
      responseText = "The Nila Chakra is a sacred 8-spoked alloy wheel atop the 65-meter temple spire. Daily, Chunara servitors scale the spire to change the Patita Pavana flag, which uniquely flutters against the direction of the wind!";
      expr = "important";
    } else if (qLower.includes('ratha') || qLower.includes('chariot') || qLower.includes('festival')) {
      responseText = "The annual Ratha Yatra is Puri's most grand spectacle! Millions of pilgrims pull the three giant wooden chariots — Nandighosha, Taladhwaja, and Darpadalana — from Jagannath Temple to Gundicha Temple.";
      expr = "safety";
    } else if (qLower.includes('hello') || qLower.includes('namaste') || qLower.includes('hi')) {
      responseText = "Namaste! Welcome to Puri. I am your Youth AI Heritage Guide. I am delighted to share the glorious culture and traditions of Odisha with you.";
      expr = "welcome";
    } else {
      responseText = `Thank you for asking about "${query}". Puri is a treasury of ancient legends, Kalinga architecture, and sacred traditions. Let me guide you through our historical archives!`;
      expr = "important";
    }

    setExpressionMode(expr);
    setChatLog(prev => [...prev, { sender: 'avatar', text: responseText }]);

    stopAllAudio();
    setTimeout(() => {
      handleStartNarration(responseText, selectedLang);
    }, 150);
  };

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please type your question.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang === 'or' ? 'or-IN' : selectedLang === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListeningMic(true);
      setAudioNotice('🎙️ Listening to your question...');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListeningMic(false);
      setUserQuery(transcript);
    };

    recognition.onerror = () => {
      setIsListeningMic(false);
      setAudioNotice('');
    };

    recognition.onend = () => {
      setIsListeningMic(false);
    };

    recognition.start();
  };

  const renderExpressionBadge = () => {
    switch (expressionMode) {
      case 'welcome':
        return <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><HeartHandshake size={14} /> WELCOME: Friendly Namaste Pose 🙏</span>;
      case 'history':
        return <span style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} /> HISTORICAL STORY: Confident & Calming</span>;
      case 'important':
        return <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><Lightbulb size={14} /> IMPORTANT FACT: Focused Eye Contact</span>;
      case 'discovery':
        return <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={14} /> EXCITING DISCOVERY: Expressive Smile</span>;
      case 'safety':
        return <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14} /> SAFETY INFO: Reassuring Posture</span>;
      default:
        return <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}><HeartHandshake size={14} /> FAREWELL: Warm Namaste 🙏</span>;
    }
  };

  return (
    <div style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '18px', border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User style={{ color: 'var(--accent-cyan)' }} />
            Youth AI Heritage Guide • Shree Jagannath Temple Sevayat
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            "Welcome to Puri — I am your Youth AI Heritage Guide." • Speaks Odia (ଓଡ଼ିଆ), Hindi (हिन्दी) & English Natively
          </span>
        </div>

        {/* Dynamic Facial Expression Badge */}
        <div>
          {renderExpressionBadge()}
        </div>
      </div>

      {/* 2. Main Avatar Display & Teleprompter Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr', gap: '20px', alignItems: 'start' }}>
        
        {/* EXCLUSIVE YOUTH 3D WEBGL HUMAN AVATAR MODEL VIEWPORT */}
        <div style={{ position: 'relative', width: '100%', height: '440px', borderRadius: '16px', overflow: 'hidden', border: '2px solid #f59e0b', boxShadow: '0 8px 30px rgba(245, 158, 11, 0.25)', background: '#090d16' }}>
          
          <div
            ref={mountRef}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'grab'
            }}
          />

          {/* Bottom Badge Bar */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            background: 'rgba(15, 23, 42, 0.92)',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            fontSize: '11px',
            color: '#fbbf24',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 5
          }}>
            <span>🙏 "Welcome to Puri — I am your Youth AI Heritage Guide."</span>
            <span>Puri, Odisha</span>
          </div>

          {/* Top Left Language Selector */}
          <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 10, display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.85)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {[
              { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
              { code: 'hi', label: 'हिन्दी (Hindi)' },
              { code: 'en', label: 'English' }
            ].map(l => (
              <button
                key={l.code}
                onClick={() => handleLanguageChange(l.code)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedLang === l.code ? 'var(--accent-cyan)' : 'transparent',
                  color: selectedLang === l.code ? '#000' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Top Right Media Suite Toolbar (Play, Pause, Replay, Mute) */}
          <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            <button
              onClick={() => handleStartNarration()}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 800,
                borderRadius: '20px',
                border: 'none',
                background: isPlaying && !isPaused ? '#ef4444' : isPaused ? '#f59e0b' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isPlaying && !isPaused ? <Pause size={15} /> : <Play size={15} />}
              {isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume ▶️' : 'Speak Voice 🙏'}
            </button>

            <button
              onClick={handleReplay}
              title="Replay from start"
              style={{
                padding: '8px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.85)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
            </button>

            <button
              onClick={handleToggleMute}
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
              style={{
                padding: '8px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(15, 23, 42, 0.85)',
                color: isMuted ? '#ef4444' : 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>

          {/* Voice Speed Control Slider Pill */}
          <div style={{ position: 'absolute', bottom: '52px', right: '14px', zIndex: 10, background: 'rgba(15, 23, 42, 0.85)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Speed:</span>
            {[0.75, 1.0, 1.25, 1.5].map(s => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '6px',
                  border: 'none',
                  background: voiceSpeed === s ? '#f59e0b' : 'transparent',
                  color: voiceSpeed === s ? '#000' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* TELEPROMPTER & INTERACTIVE CONTINUOUS CONVERSATION CHAT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Chapter Selector Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>
              Select Heritage Topic:
            </span>

            {Object.keys(wikiKnowledgeBase).map((tKey) => {
              const item = wikiKnowledgeBase[tKey];
              const titleKey = `title_${selectedLang}`;
              const isCurrent = activeTopic === tKey;
              return (
                <button
                  key={tKey}
                  onClick={() => handleTopicSelect(tKey)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: isCurrent ? 800 : 600,
                    borderRadius: '10px',
                    border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                    background: isCurrent ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
                    color: isCurrent ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{item[titleKey] || item.title_or || item.title_en}</span>
                  {isCurrent && <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />}
                </button>
              );
            })}
          </div>

          {/* Subtitle Teleprompter Box */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <BookOpen size={13} /> {currentTopicData[`chapter_${selectedLang}`] || currentTopicData.chapter_or}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {isPlaying && !isPaused ? '🔴 SPEAKING LIVE' : isPaused ? '⏸️ PAUSED' : '⚪ IDLE'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{subtitleText}"
            </p>

            {audioNotice && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>
                {audioNotice}
              </div>
            )}
          </div>

          {/* CONTINUOUS CONVERSATION INTERACTIVE CHAT BAR */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <MessageSquare size={13} /> Ask Visitor Question to Youth AI Heritage Guide:
            </span>

            <form onSubmit={handleSendVisitorQuery} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="e.g. Tell me about the Jagannath Temple..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.4)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />

              <button
                type="button"
                onClick={handleMicClick}
                title="Speak question via microphone"
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isListeningMic ? '#ef4444' : 'rgba(255,255,255,0.08)',
                  color: isListeningMic ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <Mic size={15} />
              </button>

              <button
                type="submit"
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent-cyan)',
                  color: '#000',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Send size={14} /> Ask
              </button>
            </form>
          </div>

        </div>
      </div>

    </div>
  );
}
