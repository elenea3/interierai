
import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Plus, 
  Sparkles, 
  Info, 
  Loader2,
  Image as ImageIcon,
  X,
  Layers,
  MessageSquare,
  Box,
  Eye,
  Award,
  Zap,
  Star,
  Maximize2,
  Minimize2,
  Video,
  Film,
  AlertCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import * as THREE from 'this'; // corrected placeholder
import * as THREE_LIB from 'three';
import { DesignStyle } from './types';
import { redesignRoom, getImprovements, DesignResult } from './services/geminiService';

const STYLES = Object.values(DesignStyle);

const resizeImage = (base64Str: string, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

const Room3DViewer = ({ imageUrl }: { imageUrl: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const scene = new THREE_LIB.Scene();
    scene.background = new THREE_LIB.Color(0x020408);
    const camera = new THREE_LIB.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    const renderer = new THREE_LIB.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    const geometry = new THREE_LIB.PlaneGeometry(8, 4.5, 32, 32);
    const textureLoader = new THREE_LIB.TextureLoader();
    const texture = textureLoader.load(imageUrl);
    const material = new THREE_LIB.MeshBasicMaterial({ map: texture, side: THREE_LIB.DoubleSide });
    const mesh = new THREE_LIB.Mesh(geometry, material);
    scene.add(mesh);
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      mesh.rotation.y = Math.sin(Date.now() * 0.0008) * 0.15;
      mesh.rotation.x = Math.cos(Date.now() * 0.0008) * 0.08;
      renderer.render(scene, camera);
    };
    animate();
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, [imageUrl]);
  return <div ref={containerRef} className="w-full h-full cursor-move rounded-2xl overflow-hidden" />;
};

