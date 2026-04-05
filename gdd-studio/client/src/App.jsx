import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Plus, Database, Search, Folder, ChevronRight, LayoutGrid, 
  Settings, Terminal, FileCode, Layers, ArrowLeft, Image as ImageIcon, Save, X, Upload, MoreVertical, Trash2, Edit2, Move, Check, Loader2, Cpu, Activity, Info, List, BookOpen, Map as MapIcon, Home, Castle, Tent, MapPin, Eye, Zap, Shield, AlertTriangle, Wand2, ArrowUpRight, Cpu as CpuIcon, Globe
} from 'lucide-react';

axios.defaults.baseURL = 'http://localhost:3001';

// --- CONFIGURATION ---
const MAP_WIDTH = 5504;
const MAP_HEIGHT = 3072;

const POI_TYPES = {
  village: { label: 'Village', color: '#10b981', gradient: 'radial-gradient(circle at 30% 30%, #34d399, #064e3b)' },
  castle: { label: 'Castle', color: '#3b82f6', gradient: 'radial-gradient(circle at 30% 30%, #60a5fa, #1e3a8a)' },
  ruin: { label: 'Ruin', color: '#94a3b8', gradient: 'radial-gradient(circle at 30% 30%, #cbd5e1, #334155)' },
  shrine: { label: 'Shrine', color: '#a855f7', gradient: 'radial-gradient(circle at 30% 30%, #c084fc, #581c87)' },
  portal: { label: 'Portal', color: '#f59e0b', gradient: 'radial-gradient(circle at 30% 30%, #fbbf24, #92400e)' }
};

// --- GLOBAL COMPONENTS ---

const Modal = ({ title, isOpen, onClose, onConfirm, confirmLabel = "CONFIRM", variant = "primary", children }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '20px' }}>
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.7)' }}>
        <div style={{ padding: '32px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #0f172a, #1e293b)' }}>
          <h2 style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}>
            <X size={18} color="#475569" />
          </button>
        </div>
        <div style={{ padding: '32px', maxHeight: '60vh', overflowY: 'auto' }}>{children}</div>
        <div style={{ padding: '24px 32px', background: '#020617', borderTop: '1px solid #1e293b', display: 'flex', gap: '16px' }}>
          <Button label="CANCEL" variant="ghost" onClick={onClose} style={{ flex: 1 }} />
          <Button label={confirmLabel} variant={variant} onClick={onConfirm} style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
};

const Button = ({ label, icon: Icon, onClick, variant = 'primary', disabled, loading, size = 'md', style = {} }) => {
  const [hover, setHover] = useState(false);
  const variants = {
    primary: { bg: '#3b82f6', text: '#fff', glow: 'rgba(59, 130, 246, 0.4)' },
    success: { bg: '#10b981', text: '#fff', glow: 'rgba(16, 185, 129, 0.4)' },
    danger: { bg: '#ef4444', text: '#fff', glow: 'rgba(239, 68, 68, 0.4)' },
    ghost: { bg: 'transparent', text: '#64748b', glow: 'transparent' },
    slate: { bg: '#1e293b', text: '#fff', glow: 'rgba(30, 41, 59, 0.4)' }
  };
  const v = variants[variant] || variants.primary;
  
  return (
    <button 
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick} 
      disabled={disabled || loading} 
      style={{
        background: variant === 'ghost' ? 'transparent' : v.bg, 
        color: v.text, 
        border: variant === 'ghost' ? 'none' : `1px solid ${v.bg}`,
        borderRadius: '8px', 
        padding: size === 'sm' ? '6px 14px' : '10px 20px',
        fontSize: size === 'sm' ? '0.65rem' : '0.75rem', 
        fontWeight: '800', 
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
        opacity: (disabled || loading) ? 0.5 : 1, 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
        flex: size === 'sm' ? 'none' : '0 1 auto', 
        letterSpacing: '1px',
        boxShadow: hover && variant !== 'ghost' ? `0 0 20px ${v.glow}` : 'none',
        transform: hover && !disabled ? 'translateY(-1px)' : 'none',
        textTransform: 'uppercase',
        ...style
      }}
    >
      {loading ? <Loader2 size={size === 'sm' ? 12 : 16} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {label}
    </button>
  );
};

