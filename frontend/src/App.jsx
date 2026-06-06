import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Activity, Settings, LogOut, ChevronLeft, ChevronRight, Droplets, HeartPulse, Shield, FileText, Search, User, Award, List } from 'lucide-react';
import { ToastProvider } from './components/Toast';
import Home from './components/Home';
import CommunityView from './components/CommunityView';
import PatientView from './components/PatientView';
import DonorView from './components/DonorView';
import { apiCall } from './data/api';

function Sidebar({ role, activeSection, setActiveSection, isExpanded, setIsExpanded, onLogout }) {
  const getNavItems = () => {
    switch (role) {
      case 'community':
        return [
          { id: 'ai-matching', name: 'AI Matching', icon: LayoutDashboard },
          { id: 'patients', name: 'Patient Info', icon: List },
          { id: 'fleet', name: 'Donor Fleet', icon: Users },
          { id: 'emergencies', name: 'Emergency Donors', icon: Activity },
          { id: 'admin', name: 'Admin Portal', icon: Shield },
        ];
      case 'patient':
        return [
          { id: 'dashboard', name: 'Main Dashboard', icon: LayoutDashboard },
          { id: 'medical', name: 'Medical Updates', icon: FileText },
          { id: 'profile', name: 'My Profile', icon: User },
        ];
      case 'donor':
        return [
          { id: 'dashboard', name: 'Main Dashboard', icon: LayoutDashboard },
          { id: 'needs', name: 'Donation Needs', icon: HeartPulse },
          { id: 'wallet', name: 'Wallet', icon: Award },
          { id: 'profile', name: 'My Profile', icon: User },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div 
      className={`${isExpanded ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 h-full flex flex-col transition-all duration-300 relative z-20`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 flex-shrink-0 bg-rose-600 rounded flex items-center justify-center text-white font-bold">
            A
          </div>
          {isExpanded && <span className="font-bold text-slate-800 tracking-tight whitespace-nowrap">ARIA System</span>}
        </div>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === item.id ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {isExpanded && <span className="whitespace-nowrap">{item.name}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition-colors"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {isExpanded && <span>Exit Portal</span>}
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [role, setRole] = useState(null); 
  const [activeSection, setActiveSection] = useState('');
  const [patients, setPatients] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [patientsData, donorsData] = await Promise.all([
          apiCall('/donors/patients/list'),
          apiCall('/donors/list?limit=100')
        ]);
        if (patientsData && patientsData.patients) setPatients(patientsData.patients);
        if (donorsData && donorsData.donors) setDonors(donorsData.donors);
      } catch (err) {
        console.error("Failed to load backend data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdatePatient = (updatedPatient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const handleUpdateDonor = (updatedDonor) => {
    setDonors(prev => prev.map(d => d.id === updatedDonor.id ? updatedDonor : d));
  };

  const handleRoleSelect = (r) => {
    setRole(r);
    if (r === 'community') setActiveSection('ai-matching');
    else setActiveSection('dashboard');
  };

  if (!role) {
    return <Home onSelectRole={handleRoleSelect} />;
  }

  // Dashboard View with Sidebar Layout
  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      <Sidebar 
        role={role} 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isExpanded={sidebarExpanded} 
        setIsExpanded={setSidebarExpanded} 
        onLogout={() => setRole(null)} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0 z-10">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            {role === 'community' && <><Shield size={20} className="text-teal-600" /> Community Command Center</>}
            {role === 'patient' && <><HeartPulse size={20} className="text-rose-600" /> Patient Portal — {patients.length > 0 ? patients[0].name : "Loading..."}</>}
            {role === 'donor' && <><Droplets size={20} className="text-amber-500" /> Donor Hub — {donors.length > 0 ? donors[0].name : "Loading..."}</>}
          </h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="p-8 w-full max-w-7xl mx-auto overflow-y-auto flex-1">
          {loading ? (
             <div className="h-full flex items-center justify-center flex-col gap-4 text-slate-400">
               <div className="spinner w-12 h-12 border-4 border-t-teal-500 rounded-full animate-spin"></div>
               <p>Syncing ARIA Dataset...</p>
             </div>
          ) : (
            <>
              {role === 'community' && <CommunityView activeSection={activeSection} patients={patients} donors={donors} />}
              {role === 'patient' && patients.length > 0 && <PatientView activeSection={activeSection} patient={patients[0]} donors={donors} onUpdate={handleUpdatePatient} />}
              {role === 'donor' && donors.length > 0 && <DonorView activeSection={activeSection} donor={donors[0]} patients={patients} onUpdate={handleUpdateDonor} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
