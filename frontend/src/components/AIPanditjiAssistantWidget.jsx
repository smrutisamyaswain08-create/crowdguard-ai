import React, { useState, useEffect, useRef } from 'react';
import { Bot, Volume2, VolumeX, MessageSquare, Sparkles, X, Send, Languages, Mic, HelpCircle, Shield, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { panditAvatarBase64 } from '../assets/panditAvatarBase64';
import { useAuth } from '../context/AuthContext';

export default function AIPanditjiAssistantWidget({ activeTab }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('or'); // 'or' (Odia), 'hi' (Hindi), 'en' (English)
  const [isPlaying, setIsPlaying] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [activeAnswer, setActiveAnswer] = useState(null);
  const [audioNotice, setAudioNotice] = useState('');
  
  const currentAudioRef = useRef(null);

  // AI Panditji Knowledge Base (Trained on Puri Heritage, Culture, Travel & Safety)
  const panditjiKnowledge = [
    {
      id: 'history',
      question_en: "What is the history of Shree Jagannath Temple?",
      question_hi: "श्री जगन्नाथ मंदिर का इतिहास क्या है?",
      question_or: "ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିରର ଇତିହାସ କ’ଣ?",
      ans_en: "Shree Jagannath Temple was constructed in the 12th century CE by King Anantavarman Chodaganga Deva of the Eastern Ganga Dynasty. It is one of the four sacred Char Dham pilgrimage sites, featuring a soaring 65m spire crowned with the sacred Nila Chakra.",
      ans_hi: "श्री जगन्नाथ मंदिर का निर्माण 12वीं शताब्दी में पूर्वी गंगा राजवंश के महान राजा अनंतवर्मन चोडगंगा देव द्वारा करवाया गया था। यह भारत के चार पवित्र धामों में से एक है। यहाँ 65 मीटर ऊंचे शिखर पर पवित्र नीलचक्र स्थापित है।",
      ans_or: "ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିର ଦ୍ୱାଦଶ ଶତାବ୍ଦୀରେ ପୂର୍ବ ଗଙ୍ଗ ବଂଶର ରାଜା ଅନନ୍ତବର୍ମନ୍ ଚୋଡ଼ଗଙ୍ଗ ଦେବଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ ହୋଇଥିଲା। ଏହା ଭାରତର ପବିତ୍ର ଚାରିଧାମ ମଧ୍ୟରୁ ଅନ୍ୟତମ। ଏହାର ୬୫ ମିଟର ଉଚ୍ଚ ସିଖରରେ ପବିତ୍ର ନୀଳଚକ୍ର ବିରାଜମାନ।",
      speech_or: "Shree Jagannath Mandira dwadasha shatabdira raja Anantavarman Chodaganga Deva nka dwara nirmita hoithila. Eha Bharata ra pabitra charidhama madhyaru anyatama. Ehara 65 meter ucha sikharare pabitra Nilachakra birajamana."
    },
    {
      id: 'mahaprasad',
      question_en: "Tell me about 56 Bhog Mahaprasad & Anand Bazaar.",
      question_hi: "56 भोग महाप्रसाद और आनंद बाजार के बारे में बताइए।",
      question_or: "୫୬ ଭୋଗ ମହାପ୍ରସାଦ ଓ ଆନନ୍ଦ ବଜାର ବିଷୟରେ କୁହନ୍ତୁ।",
      ans_en: "The temple kitchen is the world's largest, where 56 varieties of Mahaprasad are cooked daily in earthen pots over wood fires. The Prasad is served to thousands of daily devotees in the Anand Bazaar courtyard.",
      ans_hi: "जगन्नाथ मंदिर की रसोई दुनिया की सबसे बड़ी रसोई है। यहाँ प्रतिदिन भगवान जगन्नाथ के लिए 56 प्रकार के व्यंजन (छप्पन भोग) मिट्टी के बर्तनों में तैयार किए जाते हैं, जिसे आनंद बाजार में परोसा जाता है।",
      ans_or: "ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିର ରୋଷଘର ବିଶ୍ୱର ସବୁଠାରୁ ବିଶାଳ ରୋଷଘର। ଏଠାରେ ପ୍ରତିଦିନ ୫୬ ପ୍ରକାରର ମହାପ୍ରସାଦ ମାଟି କୁଡ଼ୁଆରେ କାଠ ନିଆଁରେ ରନ୍ଧାଯାଏ ଏବଂ ଆନନ୍ଦ ବଜାରରେ ଭକ୍ତମାନଙ୍କୁ ଦିଆଯାଏ।",
      speech_or: "Shree Jagannath Mandira rosaghara bishwara sabutharu bishala rosaghara. Ethare pratidina 56 prakarara Mahaprasada mati kudua re katha nianre randhajae ebang Ananda Bazaar re bhaktamananku diajae."
    },
    {
      id: 'konark',
      question_en: "Tell me about Konark Sun Temple.",
      question_hi: "कोणार्क सूर्य मंदिर के बारे में बताइए।",
      question_or: "କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ବିଷୟରେ କୁହନ୍ତୁ।",
      ans_en: "Konark Sun Temple was built in 1250 CE by King Narasimhadeva I as a monumental stone chariot for Sun God Surya, featuring 24 carved monolithic wheels and 7 galloping horses.",
      ans_hi: "कोणार्क सूर्य मंदिर का निर्माण 1250 ईस्वी में राजा नरसिंहदेव प्रथम द्वारा करवाया गया था। यह सूर्य देव का 100 फीट ऊंचा विशाल पत्थर का रथ है, जिसमें 24 नक्काशीदार पहिये और 7 सरपट दौड़ते घोड़े हैं।",
      ans_or: "କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ୧୨୫୦ ଖ୍ରୀଷ୍ଟାବ୍ଦରେ ରାଜା ଲାଙ୍ଗୁଳା ନରସିଂହ ଦେବଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ ହୋଇଥିଲା। ଏହା ସୂର୍ଯ୍ୟ ଦେବଙ୍କର ୨୪ଟି ଖୋଦିତ ଚକ ଏବଂ ୭ଟି ଘୋଡ଼ା ବିଶିଷ୍ଟ ଏକ ବିଶାଳ ପଥର ରଥ।",
      speech_or: "Konark Surya Mandira 1250 khristabdare raja Langula Narasimha Deva nka dwara nirmita hoithila. Eha Surya Deva nkara 24 ti chodita chaka ebang 7 ti ghoda bishishta bishala pathara ratha."
    },
    {
      id: 'rathayatra',
      question_en: "When is Ratha Yatra & how to participate safely?",
      question_hi: "रथ यात्रा कब है और सुरक्षित रूप से कैसे भाग लें?",
      question_or: "ଘୋଷଯାତ୍ରା କେବେ ଏବଂ କିପରି ସୁରକ୍ଷିତ ଭାବେ ଦର୍ଶନ କରିବେ?",
      ans_en: "Ratha Yatra takes place annually on Ashadha Shukla Dwitiya along Bada Danda Grand Road. Follow PILGRIM SAFE AI crowd density indicators and emergency green corridors for safe viewing.",
      ans_hi: "रथ यात्रा हर साल आषाढ़ शुक्ल द्वितीया को बड़ा डांडा ग्रैंड रोड पर आयोजित की जाती है। सुरक्षित दर्शन के लिए पिलग्रिम सेफ एआई क्राउड इंडिकेटर और इमरजेंसी कॉरिडोर का पालन करें।",
      ans_or: "ପବିତ୍ର ଘୋଷଯାତ୍ରା ପ୍ରତିବର୍ଷ ଆଷାଢ଼ ଶୁକ୍ଳ ଦ୍ୱିତୀୟା ତିଥିରେ ବଡ଼ଦାଣ୍ଡରେ ଅନୁଷ୍ଠିତ ହୁଏ। ସୁରକ୍ଷିତ ଦର୍ଶନ ପାଇଁ PILGRIM SAFE AI ଲାଇଭ୍ କ୍ରାଉଡ୍ ଏବଂ ଗ୍ରୀନ୍ କରିଡୋର୍ ବ୍ୟବହାର କରନ୍ତୁ।",
      speech_or: "Pabitra Ghosayatra pratibarsha Ashadha Shukla Dwitiya tithire Badadanda re anusthita hue. Surakshita darshana pain Pilgrim Safe AI live crowd ebang green corridor byabahara karantu."
    }
  ];

  useEffect(() => {
    // Default active answer to history
    if (!activeAnswer) {
      setActiveAnswer(panditjiKnowledge[0]);
    }
  }, []);

  // Exclude AI Sevayat Panditji Guide Mode widget from the admin portal
  if (user?.role === 'admin' || activeTab === 'admin') {
    return null;
  }

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const speakAnswer = (item, lang = selectedLang) => {
    stopAudio();

    let textToSpeak = item[`ans_${lang}`] || item.ans_or || item.ans_en;
    let speechLangCode = lang === 'or' ? 'or' : lang === 'hi' ? 'hi' : 'en';

    // Stream Real Audio
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${speechLangCode}&client=tw-ob&q=${encodeURIComponent(textToSpeak.slice(0, 200))}`;
    
    const audio = new Audio(ttsUrl);
    currentAudioRef.current = audio;

    audio.onplay = () => {
      setIsPlaying(true);
      setAudioNotice(`🔊 Speaking in ${lang === 'or' ? 'Odia (ଓଡ଼ିଆ)' : lang === 'hi' ? 'Hindi (हिन्दी)' : 'English'}...`);
    };

    audio.onended = () => {
      setIsPlaying(false);
      currentAudioRef.current = null;
      setAudioNotice('');
    };

    audio.onerror = () => {
      // Web Speech Fallback
      currentAudioRef.current = null;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lang === 'or' ? item.speech_or : textToSpeak);
        utterance.lang = lang === 'or' ? 'hi-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    };

    audio.play().catch(err => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  const handleSelectQuestion = (item) => {
    setActiveAnswer(item);
    speakAnswer(item, selectedLang);
  };

  const handleCustomQuery = (e) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    // Simple keyword match
    const qLower = userQuery.toLowerCase();
    const matched = panditjiKnowledge.find(k => 
      k.question_en.toLowerCase().includes(qLower) || 
      k.ans_en.toLowerCase().includes(qLower) ||
      k.ans_hi.includes(userQuery) ||
      k.ans_or.includes(userQuery)
    ) || {
      id: 'custom',
      question_en: userQuery,
      question_hi: userQuery,
      question_or: userQuery,
      ans_en: `Greetings! According to Puri Heritage & Pilgrim Safe AI records, "${userQuery}" relates to the sacred Jagannath Temple & Puri coastal corridor. Please follow live crowd safety advisories.`,
      ans_hi: `जय जगन्नाथ! पूरी विरासत एवं पिलग्रिम सेफ एआई के अनुसार: "${userQuery}"। कृपया लाइव क्राउड एडवाइजरी का पालन करें।`,
      ans_or: `ଜୟ ଜଗନ୍ନାଥ! ପୁରୀ ଐତିହ୍ୟ ତଥ୍ୟ ଅନୁସାରେ: "${userQuery}"। ଦୟାକରି ଲାଇଭ୍ କ୍ରାଉଡ୍ ଗାଇଡଲାଇନ୍ ମାନି ଚାଲନ୍ତୁ।`,
      speech_or: `Jay Jagannath! Puri eitihya tathya anusare: ${userQuery}. Dayakari live crowd guideline mani chalantu.`
    };

    setActiveAnswer(matched);
    speakAnswer(matched, selectedLang);
    setUserQuery('');
  };

  return (
    <>
      {/* 1. FLOATING AI PANDITJI BUTTON AT BOTTOM RIGHT */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 18px 8px 8px',
              borderRadius: '32px',
              border: '2px solid #f59e0b',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 10px 35px rgba(245, 158, 11, 0.45)',
              transition: 'transform 0.2s ease'
            }}
          >
            {/* Avatar Thumbnail Image from User Reference Photo */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #fbbf24',
              flexShrink: 0
            }}>
              <img
                src={panditAvatarBase64}
                alt="AI Sevayat Panditji Guide"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '13px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={13} /> Ask AI Sevayat Panditji
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Odia (ଓଡ଼ିଆ) • Hindi • English Voice
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 2. EXPANDED AI PANDITJI GUIDE MODE PANEL */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '92%',
          maxWidth: '420px',
          height: '620px',
          maxHeight: '85vh',
          background: 'var(--card-bg)',
          borderRadius: '20px',
          border: '2px solid #f59e0b',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Panel Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fbbf24' }}>
                <img src="/assets/pandit_avatar_guide.png" alt="AI Panditji" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#fbbf24' }}>AI Sevayat Panditji Guide Mode</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Puri Heritage & Safety Companion</span>
              </div>
            </div>

            <button
              onClick={() => {
                stopAudio();
                setIsOpen(false);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Language Selector Bar */}
          <div style={{ display: 'flex', gap: '6px', padding: '8px 14px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)' }}>
            {[
              { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
              { code: 'hi', label: 'हिन्दी (Hindi)' },
              { code: 'en', label: 'English' }
            ].map(l => (
              <button
                key={l.code}
                onClick={() => {
                  setSelectedLang(l.code);
                  if (activeAnswer) speakAnswer(activeAnswer, l.code);
                }}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedLang === l.code ? '#f59e0b' : 'transparent',
                  color: selectedLang === l.code ? '#000' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Middle Body: Sevayat Avatar Photo + Answer Card */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Avatar Photo Display Frame */}
            <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#090d16' }}>
              <img
                src={panditAvatarBase64}
                alt="Sevayat Panditji Reference Photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />

              {isPlaying && (
                <div style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  border: '3px solid #f59e0b',
                  boxShadow: '0 0 25px #f59e0b',
                  animation: 'pulse 1s infinite ease-in-out',
                  pointerEvents: 'none'
                }} />
              )}

              {/* Speak Audio Toggle Button */}
              <button
                onClick={() => {
                  if (isPlaying) stopAudio();
                  else if (activeAnswer) speakAnswer(activeAnswer, selectedLang);
                }}
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '10px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '16px',
                  border: 'none',
                  background: isPlaying ? '#ef4444' : '#f59e0b',
                  color: '#000',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isPlaying ? <Pause size={12} /> : <Volume2 size={12} />}
                {isPlaying ? 'Pause Voice' : 'Listen Voice 🙏'}
              </button>
            </div>

            {/* Active Answer Subtitle Teleprompter Box */}
            {activeAnswer && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '12px', color: '#fbbf24', display: 'block', marginBottom: '4px' }}>
                  {activeAnswer[`question_${selectedLang}`] || activeAnswer.question_en}
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  "{activeAnswer[`ans_${selectedLang}`] || activeAnswer.ans_or || activeAnswer.ans_en}"
                </p>
                {audioNotice && (
                  <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, display: 'block', marginTop: '6px' }}>
                    {audioNotice}
                  </span>
                )}
              </div>
            )}

            {/* Quick Heritage Questions List */}
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '6px' }}>
                Quick Heritage Questions:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {panditjiKnowledge.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectQuestion(item)}
                    style={{
                      padding: '8px 10px',
                      fontSize: '11px',
                      fontWeight: activeAnswer?.id === item.id ? 800 : 500,
                      borderRadius: '8px',
                      border: activeAnswer?.id === item.id ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                      background: activeAnswer?.id === item.id ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: activeAnswer?.id === item.id ? '#fbbf24' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    🙏 {item[`question_${selectedLang}`] || item.question_en}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Custom Query Input */}
          <form onSubmit={handleCustomQuery} style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask Panditji (e.g. Mahaprasad, History)..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)'
              }}
            />
            <button
              type="submit"
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#000', fontWeight: 800, cursor: 'pointer' }}
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
