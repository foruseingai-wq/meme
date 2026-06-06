import { useState, useEffect } from 'react';
import { autoAssignBridges } from '../data/state';
import { useToast } from './Toast';
import MatchResultsCard from './MatchResultsCard';
import { AlertCircle, CheckCircle2, AlertTriangle, Activity, Users, Shield, User, HeartPulse, Filter, Search } from 'lucide-react';

export default function CommunityView({ activeSection, patients, donors }) {
  const showToast = useToast();
  const [autoAssignments, setAutoAssignments] = useState({});
  
  // Filters
  const [patientFilter, setPatientFilter] = useState('all');
  const [fleetFilter, setFleetFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Admin System',
    region: 'Central Node',
    contactEmail: 'admin@bloodwarriors.org'
  });

  useEffect(() => {
    const assignments = {};
    patients.forEach(p => {
      assignments[p.id] = autoAssignBridges(p, donors);
    });
    setAutoAssignments(assignments);
  }, [patients, donors]);

  const activeAlerts = patients.filter(p => p.emergencyMode);
  const eligibleDonors = donors.filter(d => d.canDonate).length;
  const cooldownDonors = donors.length - eligibleDonors;
  const lowReliability = donors.filter(d => d.reliabilityScore < 70);

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    showToast('Admin Profile updated successfully', 'success');
  };

  // Filter Logic
  const filteredPatients = patients.filter(p => {
    if (patientFilter === 'emergency') return p.emergencyMode;
    if (patientFilter === 'stable') return !p.emergencyMode;
    return true;
  }).filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.bloodGroup.includes(searchQuery));

  const filteredFleet = donors.filter(d => {
    if (fleetFilter === 'eligible') return d.canDonate;
    if (fleetFilter === 'cooldown') return !d.canDonate;
    if (fleetFilter === 'low-score') return d.reliabilityScore < 70;
    return true;
  }).filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.bloodGroup.includes(searchQuery));

  // Emergency Donors are those eligible AND highly reliable, plus unassigned
  const emergencyDonors = donors.filter(d => d.canDonate && d.reliabilityScore >= 80);

  return (
    <div className="w-full h-full flex flex-col">

      {/* =========================================
          SECTION: AI MATCHING
          ========================================= */}
      {activeSection === 'ai-matching' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col gap-6">
            <div className="card border-l-4 border-l-rose-500">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                <AlertCircle className="text-rose-500 animate-pulse" size={20} /> AI Emergency Escalations
              </h3>
              {activeAlerts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {activeAlerts.map(p => (
                    <div key={`alert-${p.id}`} className="bg-rose-50 p-4 rounded-lg border border-rose-100 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-rose-900 mb-1">{p.name}</div>
                        <p className="text-xs text-rose-700">
                          Bridge cycle broken. Double skip detected. Sending SOS.
                        </p>
                      </div>
                      <button className="bg-rose-600 text-white text-xs font-semibold py-2 px-4 rounded shadow-sm hover:bg-rose-700 transition-colors whitespace-nowrap ml-4" onClick={() => showToast('Emergency escalation sent to AI Outreach agent.', 'success')}>
                        Override AI
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 bg-teal-50 rounded-lg border border-teal-100">
                  <CheckCircle2 className="text-teal-500 mb-2" size={32} />
                  <span className="font-semibold text-teal-700">All Patient Cycles Stable</span>
                  <span className="text-xs text-teal-600 mt-1">No AI escalations required</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-6">
                <MatchResultsCard />
              </div>

              <div className="card">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Bridge Auto-Scheduler</h3>
                <p className="text-xs text-slate-500 mb-4">ARIA auto-schedule 10-person cycle status.</p>
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {patients.map(p => {
                    const assignData = autoAssignments[p.id];
                    if (!assignData) return null;
                    const bridgePercent = (assignData.totalAssigned / p.requiredBridgesPerMonth) * 100;
                    
                    return (
                      <div key={`assign-${p.id}`} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-sm text-slate-700">{p.name}</span>
                          {assignData.fullyStaffed ? (
                            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">STAFFED</span>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{assignData.totalAssigned}/10 CYCLE</span>
                          )}
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${bridgePercent >= 100 ? 'bg-teal-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, bridgePercent)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: PATIENTS
          ========================================= */}
      {activeSection === 'patients' && (
        <div className="card h-full flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <HeartPulse className="text-rose-600" size={20} /> Patient Database
            </h3>
            
            <div className="flex gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                  placeholder="Search name or blood group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white"
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
              >
                <option value="all">All Patients</option>
                <option value="emergency">Emergency Mode</option>
                <option value="stable">Stable Bridges</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
              <User size={16} /> Add New Patient
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input placeholder="Full Name" className="p-2 text-sm border border-slate-300 rounded-lg bg-white" />
              <select className="p-2 text-sm border border-slate-300 rounded-lg bg-white">
                <option value="">Blood Group...</option>
                <option value="A+">A+</option>
                <option value="O-">O-</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
              </select>
              <input placeholder="Hospital Link / Name" className="p-2 text-sm border border-slate-300 rounded-lg bg-white" />
              <div className="flex gap-2">
                <input type="date" className="flex-1 p-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-500" />
                <button className="bg-teal-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-teal-700 text-sm" onClick={() => showToast('New patient added successfully!', 'success')}>
                  ADD
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
            {filteredPatients.map(p => (
              <div key={p.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm">
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                    {p.name} 
                    <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100">{p.bloodGroup}</span>
                  </div>
                  <div className="text-xs text-slate-500">Hospital: {p.preferredHospital} • Next Transfusion: {p.nextTransfusionDate}</div>
                </div>
                <div>
                  {p.emergencyMode ? (
                    <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1">
                      <AlertTriangle size={14} /> EMERGENCY
                    </span>
                  ) : (
                    <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1">
                      <CheckCircle2 size={14} /> STABLE
                    </span>
                  )}
                </div>
              </div>
            ))}
            {filteredPatients.length === 0 && <div className="text-center py-10 text-slate-500 italic">No patients match the filters.</div>}
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: DONOR FLEET
          ========================================= */}
      {activeSection === 'fleet' && (
        <div className="card h-full flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Users className="text-indigo-600" size={20} /> Donor Fleet
            </h3>
            
            <div className="flex gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                  placeholder="Search name or blood group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white"
                value={fleetFilter}
                onChange={(e) => setFleetFilter(e.target.value)}
              >
                <option value="all">All Donors</option>
                <option value="eligible">Eligible Now</option>
                <option value="cooldown">In Cooldown</option>
                <option value="low-score">Low Reliability (&lt; 70%)</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFleet.map(d => (
              <div key={d.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    {d.name} <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{d.bloodGroup}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Score: <span className={d.reliabilityScore >= 80 ? 'text-teal-600 font-bold' : d.reliabilityScore < 70 ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>{d.reliabilityScore}%</span></div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {d.canDonate ? (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded">ELIGIBLE</span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">COOLDOWN</span>
                  )}
                  {d.reliabilityScore < 70 && (
                    <button className="text-[10px] text-indigo-600 hover:underline" onClick={() => showToast('AI engaged', 'info')}>Engage</button>
                  )}
                </div>
              </div>
            ))}
            {filteredFleet.length === 0 && <div className="text-center py-10 text-slate-500 italic md:col-span-2">No donors match the filters.</div>}
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: EMERGENCY DONORS
          ========================================= */}
      {activeSection === 'emergencies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-2 card h-full flex flex-col">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-200 pb-4 mb-4">
              <AlertTriangle className="text-amber-500" size={20} /> Emergency Response Fleet
            </h3>
            <p className="text-sm text-slate-500 mb-4">Donors who are eligible RIGHT NOW and have high reliability scores (&gt;80%). Use these donors to instantly patch broken bridge cycles.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {emergencyDonors.map(d => (
                <div key={d.id} className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center shadow-sm">
                  <div className="flex flex-col gap-1">
                    <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                      {d.name} 
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">{d.bloodGroup}</span>
                    </div>
                    <div className="text-xs text-amber-700">Location: {d.travelDistanceKm}km away • Prefers: {d.preferredDonationTime}</div>
                  </div>
                  <button className="bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors shadow-sm" onClick={() => showToast(`Emergency dispatch sent to ${d.name}`, 'success')}>
                    DISPATCH NOW
                  </button>
                </div>
              ))}
              {emergencyDonors.length === 0 && <div className="text-center py-10 text-slate-500 italic">No emergency donors available right now.</div>}
            </div>
          </div>

          <div className="card h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Local Blood Bank Status</h3>
            <p className="text-sm text-slate-500 mb-6">If no donors are available, AI will route patients to these reserves.</p>
            
            <div className="flex flex-col gap-4">
              <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800">A+ Packed Cells</div>
                  <div className="text-xs text-slate-500">Apollo Blood Bank</div>
                </div>
                <div className="text-2xl font-black text-teal-600">42<span className="text-sm font-normal text-slate-500 ml-1">units</span></div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800">B+ Packed Cells</div>
                  <div className="text-xs text-slate-500">Lilavati Blood Bank</div>
                </div>
                <div className="text-2xl font-black text-amber-500">8<span className="text-sm font-normal text-slate-500 ml-1">units</span></div>
              </div>
              <div className="border border-rose-200 bg-rose-50 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-rose-900">O- Universal</div>
                  <div className="text-xs text-rose-700">Central Reserve</div>
                </div>
                <div className="text-2xl font-black text-rose-600">2<span className="text-sm font-normal text-rose-600/70 ml-1">units</span></div>
              </div>
            </div>
            
            <button className="w-full mt-auto bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors">
              PULL FROM BANK
            </button>
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: ADMIN PORTAL
          ========================================= */}
      {activeSection === 'admin' && (
        <div className="card max-w-2xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Shield className="text-slate-500" size={20} /> Admin Settings
            </h3>
            <button 
              className={`text-sm font-semibold px-4 py-1.5 rounded-lg border ${isEditingProfile ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-white border-slate-800'}`}
              onClick={() => {
                if (isEditingProfile) {
                  setProfileData({ name: 'Admin System', region: 'Central Node', contactEmail: 'admin@bloodwarriors.org' });
                }
                setIsEditingProfile(!isEditingProfile);
              }}
            >
              {isEditingProfile ? 'Cancel' : 'Edit Configuration'}
            </button>
          </div>
          
          <div className="flex flex-col gap-6">
            <div>
              <label className="!mt-0">System Interface Name</label>
              {isEditingProfile ? (
                <input value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2">{profileData.name}</div>
              )}
            </div>

            <div>
              <label className="!mt-0">Region Node</label>
              {isEditingProfile ? (
                <input value={profileData.region} onChange={e => setProfileData({ ...profileData, region: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2">{profileData.region}</div>
              )}
            </div>

            <div>
              <label className="!mt-0">Escalation Email Contact</label>
              {isEditingProfile ? (
                <input value={profileData.contactEmail} onChange={e => setProfileData({ ...profileData, contactEmail: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2">{profileData.contactEmail}</div>
              )}
            </div>

            {isEditingProfile && (
              <button className="w-full bg-teal-600 text-white font-semibold py-3 rounded-xl shadow hover:bg-teal-700 mt-4" onClick={handleSaveProfile}>
                Save System Config
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
