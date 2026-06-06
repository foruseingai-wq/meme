import { useState } from 'react';
import { useToast } from './Toast';
import { chatMessages, getCurrentBridgePair, handleBridgeSkip, advanceBridgeCycle } from '../data/state';
import { Send, HeartPulse, ClipboardList, ShieldAlert, Phone, User, History, FileText, AlertTriangle } from 'lucide-react';

export default function PatientView({ activeSection, patient, donors, onUpdate }) {
  const showToast = useToast();
  
  // Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: patient.name,
    contact: patient.contact,
    medicalHistory: patient.medicalHistory,
    medicalNotes: patient.medicalNotes || ''
  });

  const [chatInput, setChatInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Get current cycle pair
  const { mainId, backupId } = getCurrentBridgePair(patient);
  const mainDonor = donors.find(d => d.id === mainId);
  const backupDonor = donors.find(d => d.id === backupId);

  const bridgePercent = (patient.currentBridgeCount / patient.requiredBridgesPerMonth) * 100;

  const handleSaveProfile = () => {
    onUpdate({ ...patient, ...profileData });
    setIsEditingProfile(false);
    showToast('Profile updated successfully', 'success');
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    showToast('Message sent to ' + mainDonor?.name, 'success');
    setChatInput('');
  };

  const simulateSkip = (donorId) => {
    handleBridgeSkip(patient.id, donorId);
    showToast(`${donorId === mainId ? 'Main' : 'Backup'} donor skipped. Cycle updated!`, 'info');
    // Force re-render by triggering onUpdate with a cloned patient
    onUpdate({ ...patient });
  };

  const simulateDonation = (donorId) => {
    advanceBridgeCycle(patient.id, donorId);
    showToast(`Donation recorded from ${donorId === mainId ? 'Main' : 'Backup'}. Cycle advanced!`, 'success');
    onUpdate({ ...patient });
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* =========================================
          SECTION: MAIN DASHBOARD 
          ========================================= */}
      {activeSection === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1: Basic Bridge Info & Upcoming Donors */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="card">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-2">
                <HeartPulse className="text-rose-500" size={20} /> Bridge Health (10-Person Cycle)
              </h3>
              
              <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
                <div
                  className={`h-full rounded-full transition-all ${patient.emergencyMode ? 'bg-rose-500' : 'bg-teal-500'}`}
                  style={{ width: `${Math.min(100, bridgePercent)}%` }}
                ></div>
              </div>

              {patient.emergencyMode ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
                  <h4 className="flex items-center gap-2 text-rose-800 font-bold mb-1">
                    <ShieldAlert size={16} /> EMERGENCY MODE
                  </h4>
                  <p className="text-xs text-rose-600">
                    Auto-requesting packed cells. Both Main and Backup skipped the current cycle.
                  </p>
                </div>
              ) : (
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-6">
                  <p className="text-teal-700 font-bold flex justify-between">
                    <span>✅ Bridge Cycle Active</span>
                    <span className="text-xs">Current Index: {patient.cycleIndex + 1}/10</span>
                  </p>
                  <p className="text-xs text-teal-600 mt-1">Next transfusion scheduled: {patient.nextTransfusionDate}</p>
                </div>
              )}

              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upcoming Donors (Current Slot)</h4>
              <div className="flex flex-col gap-3">
                {/* Main Donor */}
                {mainDonor && (
                  <div className="p-3 bg-white shadow-sm rounded-lg border-2 border-teal-200 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">MAIN</span>
                        {mainDonor.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex gap-3">
                        <span>Next eligible: {mainDonor.nextEligibleDate || "Now"}</span>
                        {patient.skipCount[mainDonor.id] > 0 && <span className="text-rose-500 font-bold flex items-center gap-1"><AlertTriangle size={10}/> 1 Skip Detected</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-emerald-100 p-2 rounded-full text-emerald-600 hover:bg-emerald-200 ml-2" onClick={() => showToast(`Calling ${mainDonor.name}...`, 'success')}>
                        <Phone size={16} />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Backup Donor */}
                {backupDonor && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">BACKUP</span>
                        {backupDonor.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex gap-3">
                        <span>Next eligible: {backupDonor.nextEligibleDate || "Now"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-emerald-100 p-2 rounded-full text-emerald-600 hover:bg-emerald-200 ml-2" onClick={() => showToast(`Calling ${backupDonor.name}...`, 'success')}>
                        <Phone size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2: Communication Chatbox */}
          <div className="flex flex-col gap-6">
            <div className="card h-full flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Communication</h3>
              
              {mainDonor ? (
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <div className="font-semibold text-xs text-slate-500 mb-4 pb-2 border-b border-slate-100">
                    Chat with Main Donor: {mainDonor.name}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
                    {chatMessages.filter(c => c.bridgeId === `${patient.id}-${mainDonor.id}`).map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.type === 'patient' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                          msg.type === 'patient' 
                            ? 'bg-rose-600 text-white rounded-br-sm' 
                            : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">{msg.timestamp}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                    <input
                      className="flex-1 bg-slate-50 text-sm"
                      placeholder="Type message..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    />
                    <button className="bg-rose-600 text-white p-2 rounded-lg hover:bg-rose-700" onClick={handleSendChat}>
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-400 italic text-center p-4">
                  No main donor assigned.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: MEDICAL UPDATES 
          ========================================= */}
      {activeSection === 'medical' && (
        <div className="card flex flex-col gap-6 items-center justify-center min-h-[400px]">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Medical Updates</h2>
          <p className="text-sm text-slate-500 mb-8">Access your donation logs and official medical reports here.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center">
                <History size={32} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Donation History</h3>
                <p className="text-xs text-slate-500">See who gave blood and at what time.</p>
              </div>
              <button 
                className="w-full bg-teal-600 text-white py-2 rounded-lg font-semibold hover:bg-teal-700 mt-auto"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Hide History' : 'View History'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                <FileText size={32} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Medical Report</h3>
                <p className="text-xs text-slate-500">Your latest personal updated medical report.</p>
              </div>
              <button 
                className="w-full bg-rose-600 text-white py-2 rounded-lg font-semibold hover:bg-rose-700 mt-auto"
                onClick={() => setShowReport(!showReport)}
              >
                {showReport ? 'Hide Report' : 'View Report'}
              </button>
            </div>
          </div>

          {/* Expanded sections */}
          {showHistory && (
            <div className="w-full max-w-2xl mt-4 bg-white border border-teal-200 rounded-xl p-4 shadow-sm">
              <h4 className="font-bold text-teal-800 mb-3 border-b border-teal-100 pb-2">Recent Donations Received</h4>
              <ul className="text-sm text-slate-600 flex flex-col gap-2">
                <li className="flex justify-between"><span>Kiran Mehta</span> <span>Jul 14, 2025 - 10:30 AM</span></li>
                <li className="flex justify-between"><span>Arjun Nair</span> <span>Jun 28, 2025 - 11:15 AM</span></li>
              </ul>
            </div>
          )}
          
          {showReport && (
            <div className="w-full max-w-2xl mt-4 bg-white border border-rose-200 rounded-xl p-4 shadow-sm">
              <h4 className="font-bold text-rose-800 mb-3 border-b border-rose-100 pb-2">Updated Medical Report</h4>
              <div className="text-sm text-slate-600 flex flex-col gap-2">
                <p><strong>Last Hemoglobin:</strong> {patient.lastTransfusionHb || '8.1'} g/dL</p>
                <p><strong>Next Transfusion:</strong> {patient.nextTransfusionDate}</p>
                <p><strong>Hospital:</strong> {patient.preferredHospital}</p>
                <p className="mt-2 text-xs italic">Notes: {patient.medicalNotes || 'Stable condition. Regular monitoring required.'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================
          SECTION: PROFILE 
          ========================================= */}
      {activeSection === 'profile' && (
        <div className="card max-w-2xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <User className="text-slate-500" size={20} /> My Profile
            </h3>
            <button 
              className={`text-sm font-semibold px-4 py-1.5 rounded-lg border ${isEditingProfile ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-white border-slate-800'}`}
              onClick={() => {
                if (isEditingProfile) {
                  setProfileData({
                    name: patient.name, contact: patient.contact, medicalHistory: patient.medicalHistory, medicalNotes: patient.medicalNotes || ''
                  });
                }
                setIsEditingProfile(!isEditingProfile);
              }}
            >
              {isEditingProfile ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          
          <div className="flex flex-col gap-6">
            <div>
              <label className="!mt-0">Full Name</label>
              {isEditingProfile ? (
                <input value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2">{patient.name}</div>
              )}
            </div>

            <div>
              <label className="!mt-0">Contact Number</label>
              {isEditingProfile ? (
                <input value={profileData.contact} onChange={e => setProfileData({ ...profileData, contact: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2">{patient.contact}</div>
              )}
            </div>

            <div>
              <label className="!mt-0">Medical History</label>
              {isEditingProfile ? (
                <textarea rows="3" value={profileData.medicalHistory} onChange={e => setProfileData({ ...profileData, medicalHistory: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2 leading-relaxed">{patient.medicalHistory}</div>
              )}
            </div>

            {isEditingProfile && (
              <button className="w-full bg-teal-600 text-white font-semibold py-3 rounded-xl shadow hover:bg-teal-700 mt-4" onClick={handleSaveProfile}>
                Save Changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