export default function App() {
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle>(DesignStyle.MODERN);
  const [customPrompt, setCustomPrompt] = useState("");
  const [designResult, setDesignResult] = useState<DesignResult | null>(null);
  const [suggestions, setSuggestions] = useState<{ questions: string[], analysis: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setProcessingStatus("ფოტოების მომზადება...");
    try {
      const newImages: string[] = [];
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const b64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newImages.push(b64);
        }
      }
      setImages(prev => [...prev, ...newImages].slice(0, 10));
      setDesignResult(null);
    } catch (err) {
      setError("ფაილის წაკითხვის შეცდომა.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processDesign = async () => {
    if (images.length === 0) {
      setError("გთხოვთ ატვირთოთ ფოტო.");
      return;
    }
    setIsProcessing(true);
    setProcessingStatus("AI რენდერი...");
    setError(null);
    try {
      const lastImage = images[images.length - 1];
      const optimizedImage = await resizeImage(lastImage, 1024);
      const base64Data = optimizedImage.split(',')[1];
      
      const result = await redesignRoom([base64Data], selectedStyle, customPrompt);
      setDesignResult(result);
      
      getImprovements([base64Data]).then(setSuggestions).catch(e => console.error("Analysis error", e));
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "რენდერი ვერ მოხერხდა. სცადეთ სხვა ფოტო.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-[#020408] text-slate-100 font-['Fira_GO'] selection:bg-amber-500/30">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/60 shadow-2xl">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform duration-300">
            <Award className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">ELITE INTERIOR AI</h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">Creative Studio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {images.length > 0 && (
            <button 
              onClick={() => { setImages([]); setDesignResult(null); setSuggestions(null); }}
              className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors"
            >
              გასუფთავება
            </button>
          )}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-6 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <Plus size={18} /> ატვირთვა
          </button>
        </div>
      </header>

      <main className="max-w-[1300px] mx-auto p-6 md:p-10 space-y-12">
        {images.length === 0 ? (
          <div className="min-h-[65vh] flex flex-col items-center justify-center space-y-10 text-center animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="relative">
              <div className="absolute -inset-10 bg-amber-500/5 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative w-44 h-44 bg-slate-900/50 rounded-[3rem] flex items-center justify-center border border-white/10 shadow-3xl">
                <Camera className="text-amber-500" size={56} />
              </div>
            </div>
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500">
                გარდაქმენით <span className="text-amber-500">სივრცე</span>
              </h2>
              <p className="text-slate-400 text-lg md:text-xl font-medium">
                ატვირთეთ ფოტო და ნახეთ, როგორ გარდაქმნის AI თქვენს ოთახს პროფესიონალურ დიზაინად.
              </p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-12 py-5 bg-amber-600 hover:bg-amber-500 rounded-[2rem] font-black text-xl shadow-2xl transition-all flex items-center gap-3"
            >
              <ImageIcon size={24} /> დაწყება
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <section className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                  <Layers size={16} /> გალერეა ({images.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-slate-900">
                      <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <button 
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                      >
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-slate-500"><Plus size={24}/></button>
                </div>
              </section>

              <section className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-8 shadow-xl">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                    <Sparkles size={16} /> სტილი
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLES.map(s => (
                      <button 
                        key={s} 
                        onClick={() => setSelectedStyle(s)}
                        className={`py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${
                          selectedStyle === s 
                          ? 'bg-amber-600 border-transparent shadow-lg text-white' 
                          : 'bg-white/5 border-white/5 text-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                    <MessageSquare size={16} /> დამატებითი მოთხოვნა
                  </h3>
                  <textarea 
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="მაგ: მინდა მეტი სიმწვანე..."
                    className="w-full h-32 bg-white/2 border border-white/10 rounded-2xl p-4 text-xs focus:outline-none focus:border-amber-500/50 transition-all resize-none font-medium"
                  />
                </div>

                <button 
                  disabled={isProcessing}
                  onClick={processDesign}
                  className="w-full py-5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all text-white"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18}/>}
                  {isProcessing ? "მიმდინარეობს რენდერი..." : "დიზაინის გენერირება"}
                </button>
              </section>
            </div>

            <div className="lg:col-span-8 space-y-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-red-400 text-sm font-bold flex items-center justify-between animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} /> {error}
                  </div>
                  <button onClick={processDesign} className="flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all">
                    <RefreshCw size={14}/> ხელახლა
                  </button>
                </div>
              )}

              <div className="glass rounded-[3.5rem] overflow-hidden border border-white/10 bg-[#0a0c10] min-h-[600px] relative shadow-3xl">
                {isProcessing && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in duration-500">
                    <Loader2 className="animate-spin text-amber-500 mb-6" size={64} />
                    <h3 className="text-2xl font-black uppercase tracking-widest text-white">მიმდინარეობს რენდერი</h3>
                    <p className="text-[10px] text-amber-500/60 mt-2 uppercase tracking-[0.2em]">ეს შეიძლება გაგრძელდეს 15-20 წამი</p>
                  </div>
                )}

                {designResult ? (
                  <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-700">
                    <div className="relative w-full aspect-video">
                      {is3DMode ? (
                        <Room3DViewer imageUrl={designResult.imageUrl} />
                      ) : (
                        <img src={designResult.imageUrl} className="w-full h-full object-cover" alt="Redesigned Room" />
                      )}
                      <div className="absolute top-6 left-6 flex gap-3">
                        <button 
                          onClick={() => setIs3DMode(!is3DMode)} 
                          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 border transition-all backdrop-blur-xl ${
                            is3DMode ? 'bg-amber-500 text-white' : 'bg-black/40 text-white border-white/10'
                          }`}
                        >
                          {is3DMode ? <Minimize2 size={14}/> : <Maximize2 size={14}/>} {is3DMode ? '2D ხედი' : '3D ხედი'}
                        </button>
                      </div>
                    </div>
                    <div className="p-10 space-y-6">
                      <h4 className="text-4xl font-black tracking-tighter uppercase">{selectedStyle} კონცეფცია</h4>
                      <p className="text-amber-500 font-bold italic text-xl leading-relaxed">"{designResult.designPhilosophy}"</p>
                    </div>
                  </div>
                ) : !isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 text-center p-20 space-y-6">
                    <ImageIcon size={64} className="opacity-10" />
                    <p className="font-black uppercase tracking-[0.3em] text-sm">რენდერი გამოჩნდება აქ</p>
                  </div>
                )}
              </div>

              {suggestions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-10 duration-1000">
                  <div className="glass rounded-[3rem] p-10 border border-white/10 space-y-6 shadow-2xl">
                    <h5 className="font-black text-sm uppercase tracking-widest text-amber-500 flex items-center gap-3">
                      <Info size={20}/> ექსპერტის ანალიზი
                    </h5>
                    <p className="text-lg text-slate-300 leading-relaxed font-medium italic">{suggestions.analysis}</p>
                  </div>
                  <div className="glass rounded-[3rem] p-10 border border-white/10 space-y-6 shadow-2xl">
                    <h5 className="font-black text-sm uppercase tracking-widest text-amber-400 flex items-center gap-3">
                      <Sparkles size={20}/> რეკომენდაციები
                    </h5>
                    <ul className="space-y-4">
                      {suggestions.questions.map((q, i) => (
                        <li key={i} className="text-sm text-slate-400 font-medium flex gap-4 items-start">
                          <span className="flex-shrink-0 w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black text-xs">0{i+1}</span>
                          <span className="mt-1.5">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
    </div>
  );
}
