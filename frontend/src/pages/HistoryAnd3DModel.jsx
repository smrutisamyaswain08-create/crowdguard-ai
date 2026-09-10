import React, { useState } from 'react';
import { History, Compass, Landmark, BookOpen, Bot, Sparkles, Navigation } from 'lucide-react';
import Heritage3DViewer from '../components/Heritage3DViewer';
import KonarkSunTemple3DViewer from '../components/KonarkSunTemple3DViewer';
import AIPersonAvatarGuide from '../components/AIPersonAvatarGuide';

export default function HistoryAnd3DModel() {
  const [historySiteId, setHistorySiteId] = useState('jagannath_temple');

  const historyData = {
    jagannath_temple: {
      id: 'jagannath_temple',
      name: 'Shree Jagannath Temple Puri',
      built_era: '12th Century CE (King Anantavarman Chodaganga Deva)',
      architectural_style: 'Kalinga Architecture (Rekha Deula & Pida Deula)',
      way_to_reach: '🚆 2.5 km from Puri Railway Station via Bada Danda Grand Road | ✈️ 56 km from Biju Patnaik Airport (BBI) via NH316 Highway. Free battery rickshaws available from Jagannath Ballav Parking.',
      history_en: 'Constructed in the 12th century CE by King Anantavarman Chodaganga Deva of the Eastern Ganga Dynasty, Shree Jagannath Temple is one of the revered Char Dham pilgrimage sites. The temple houses Lord Jagannath, Lord Balabhadra, and Devi Subhadra. Renowned for its 65m high Vimana spire topped with the sacred gold Neelachakra, 20-foot high Meghanada Pacheri fortification walls, and the annual world-famous Ratha Yatra (Chariot Festival).',
      history_hi: '12वीं शताब्दी में पूर्वी गंगा राजवंश के राजा अनंतवर्मन चोडगंगा देव द्वारा निर्मित, श्री जगन्नाथ मंदिर पवित्र चार धाम तीर्थस्थलों में से एक है। इस मंदिर में भगवान जगन्नाथ, भगवान बलभद्र और देवी सुभद्रा विराजमान हैं। यह अपने 65 मीटर ऊंचे शिखर, सुनहरे नीलचक्र, 20 फीट ऊंची मेघनाद पचेरी परकोटे और विश्व प्रसिद्ध वार्षिक रथ यात्रा के लिए जाना जाता है।',
      history_or: 'ଦ୍ୱାଦଶ ଶତାବ୍ଦୀରେ ପୂର୍ବ ଗଙ୍ଗ ବଂଶର ରାଜା ଅନନ୍ତବର୍ମନ୍ ଚୋଡ଼ଗଙ୍ଗ ଦେବଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ, ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିର ଚାରିଧାମ ମଧ୍ୟରୁ ଅନ୍ୟତମ। ଏଠାରେ ମହାପ୍ରଭୁ ଶ୍ରୀଜଗନ୍ନାଥ, ବଳଭଦ୍ର ଓ ଦେବୀ ସୁଭଦ୍ରା ପୂଜା ପାଆନ୍ତି। ୬୫ ମିଟର ଉଚ୍ଚତା ବିଶିଷ୍ଟ ନୀଳଚକ୍ର, ମେଘନାଦ ପାଚେରୀ ଏବଂ ବିଶ୍ୱପ୍ରସିଦ୍ଧ ଘୋଷଯାତ୍ରା (ରଥଯାତ୍ରା) ପାଇଁ ଏହା ଜଗତପ୍ରସିଦ୍ଧ।'
    },
    konark_temple: {
      id: 'konark_temple',
      name: 'Konark Sun Temple Monumental Stone Chariot',
      built_era: '13th Century CE (King Narasimhadeva I, 1250 CE)',
      architectural_style: 'Kalinga Solitary Chariot Architecture (UNESCO World Heritage Site)',
      way_to_reach: '🚗 32 km from Puri along Puri-Konark Marine Drive Driveway | 🚌 Frequent OSRTC AC tourist buses available every 30 mins from Puri Central Bus Stand.',
      history_en: 'Conceived as a giant 100-foot stone chariot of Sun God Surya, the Konark Sun Temple was built in 1250 CE by King Narasimhadeva I. The monument features 12 pairs of 24 intricately carved monolithic stone wheels that function as accurate sundials, pulled by 7 galloping stone horses. It represents the pinnacle of Kalinga stone artistry and is a UNESCO World Heritage site.',
      history_hi: 'सूर्य देव के 100 फीट ऊंचे विशाल पत्थर के रथ के रूप में निर्मित, कोणार्क सूर्य मंदिर का निर्माण 1250 ईस्वी में राजा नरसिंहदेव प्रथम द्वारा करवाया गया था। इस स्मारक में 24 नक्काशीदार पहिये हैं जो सटीक धूपघड़ी के रूप में कार्य करते हैं और 7 सरपट दौड़ते पत्थर के घोड़ों द्वारा खींचे जाते हैं। यह यूनेस्को विश्व धरोहर स्थल है।',
      history_or: '୧୩ଶ ଶତାବ୍ଦୀରେ (୧୨୫୦ ଖ୍ରୀଷ୍ଟାବ୍ଦ) ରାଜା ଲାଙ୍ଗୁଳା ନରସିଂହ ଦେବଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ଏକ ବିଶାଳ ପଥର ରଥ ଆକୃତିର। ଏଥିରେ ୨୪ଟି ଖୋଦିତ ଚକ ଏବଂ ୭ଟି ଘୋଡ଼ା ରହିଛି। ଏହା ୟୁନେସ୍କୋ ଦ୍ୱାରା ବିଶ୍ୱ ଐତିହ୍ୟ ସ୍ଥଳ ଭାବେ ମାନ୍ୟତା ପ୍ରାପ୍ତ।'
    },
    puri_golden_beach: {
      id: 'puri_golden_beach',
      name: 'Puri Golden Sea Beach & Swargadwar',
      built_era: 'Historic Coastal Shore & Blue Flag Haven',
      architectural_style: 'Natural Coastal Bay & Beach Promenade Corridor',
      way_to_reach: '🚶 0.4 km from Beach Road Hotels | 🚕 10 mins from Puri Railway Station. Walkable from Swargadwar Promenade & Light House Drive.',
      history_en: 'Puri Golden Sea Beach is a world-renowned coastal shore along the Bay of Bengal, awarded the international "Blue Flag" certification for eco-cleanliness and safety. Famous for sacred holy dips, vibrant evening craft markets, lifeguard watch towers, and world-class sand art sculptures created by Padma Shri Sudarsan Pattnaik.',
      history_hi: 'बंगाल की खाड़ी के साथ पूरी गोल्ड सी बीच एक विश्व प्रसिद्ध तटीय तट है, जिसे पर्यावरण-स्वच्छता और सुरक्षा के लिए अंतर्राष्ट्रीय "ब्लू फ्लैग" प्रमाणन से सम्मानित किया गया है। यह अपने सुनहरे रेत, शाम के हस्तशिल्प बाजारों और पद्म श्री सुदर्शन पटनायक द्वारा बनाई गई बालू कला के लिए प्रसिद्ध है।',
      history_or: 'ବଙ୍ଗୋପସାଗର କୂଳରେ ଅବସ୍ଥିତ ପୁରୀ ସୁବର୍ଣ୍ଣ ବେଳାଭୂମି ଅନ୍ତର୍ଜାତୀୟ "ବ୍ଲୁ ଫ୍ଲାଗ୍" ମାନ୍ୟତା ପ୍ରାପ୍ତ। ପଦ୍ମଶ୍ରୀ ସୁଦର୍ଶନ ପଟ୍ଟନାୟକଙ୍କ ବାଲୁକା ଶିଳ୍ପ, ସନ୍ଧ୍ୟା ବେଳାଭୂମି ବଜାର ଏବଂ ପବିତ୍ର ସମୁଦ୍ର ସ୍ନାନ ପାଇଁ ଏହା ପ୍ରସିଦ୍ଧ।'
    }
  };

  const activeHistory = historyData[historySiteId] || historyData.jagannath_temple;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', padding: '10px 0' }}>
      
      {/* 1. Header Banner */}
      <div className="page-header-box" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 25px',
        marginBottom: 0,
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Landmark style={{ color: 'var(--accent-cyan)' }} />
            History & 3D Interactive Model Portal
          </h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Wikipedia-trained AI 3D Avatar Tour Guide & interactive 3D WebGL models of Shree Jagannath Temple & Konark Sun Temple, Odisha.
          </p>
        </div>
      </div>

      {/* 2. SECTION 1: AI 3D AVATAR HERITAGE GUIDE (WIKIPEDIA TRAINED) */}
      <AIPersonAvatarGuide />

      {/* 3. SECTION 2: KNOW THE HISTORY & INTERACTIVE 3D TEMPLE ARCHITECTURE MODEL */}
      <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '18px', border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={24} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                Know The History & Interactive 3D Architectural Models
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Select any Odisha heritage site to view 3D WebGL model, 24 sundial wheels, 7 horses & history in English, Hindi (हिन्दी) & Odia (ଓଡ଼ିଆ).
              </span>
            </div>
          </div>

          {/* Location Selector Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setHistorySiteId('jagannath_temple')}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid var(--accent-cyan)',
                background: historySiteId === 'jagannath_temple' ? 'var(--accent-cyan)' : 'transparent',
                color: historySiteId === 'jagannath_temple' ? '#000' : 'var(--accent-cyan)',
                cursor: 'pointer'
              }}
            >
              🛕 Shree Jagannath Temple 3D
            </button>

            <button
              onClick={() => setHistorySiteId('konark_temple')}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #f59e0b',
                background: historySiteId === 'konark_temple' ? '#f59e0b' : 'transparent',
                color: historySiteId === 'konark_temple' ? '#000' : '#fbbf24',
                cursor: 'pointer'
              }}
            >
              🏛️ Konark Sun Temple (24 Wheels & 7 Horses 3D)
            </button>

            <button
              onClick={() => setHistorySiteId('puri_golden_beach')}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #38bdf8',
                background: historySiteId === 'puri_golden_beach' ? '#38bdf8' : 'transparent',
                color: historySiteId === 'puri_golden_beach' ? '#000' : '#38bdf8',
                cursor: 'pointer'
              }}
            >
              🏖️ Puri Golden Beach 3D
            </button>
          </div>
        </div>

        {/* 3D Model View Selection */}
        {historySiteId === 'konark_temple' ? (
          <KonarkSunTemple3DViewer />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '22px', alignItems: 'start' }}>
            <div>
              <Heritage3DViewer siteId={activeHistory.id} siteName={activeHistory.name} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: 0, fontSize: '17px', color: 'var(--accent-cyan)' }}>{activeHistory.name}</h4>
                <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600, display: 'block', marginTop: '3px' }}>
                  🏛️ Era: {activeHistory.built_era}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                  🎨 Style: {activeHistory.architectural_style}
                </span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🇬🇧 English History:
                  </strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {activeHistory.history_en}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <strong style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🇮🇳 हिन्दी (Hindi) इतिहास:
                  </strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {activeHistory.history_hi}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <strong style={{ fontSize: '12px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🇮🇳 ଓଡ଼ିଆ (Odia) ଇତିହାସ:
                  </strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {activeHistory.history_or}
                  </p>
                </div>
              </div>

              <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Navigation size={14} /> How to Reach:
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {activeHistory.way_to_reach}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