const WorldView = ({ showLocationsList, setShowLocationsList, pois, fetchPOIs }) => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [telemetry, setTelemetry] = useState({ x: 0, y: 0, zoom: 0 });
  const [editingPOI, setEditingPOI] = useState(null);
  const [hoverPOI, setHoverPOI] = useState(null);
  const [libReady, setLibReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (window.OpenSeadragon) { setLibReady(true); return; }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/openseadragon.min.js";
    script.async = true;
    script.onload = () => setLibReady(true);
    document.body.appendChild(script);
  }, []);

  const syncOverlays = () => {
    if (!viewerRef.current || !libReady) return;
    const viewer = viewerRef.current;
    viewer.clearOverlays();
    const currentDisplayPois = [...pois];
    if (editingPOI && !pois.some(p => p.id === editingPOI.id)) currentDisplayPois.push(editingPOI);

    currentDisplayPois.forEach(poi => {
      const elt = document.createElement("div");
      elt.style.width = "10px"; elt.style.height = "10px";
      elt.style.background = POI_TYPES[poi.type]?.gradient || POI_TYPES.village.gradient;
      elt.style.borderRadius = "50%";
      elt.style.border = "2px solid #fff";
      elt.style.boxShadow = "0 0 15px rgba(255,255,255,0.4), 0 4px 8px rgba(0,0,0,0.6)";
      elt.style.cursor = "pointer"; elt.style.transition = "0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) transform";
      elt.style.zIndex = "5000";
      
      const isSaved = pois.some(p => p.id === poi.id);
      if (isSaved) {
        elt.onmouseenter = () => { setHoverPOI(poi); elt.style.transform = "scale(2.8) translateY(-2px)"; };
        elt.onmouseleave = () => { setHoverPOI(null); elt.style.transform = "scale(1.0)"; };
        elt.onclick = (e) => { e.stopPropagation(); setHoverPOI(null); setEditingPOI(poi); };
      }

      viewer.addOverlay({ element: elt, location: viewer.viewport.imageToViewportCoordinates(poi.x, poi.y), placement: window.OpenSeadragon.Placement.CENTER });
    });
  };

  useEffect(() => {
    if (!libReady || !window.OpenSeadragon || !containerRef.current) return;
    const viewer = window.OpenSeadragon({
      element: containerRef.current,
      prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
      tileSources: {
        width: MAP_WIDTH, height: MAP_HEIGHT, tileSize: 256,
        getTileUrl: (level, x, y) => {
          const ourLevel = level - 8;
          return (ourLevel >= 0 && ourLevel <= 5) ? `/tiles/${ourLevel}/${x}/${y}.png` : null;
        }
      },
      showNavigationControl: false, clickToZoom: false,
      gestureSettingsMouse: { scrollToZoom: true, clickToZoom: false, dragToPan: true },
      subPixelRender: true, smoothTileEdges: true, visibilityRatio: 1.0, constrainDuringPan: true,
      viewportMargins: { top: 100, left: 100, bottom: 100, right: 100 }
    });

    viewer.addHandler('open', () => syncOverlays());
    viewer.addHandler('canvas-click', (e) => {
      if (!e.quick || editingPOI) return;
      setHoverPOI(null);
      const vp = viewer.viewport.pointFromPixel(e.position);
      const ip = viewer.viewport.viewportToImageCoordinates(vp);
      setEditingPOI({ id: Date.now(), x: Math.round(ip.x), y: Math.round(ip.y), name: '', type: 'village', description: '', image_url: '' });
    });

    const tracker = new window.OpenSeadragon.MouseTracker({
      element: viewer.canvas,
      moveHandler: (e) => {
        const vp = viewer.viewport.pointFromPixel(e.position);
        const ip = viewer.viewport.viewportToImageCoordinates(vp);
        setTelemetry(t => ({ ...t, x: Math.round(ip.x), y: Math.round(ip.y) }));
      }
    });

    viewer.addHandler('zoom', (e) => setTelemetry(t => ({ ...t, zoom: e.zoom })));
    viewerRef.current = viewer;
    return () => { if (tracker) tracker.destroy(); if (viewer) viewer.destroy(); };
  }, [libReady]);

  useEffect(() => { if (viewerRef.current) viewerRef.current.setMouseNavEnabled(!editingPOI); }, [editingPOI]);
  useEffect(() => { syncOverlays(); }, [pois, editingPOI, libReady]);

  const handleSavePOI = async () => {
    const updated = pois.find(p => p.id === editingPOI.id) ? pois.map(p => p.id === editingPOI.id ? editingPOI : p) : [...pois, editingPOI];
    await axios.post('/api/locations', updated);
    fetchPOIs();
    setEditingPOI(null);
  };

  const handleDeletePOI = async () => {
    const updated = pois.filter(p => p.id !== editingPOI.id);
    await axios.post('/api/locations', updated);
    fetchPOIs();
    setEditingPOI(null);
  };

  const handleTeleport = (poi) => {
    if (!viewerRef.current) return;
    viewerRef.current.viewport.panTo(viewerRef.current.viewport.imageToViewportCoordinates(poi.x, poi.y), true);
    viewerRef.current.viewport.zoomTo(1.5, null, true);
    setEditingPOI(poi);
    setShowLocationsList(false);
  };

  const isSaved = editingPOI && pois.some(p => p.id === editingPOI.id);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', background: '#020617' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', bottom: '32px', left: '32px', zIndex: 2000, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', color: '#fff', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <span style={{ color: '#3b82f6' }}>X:</span> {telemetry.x} <span style={{ margin: '0 10px', color: 'rgba(255,255,255,0.1)' }}>|</span> <span style={{ color: '#3b82f6' }}>Y:</span> {telemetry.y} <span style={{ margin: '0 10px', color: 'rgba(255,255,255,0.1)' }}>|</span> <span style={{ color: '#3b82f6' }}>ZOOM:</span> {telemetry.zoom.toFixed(2)}
        </div>
        {hoverPOI && !editingPOI && !showLocationsList && (
          <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 3000, width: '420px', background: '#0f172a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 40px 80px -12px rgba(0,0,0,0.8)', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ height: '140px', background: hoverPOI.image_url ? `url(${hoverPOI.image_url}) center/cover` : 'linear-gradient(45deg, #1e293b, #0f172a)' }} />
            <div style={{ padding: '24px' }}>
              <div style={{ color: POI_TYPES[hoverPOI.type].color, fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>{hoverPOI.type}</div>
              <h2 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: '900' }}>{hoverPOI.name}</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>{hoverPOI.description || 'No description provided.'}</p>
            </div>
          </div>
        )}
      </div>
      {editingPOI && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '360px', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(30px)', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', zIndex: 4000, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '32px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(30,41,59,0.5), transparent)' }}>
            <h2 style={{ margin: 0, fontSize: '0.75rem', color: '#fff', fontWeight: '900', letterSpacing: '2px' }}>{isSaved ? 'EDIT LOCATION' : 'PIN LOCATION'}</h2>
            <button onClick={() => setEditingPOI(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={20} color="#fff" /></button>
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto' }}>
            <div onClick={() => fileInputRef.current.click()} style={{ height: '160px', border: '2px dashed #1e293b', borderRadius: '20px', background: editingPOI.image_url ? `url(${editingPOI.image_url}) center/cover` : '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '12px', color: '#475569' }}>
              {isUploading ? <Loader2 className="animate-spin" /> : !editingPOI.image_url && <><ImageIcon size={32} /><span style={{ fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px' }}>UPLOAD HERO IMAGE</span></>}
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={async (e) => {
                const f = e.target.files[0]; if (!f) return; setIsUploading(true);
                const fd = new FormData(); fd.append('image', f);
                const res = await axios.post('/api/upload', fd);
                setEditingPOI({...editingPOI, image_url: res.data.url}); setIsUploading(false);
              }} accept="image/*" />
            </div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px', letterSpacing: '1px' }}>NAME</label><input placeholder="Location name..." value={editingPOI.name} onChange={(e) => setEditingPOI({...editingPOI, name: e.target.value})} style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '14px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '0.9rem' }} /></div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px', letterSpacing: '1px' }}>X COORD</label><input type="number" value={editingPOI.x} onChange={(e) => setEditingPOI({...editingPOI, x: parseInt(e.target.value) || 0})} style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '14px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '0.9rem' }} /></div>
              <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px', letterSpacing: '1px' }}>Y COORD</label><input type="number" value={editingPOI.y} onChange={(e) => setEditingPOI({...editingPOI, y: parseInt(e.target.value) || 0})} style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '14px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '0.9rem' }} /></div>
            </div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px' }}>TYPE</label><select value={editingPOI.type} onChange={(e) => setEditingPOI({...editingPOI, type: e.target.value})} style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '14px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '0.9rem' }}>{Object.entries(POI_TYPES).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px' }}>DESCRIPTION</label><textarea placeholder="Describe this location..." value={editingPOI.description} onChange={(e) => setEditingPOI({...editingPOI, description: e.target.value})} style={{ width: '100%', height: '120px', background: '#020617', border: '1px solid #1e293b', padding: '14px', color: '#fff', borderRadius: '12px', resize: 'none', boxSizing: 'border-box', outline: 'none', fontSize: '0.9rem', lineHeight: '1.6' }} /></div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: '16px', paddingTop: '24px' }}>
              <Button label="SAVE" icon={Check} variant="success" size="sm" onClick={handleSavePOI} style={{ flex: 1 }} />
              {isSaved && <Button label="DELETE" icon={Trash2} variant="danger" size="sm" onClick={handleDeletePOI} style={{ flex: 1 }} />}
            </div>
          </div>
        </div>
      )}

      {showLocationsList && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '360px', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(30px)', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', zIndex: 4500, boxShadow: '-20px 0 50px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '32px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '0.75rem', color: '#fff', fontWeight: '900', letterSpacing: '2px' }}>MASTER LOCATIONS</h2>
            <button onClick={() => setShowLocationsList(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={20} color="#fff" /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {pois.map(poi => (
              <div key={poi.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.03)', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '12px', height: '12px', background: POI_TYPES[poi.type]?.color, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: '#fff', fontWeight: '900', fontSize: '0.9rem' }}>{poi.name}</p>
                  <p style={{ margin: 0, color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 'bold' }}>{poi.type}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleTeleport(poi)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer' }}><Eye size={16}/></button>
                  <button onClick={async () => { const updated = pois.filter(p => p.id !== poi.id); await axios.post('/api/locations', updated); fetchPOIs(); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const fileInputRef = useRef(null);
  const [view, setView] = useState('dashboard');
  const [containers, setContainers] = useState([]);
  const [activeContainer, setActiveContainer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [workQueue, setWorkQueue] = useState([]);
  const [manifest, setManifest] = useState([]);
  const [handbook, setHandbook] = useState('');
  const [intentData, setIntentData] = useState(null);
  const [docsData, setDocsData] = useState({});
  const [activeTab, setActiveTab] = useState('intent');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLocationsList, setShowLocationsList] = useState(false);
  const [pois, setPois] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ open: false, title: '', type: '', data: null });

  useEffect(() => {
    const init = async () => {
      const res = await axios.get('/api/containers');
      setContainers(res.data);
      fetchPOIs();
      handleHashChange();
    };
    init();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleHashChange = async () => {
    const hash = window.location.hash;
    if (hash === '#/world') setView('world');
    else if (hash === '#/registry') fetchWorkQueue();
    else if (hash === '#/handbook') fetchHandbook();
    else if (hash === '#/api') fetchManifest();
    else if (hash.startsWith('#/container/')) {
      const cId = hash.split('/')[2];
      if (activeContainer?.id === cId && view === 'container') return;
      const res = await axios.get(`/api/containers`);
      const c = res.data.find(item => item.id === cId);
      if (c) selectContainer(c);
    } else if (hash.startsWith('#/entry/')) {
      const parts = hash.split('/');
      const cId = parts[2]; const eId = parts[3];
      if (activeEntry?.id === eId && view === 'entry') return;
      selectEntry({ id: eId }, cId);
    } else setView('dashboard');
  };

  const fetchPOIs = async () => {
    try { const res = await axios.get('/api/locations'); setPois(Array.isArray(res.data) ? res.data : []); } catch (err) { setPois([]); }
  };

  const fetchHandbook = async () => {
    const res = await axios.get('/api/handbook');
    setHandbook(res.data); setView('handbook');
  };

  const fetchManifest = async () => {
    const res = await axios.get('/api/manifest');
    setManifest(res.data); setView('manifest');
  };

  const updateHash = (h) => { if (window.location.hash !== h) window.location.hash = h; };
  const fetchWorkQueue = async () => { const res = await axios.get('/api/work-queue'); setWorkQueue(res.data); setView('registry'); };
  
  const selectContainer = async (c) => { 
    setActiveContainer(c); 
    const res = await axios.get(`/api/containers/${encodeURIComponent(c.id)}/entries`); 
    setEntries(res.data); setView('container'); 
    updateHash(`#/container/${c.id}`); 
  };

  const selectEntry = async (e, cId) => {
    try {
      const containerId = cId || activeContainer.id;
      const res = await axios.get(`/api/entries/${encodeURIComponent(containerId)}/${encodeURIComponent(e.id)}`);
      setIntentData(res.data.intent); setDocsData(res.data.docs); setView('entry'); 
      if (!activeContainer || activeContainer.id !== containerId) {
        const cRes = await axios.get('/api/containers');
        setActiveContainer(cRes.data.find(c => c.id === containerId));
      }
      updateHash(`#/entry/${containerId}/${e.id}`);
    } catch (err) { console.error("Entry load failed", err); }
  };

  const handleCreateContainer = async () => {
    if (!modal.data?.name) return;
    const res = await axios.post('/api/containers', { name: modal.data.name, image_url: modal.data.image_url });
    setContainers([...containers, res.data]);
    setModal({ open: false, title: '', type: '', data: null });
  };

  const handleUpdateContainer = async () => {
    if (!modal.data?.name) return;
    await axios.post(`/api/containers/${encodeURIComponent(modal.data.id)}/meta`, { name: modal.data.name, image_url: modal.data.image_url });
    const res = await axios.get('/api/containers');
    setContainers(res.data);
    setModal({ open: false, title: '', type: '', data: null });
  };

  const handleDeleteContainer = async () => {
    await axios.delete(`/api/containers/${encodeURIComponent(modal.data.id)}`);
    setContainers(containers.filter(c => c.id !== modal.data.id));
    setModal({ open: false, title: '', type: '', data: null });
  };

  const handleCreateEntry = async () => {
    try {
      if (!modal.data?.name || !activeContainer?.id) return;
      await axios.post(`/api/containers/${encodeURIComponent(activeContainer.id)}/entries`, { 
        name: modal.data.name,
        description: modal.data.description || "" 
      });
      const res = await axios.get(`/api/containers/${encodeURIComponent(activeContainer.id)}/entries`);
      setEntries(res.data);
      setModal({ open: false, title: '', type: '', data: null });
    } catch (err) { console.error("Failed to initialize entry node", err); }
  };

  const saveIntent = async (updatedData) => {
    const data = updatedData || intentData;
    await axios.post(`/api/entries/${encodeURIComponent(activeContainer.id)}/${encodeURIComponent(data.id)}/intent`, data);
  };

  const handleRequestAI = async () => {
    const updated = { ...intentData, status: 'AI_PROCESSING_REQUESTED' };
    setIntentData(updated);
    await saveIntent(updated);
  };

  const Header = ({ title, sub, onBack, actions }) => (
    <div style={{ padding: '24px 48px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {onBack && <button onClick={onBack} style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', transition: '0.3s' }} onMouseEnter={e => e.currentTarget.style.background='#3b82f6'} onMouseLeave={e => e.currentTarget.style.background='#1e293b'}><ArrowLeft size={20}/></button>}
        <div><p style={{ margin: 0, fontSize: '0.65rem', color: '#3b82f6', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>{sub}</p><h1 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', fontWeight: '900' }}>{title}</h1></div>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: '16px', top: '12px', color: '#475569' }} /><input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px 16px 12px 44px', color: '#fff', width: '280px', outline: 'none' }} /></div>
        {actions}
      </div>
    </div>
  );

  const Footer = () => (
    <div style={{ padding: '16px 48px', background: '#0f172a', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} />
          <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: '900', letterSpacing: '1px' }}>SYSTEM ACTIVE</span>
        </div>
        <div style={{ height: '12px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: '800', letterSpacing: '1px' }}>LANTERN GDD ENGINE <span style={{ color: '#1e293b', margin: '0 5px' }}>/</span> v1.0.0</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
          <Globe size={12} />
          <span style={{ fontSize: '0.6rem', fontWeight: '900', letterSpacing: '2px' }}>TALES OF ETHORIA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
          <CpuIcon size={12} />
          <span style={{ fontSize: '0.6rem', fontWeight: '900', letterSpacing: '2px' }}>AUTO-INDEXING READY</span>
        </div>
      </div>
    </div>
  );

  const showTabs = intentData?.status === 'COMPLETED';
  const tabs = showTabs ? ['intent', 'definitions', 'blueprints', 'architecture', 'schema'] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020617', color: '#e2e8f0', overflow: 'hidden' }}>
      {view === 'dashboard' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header title="Tales of Ethoria" sub="Lantern / Home" actions={
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button label="New Container" variant="primary" onClick={() => setModal({ open: true, title: 'New Container', type: 'create_container', data: { name: '', image_url: '' } })} />
              <Button label="World Engine" variant="slate" onClick={() => updateHash('#/world')} />
              <Button label="AI Queue" variant="slate" onClick={() => updateHash('#/registry')} />
              <Button label="API" variant="slate" onClick={() => updateHash('#/api')} />
              <Button label="Handbook" variant="slate" onClick={() => updateHash('#/handbook')} />
            </div>
          } />
          <div style={{ flex: 1, overflowY: 'auto', padding: '48px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '32px' }}>
              {containers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                <div key={c.id} style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden', transition: '0.3s' }}>
                  <div onClick={() => selectContainer(c)} style={{ width: '100%', aspectRatio: '16 / 9', cursor: 'pointer', background: c.image_url ? `url(${c.image_url}) center/cover` : 'linear-gradient(45deg, #0f172a, #020617)' }} />
                  <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 onClick={() => selectContainer(c)} style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer' }}>{c.name}</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Edit2 size={16} color="#475569" style={{ cursor: 'pointer' }} onClick={() => setModal({ open: true, title: 'Edit Container', type: 'edit_container', data: c })} />
                      <Trash2 size={16} color="#475569" style={{ cursor: 'pointer' }} onClick={() => setModal({ open: true, title: 'Delete Container', type: 'delete_container', data: c })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Footer />
        </div>
      )}

      {view === 'world' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header title="Master Map of Ethoria" sub="Lantern / World Engine" onBack={() => updateHash('#/')} actions={
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button label="LOCATIONS" variant="slate" icon={List} onClick={() => setShowLocationsList(!showLocationsList)} />
              <Button label="HOME" variant="slate" icon={Home} onClick={() => updateHash('#/')} />
            </div>
          } />
          <WorldView showLocationsList={showLocationsList} setShowLocationsList={setShowLocationsList} pois={pois} fetchPOIs={fetchPOIs} />
          <Footer />
        </div>
      )}

      {view === 'handbook' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header title="Engine Handbook" sub="Lantern / Manual" onBack={() => updateHash('#/')} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '60px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '32px', padding: '80px', color: '#cbd5e1', whiteSpace: 'pre-wrap', fontFamily: 'serif', lineHeight: '1.8' }}>{handbook}</div>
          </div>
          <Footer />
        </div>
      )}

      {view === 'manifest' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header title="Global Manifest" sub="Lantern / Inventory" onBack={() => updateHash('#/')} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
            <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid #1e293b' }}><th style={{ padding: '24px', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Container</th><th style={{ padding: '24px', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Entry Node</th><th style={{ padding: '24px', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th></tr></thead>
                <tbody>{manifest.map((item, idx) => (<tr key={idx} style={{ borderBottom: '1px solid #020617' }}><td style={{ padding: '20px 24px', color: '#475569' }}>{item.container}</td><td onClick={() => selectEntry({ id: item.entry }, item.container)} style={{ padding: '20px 24px', color: '#fff', cursor: 'pointer', fontWeight: '800' }}>{item.name}</td><td style={{ padding: '20px 24px', color: item.status === 'COMPLETED' ? '#10b981' : '#fbbf24', fontSize: '0.7rem', fontWeight: 'bold' }}>● {item.status}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
          <Footer />
        </div>
      )}

      {view === 'registry' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header title="AI Processing Queue" sub="Lantern / Workers" onBack={() => updateHash('#/')} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
            <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid #1e293b' }}><th style={{ padding: '24px', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Entry Node</th><th style={{ padding: '24px', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th></tr></thead>
                <tbody>{workQueue.map(item => (<tr key={item.entry} style={{ borderBottom: '1px solid #020617' }}><td onClick={() => selectEntry({ id: item.entry, name: item.name }, item.container)} style={{ padding: '24px', color: '#fff', cursor: 'pointer', fontWeight: '800' }}>{item.name}</td><td style={{ padding: '24px', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 'bold' }}>● PENDING AI</td></tr>))}</tbody>
              </table>
            </div>
          </div>
          <Footer />
        </div>
      )}

      {view === 'container' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header title={activeContainer?.name} sub="Lantern / Context" onBack={() => updateHash('#/')} actions={<Button label="ADD ENTRY" onClick={() => setModal({ open: true, title: 'New Entry', type: 'create_entry', data: { name: '', description: '' } })} />} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
            <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid #1e293b' }}><th style={{ padding: '24px', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Entry Node</th><th style={{ padding: '24px', textAlign: 'right', paddingRight: '48px', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Control</th></tr></thead>
                <tbody>{entries.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #020617' }}>
                    <td onClick={() => selectEntry(e)} style={{ padding: '24px', color: '#fff', cursor: 'pointer', fontWeight: '800' }}>{e.name}</td>
                    <td style={{ textAlign: 'right', paddingRight: '48px' }}><Trash2 size={16} color="#475569" style={{ cursor: 'pointer' }} onClick={async (ev) => { ev.stopPropagation(); setModal({ open: true, title: 'Delete Entry', type: 'delete_entry', data: e }); }} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <Footer />
        </div>
      )}

      {view === 'entry' && intentData && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Header title={intentData.name} sub={`${activeContainer?.name} / Documentation`} onBack={() => selectContainer(activeContainer)} actions={
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button label="Request AI PROCESSING" variant="primary" onClick={handleRequestAI} />
              <Button label="Save Changes" variant="success" onClick={() => saveIntent()} />
            </div>
          } />
          {showTabs && (
            <div style={{ background: '#0f172a', padding: '0 48px', borderBottom: '1px solid #1e293b', display: 'flex', gap: '48px', justifyContent: 'center' }}>
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '24px 0', background: 'transparent', border: 'none', borderBottom: activeTab === tab ? '3px solid #3b82f6' : '3px solid transparent', color: activeTab === tab ? '#fff' : '#475569', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '2px' }}>{tab}</button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '60px 80px', background: '#020617' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              {activeTab === 'intent' ? (
                <div>
                  {/* WIKI TOP DESCRIPTION */}
                  <div style={{ marginBottom: '64px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.65rem', color: '#3b82f6', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>Summary</label>
                      <Edit2 size={14} color="#475569" style={{ cursor: 'pointer' }} onClick={() => setModal({ open: true, title: 'Edit Summary', type: 'edit_summary', data: { description: intentData.description } })} />
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '1.25rem', lineHeight: '1.8', fontFamily: 'serif', fontStyle: 'italic', borderLeft: '4px solid #1e293b', paddingLeft: '32px', whiteSpace: 'pre-wrap' }}>{intentData.description || 'No summary provided.'}</div>
                  </div>

                  {/* WIKI SECTIONS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                    {(intentData.sections || []).map((section, sIdx) => (
                      <div key={sIdx}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                          <h2 style={{ flex: 1, margin: 0, color: '#fff', fontSize: section.level === 1 ? '2.2rem' : section.level === 2 ? '1.8rem' : '1.4rem', fontWeight: '900', letterSpacing: '-0.5px' }}>{section.title}</h2>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <Edit2 size={14} color="#475569" style={{ cursor: 'pointer' }} onClick={() => setModal({ open: true, title: 'Edit Section', type: 'edit_section', data: { ...section, index: sIdx } })} />
                            <Trash2 size={14} color="#475569" style={{ cursor: 'pointer' }} onClick={() => { const s = [...intentData.sections]; s.splice(sIdx, 1); setIntentData({ ...intentData, sections: s }); }} />
                          </div>
                        </div>
                        {section.description && <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.8', marginBottom: '24px', paddingLeft: '4px' }}>{section.description}</p>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '32px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                          {(section.parameters || []).map((param, pIdx) => (
                            <div key={pIdx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <div style={{ width: '3px', height: '3px', background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 5px #3b82f6' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{param.name}:</strong>
                                  <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>{param.value}</span>
                                  <Edit2 size={12} color="#1e293b" style={{ cursor: 'pointer' }} onClick={() => setModal({ open: true, title: 'Edit Parameter', type: 'edit_parameter', data: { ...param, sectionIndex: sIdx, paramIndex: pIdx } })} />
                                  <X size={12} color="#1e293b" style={{ cursor: 'pointer' }} onClick={() => { const s = [...intentData.sections]; s[sIdx].parameters.splice(pIdx, 1); setIntentData({ ...intentData, sections: s }); }} />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => setModal({ open: true, title: 'New Parameter', type: 'add_parameter', data: { sectionIndex: sIdx, name: '', value: '' } })} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer', padding: '8px 0', textAlign: 'left', letterSpacing: '1px' }}>+ ADD PARAMETER</button>
                        </div>
                      </div>
                    ))}
                    <Button label="ADD SECTION" variant="slate" style={{ alignSelf: 'flex-start', borderStyle: 'dashed', marginTop: '32px' }} onClick={() => setModal({ open: true, title: 'New Section', type: 'add_section', data: { title: '', level: 2, description: '' } })} />
                  </div>
                </div>
              ) : (
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '32px', padding: '80px', color: '#cbd5e1', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.8', fontSize: '1rem', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>{docsData[activeTab]}</div>
              )}
            </div>
          </div>
          <Footer />
        </div>
      )}

      {/* GLOBAL MODALS */}
      {(modal.type === 'create_container' || modal.type === 'edit_container') && (
        <Modal 
          isOpen={modal.open} 
          title={modal.type === 'create_container' ? "INITIALIZE SUBSYSTEM" : "RECONFIGURE DOMAIN"} 
          onClose={() => setModal({ open: false })} 
          onConfirm={modal.type === 'create_container' ? handleCreateContainer : handleUpdateContainer}
          confirmLabel={modal.type === 'create_container' ? "Create System" : "Save Configuration"}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div onClick={() => fileInputRef.current.click()} style={{ height: '180px', border: '2px dashed #1e293b', borderRadius: '20px', background: modal.data?.image_url ? `url(${modal.data.image_url}) center/cover` : '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '12px', color: '#475569' }}>
              {isUploading ? <Loader2 className="animate-spin" /> : !modal.data?.image_url && <><ImageIcon size={32} /><span style={{ fontSize: '0.65rem', fontWeight: '900' }}>SELECT HERO ASSET</span></>}
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={async (e) => {
                const f = e.target.files[0]; if (!f) return; setIsUploading(true);
                const fd = new FormData(); fd.append('image', f);
                const res = await axios.post('/api/upload', fd);
                setModal({...modal, data: { ...modal.data, image_url: res.data.url }}); setIsUploading(false);
              }} accept="image/*" />
            </div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '12px' }}>IDENTIFIER</label><input autoFocus value={modal.data?.name || ''} onChange={(e) => setModal({...modal, data: { ...modal.data, name: e.target.value }})} placeholder="System Name..." style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '16px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }} /></div>
          </div>
        </Modal>
      )}

      {modal.type === 'create_entry' && (
        <Modal isOpen={modal.open} title="GENERATE REGISTRY NODE" onClose={() => setModal({ open: false })} onConfirm={handleCreateEntry} confirmLabel="Initialize Node">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '12px' }}>NODE IDENTIFIER</label><input autoFocus value={modal.data?.name || ''} onChange={(e) => setModal({...modal, data: { ...modal.data, name: e.target.value }})} placeholder="Registry ID..." style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '16px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }} /></div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '12px' }}>SUMMARY</label><textarea value={modal.data?.description || ''} onChange={(e) => setModal({...modal, data: { ...modal.data, description: e.target.value }})} placeholder="Provide goals..." style={{ width: '100%', height: '100px', background: '#020617', border: '1px solid #1e293b', padding: '16px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none', resize: 'none' }} /></div>
          </div>
        </Modal>
      )}

      {modal.type === 'edit_summary' && (
        <Modal isOpen={modal.open} title="EDIT LEAD SUMMARY" onClose={() => setModal({ open: false })} onConfirm={() => { setIntentData({...intentData, description: modal.data.description}); setModal({ open: false }); }} confirmLabel="Update Summary">
          <textarea autoFocus value={modal.data?.description || ''} onChange={(e) => setModal({...modal, data: { ...modal.data, description: e.target.value }})} style={{ width: '100%', height: '200px', background: '#020617', border: '1px solid #1e293b', padding: '16px', color: '#fff', borderRadius: '12px', boxSizing: 'border-box', outline: 'none', resize: 'none', lineHeight: '1.6' }} />
        </Modal>
      )}

      {(modal.type === 'add_section' || modal.type === 'edit_section') && (
        <Modal isOpen={modal.open} title={modal.type === 'add_section' ? "NEW SECTION" : "EDIT SECTION"} onClose={() => setModal({ open: false })} onConfirm={() => {
          const s = [...(intentData.sections || [])];
          const payload = { title: modal.data.title, level: modal.data.level, description: modal.data.description };
          if (modal.type === 'add_section') s.push({ ...payload, parameters: [] });
          else s[modal.data.index] = { ...s[modal.data.index], ...payload };
          setIntentData({...intentData, sections: s}); setModal({ open: false });
        }} confirmLabel="Save Section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px' }}>HEADER LEVEL</label><select value={modal.data.level} onChange={e => setModal({...modal, data: {...modal.data, level: parseInt(e.target.value)}})} style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '12px', color: '#fff', borderRadius: '12px' }}>{[1,2,3,4,5,6].map(l => <option key={l} value={l}>Header {l}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px' }}>TITLE</label><input autoFocus value={modal.data.title} onChange={e => setModal({...modal, data: {...modal.data, title: e.target.value}})} style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '12px', color: '#fff', borderRadius: '12px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px' }}>INTRO DESCRIPTION</label><textarea value={modal.data.description} onChange={e => setModal({...modal, data: {...modal.data, description: e.target.value}})} style={{ width: '100%', height: '100px', background: '#020617', border: '1px solid #1e293b', padding: '12px', color: '#fff', borderRadius: '12px', resize: 'none' }} /></div>
          </div>
        </Modal>
      )}

      {(modal.type === 'add_parameter' || modal.type === 'edit_parameter') && (
        <Modal isOpen={modal.open} title={modal.type === 'add_parameter' ? "NEW PARAMETER" : "EDIT PARAMETER"} onClose={() => setModal({ open: false })} onConfirm={() => {
          const s = [...intentData.sections];
          if (modal.type === 'add_parameter') s[modal.data.sectionIndex].parameters.push({ name: modal.data.name, value: modal.data.value });
          else s[modal.data.sectionIndex].parameters[modal.data.paramIndex] = { name: modal.data.name, value: modal.data.value };
          setIntentData({...intentData, sections: s}); setModal({ open: false });
        }} confirmLabel="Save Parameter">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px' }}>PARAMETER NAME</label><input autoFocus value={modal.data.name} onChange={e => setModal({...modal, data: {...modal.data, name: e.target.value}})} style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', padding: '12px', color: '#fff', borderRadius: '12px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '0.65rem', color: '#475569', fontWeight: '900', marginBottom: '10px' }}>VALUE / LOGIC</label><textarea value={modal.data.value} onChange={e => setModal({...modal, data: {...modal.data, value: e.target.value}})} style={{ width: '100%', height: '100px', background: '#020617', border: '1px solid #1e293b', padding: '12px', color: '#fff', borderRadius: '12px', resize: 'none' }} /></div>
          </div>
        </Modal>
      )}

      <Modal isOpen={modal.open && (modal.type === 'delete_container' || modal.type === 'delete_entry')} title="SYSTEM PURGE" onClose={() => setModal({ open: false })} onConfirm={async () => {
        if (modal.type === 'delete_container') { await axios.delete(`/api/containers/${encodeURIComponent(modal.data.id)}`); setContainers(containers.filter(c => c.id !== modal.data.id)); }
        else { await axios.delete(`/api/entries/${encodeURIComponent(activeContainer.id)}/${encodeURIComponent(modal.data.id)}`); setEntries(entries.filter(e => e.id !== modal.data.id)); }
        setModal({ open: false });
      }} confirmLabel="Execute Purge" variant="danger"><p style={{ margin: 0, color: '#cbd5e1' }}>Purging <strong style={{ color: '#fff' }}>{modal.data?.name}</strong>. Operation is absolute.</p></Modal>
    </div>
  );
};

export default App;
