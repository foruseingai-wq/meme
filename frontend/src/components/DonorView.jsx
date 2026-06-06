import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { generateBridgePrompts, coupons, events, chatMessages } from '../data/state';
import { Droplets, Award, Calendar, Send, User, MapPin, HeartPulse, Clock, ShieldAlert } from 'lucide-react';

export default function DonorView({ activeSection, donor, patients, onUpdate }) {
  const showToast = useToast();
  const [prompts, setPrompts] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: donor.name,
    contact: donor.contact,
    preferredLocation: donor.preferredLocation || 'Main Blood Center',
  });

  useEffect(() => {
    setPrompts(generateBridgePrompts(4));
  }, []);

  const myPatient = patients.find(p => p.id === donor.assignedPatientId);

  // Early donation logic (within 10 days)
  const today = new Date();
  const eligibleDate = donor.nextEligibleDate ? new Date(donor.nextEligibleDate) : today;
  const daysUntilEligible = Math.ceil((eligibleDate - today) / (1000 * 60 * 60 * 24));
  const canDonateEarly = !donor.canDonate && daysUntilEligible > 0 && daysUntilEligible <= 10;

  const handleSaveProfile = () => {
    onUpdate({ ...donor, ...profileData });
    setIsEditingProfile(false);
    showToast('Profile updated successfully', 'success');
  };

  const handleRecordDonation = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 90);
    const updatedDonor = {
      ...donor,
      canDonate: false,
      nextEligibleDate: nextDate.toISOString().split('T')[0],
      totalDonations: donor.totalDonations + 1,
      coins: donor.coins + 90
    };
    onUpdate(updatedDonor);
    showToast(`🩸 Donation recorded! +90 coins earned. Next eligible: ${updatedDonor.nextEligibleDate}`, 'success');
  };

  const handleBecomeBridge = (prompt) => {
    showToast(`Pledged to become a bridge for ${prompt.patientName}.`, 'success');
    setPrompts(prev => prev.filter(p => p.id !== prompt.id));
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* =========================================
          SECTION: MAIN DASHBOARD 
          ========================================= */}
      {activeSection === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dynamic Left Column based on Bridge Status */}
          <div className="flex flex-col gap-6">
            {myPatient ? (
              // IS BRIDGED VIEW
              <div className="card h-full flex flex-col">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
                  <HeartPulse className="text-rose-500" size={20} /> My Bridge Mission
                </h3>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                  <div className="font-bold text-slate-800 text-xl mb-1">{myPatient.name}</div>
                  <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                    <MapPin size={14} /> {myPatient.preferredHospital || 'City Hospital'}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Urgency</span>
                      <span className={`font-bold ${myPatient.emergencyMode ? 'text-rose-600' : 'text-teal-600'}`}>
                        {myPatient.emergencyMode ? 'HIGH - EMERGENCY' : 'STABLE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Blood Required</span>
                      <span className="font-bold text-slate-800">{donor.bloodGroup}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Next Transfusion</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Clock size={14} /> {myPatient.nextTransfusionDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  {donor.canDonate ? (
                    <button className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl shadow hover:bg-rose-700 transition-colors" onClick={handleRecordDonation}>
                      Record Donation (+90 coins)
                    </button>
                  ) : canDonateEarly ? (
                    <div className="w-full text-center p-4 border border-teal-200 bg-teal-50 rounded-xl">
                      <div className="text-sm text-teal-800 font-bold mb-2">You are within 10 days of your eligibility ({daysUntilEligible} days left).</div>
                      <button className="w-full bg-teal-600 text-white font-semibold py-2 rounded-lg hover:bg-teal-700 transition-colors" onClick={handleRecordDonation}>
                        Donate Early at Hospital
                      </button>
                    </div>
                  ) : (
                    <div className="w-full text-center bg-amber-50 text-amber-700 font-semibold py-3 rounded-xl border border-amber-100">
                      Cooldown period. Next eligible: {donor.nextEligibleDate}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // NOT BRIDGED VIEW
              <div className="card h-full">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-2">
                  <Droplets className="text-rose-500" size={20} /> Choose Your Path
                </h3>
                <p className="text-sm text-slate-500 mb-6">You are currently unassigned. Choose how you want to save lives.</p>

                <div className="flex flex-col gap-4 mb-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer">
                    <div>
                      <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-2"><ShieldAlert size={16} /> Register as Emergency Responder</h4>
                      <p className="text-xs text-amber-700">Stay on standby for critical, life-threatening shortages. High commitment required.</p>
                    </div>
                    <button className="bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700" onClick={() => showToast('Registered as Emergency Responder!', 'success')}>
                      Select
                    </button>
                  </div>
                  
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex justify-between items-center hover:shadow-md transition-shadow cursor-pointer" onClick={() => showToast('Check the Donation Needs tab to pledge to a patient!', 'info')}>
                    <div>
                      <h4 className="font-bold text-teal-900 mb-1 flex items-center gap-2"><HeartPulse size={16} /> Pledge as Bridge Member</h4>
                      <p className="text-xs text-teal-700">Commit to regular donations for a specific Thalassemia patient.</p>
                    </div>
                    <button className="bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-teal-700">
                      Select
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
                  {prompts.slice(0, 3).map(prompt => (
                    <div key={prompt.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-amber-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${prompt.urgency === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                          {prompt.urgency === 'high' ? 'Urgent Need' : 'Unbridged'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800">{prompt.patientName}</div>
                      <div className="text-xs text-slate-500 mb-3">{prompt.location} • Needs {prompt.bridgesNeeded - prompt.currentBridges} bridges</div>
                      <button 
                        className="w-full bg-slate-800 text-white text-xs font-semibold py-2 rounded-lg hover:bg-slate-900"
                        onClick={() => handleBecomeBridge(prompt)}
                      >
                        Pledge as Bridge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Chat (Only if bridged) or General status */}
          <div className="flex flex-col gap-6">
            {myPatient ? (
              <div className="card flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                  Communication
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 min-h-[300px]">
                  {chatMessages.filter(c => c.bridgeId === `${myPatient.id}-${donor.id}`).map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.type === 'donor' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                        msg.type === 'donor' ? 'bg-amber-100 text-amber-900 rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100">
                  <input
                    className="flex-1 bg-slate-50 text-sm"
                    placeholder="Message..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setChatInput('')}
                  />
                  <button className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900" onClick={() => setChatInput('')}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="card flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4">
                  <Droplets className="text-amber-500" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No Active Assignment</h3>
                <p className="text-sm text-slate-500 mb-6">
                  You are currently floating in the general donor pool. ARIA will automatically assign you to a patient if an emergency match occurs, or you can pledge manually.
                </p>
                <div className="flex gap-4 w-full">
                  <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 uppercase font-bold">Reliability</div>
                    <div className="text-xl font-bold text-teal-600">{donor.reliabilityScore}%</div>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-500 uppercase font-bold">Status</div>
                    <div className="text-sm font-bold mt-1 text-slate-700">{donor.canDonate ? 'Ready' : 'Cooldown'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: DONATION NEEDS
          ========================================= */}
      {activeSection === 'needs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-[600px] overflow-y-auto">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
              <ShieldAlert className="text-rose-500" size={20} /> Urgent Needs & New Needers
            </h3>

            <div className="flex flex-col gap-4">
              {prompts.map(prompt => (
                <div key={prompt.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                  {prompt.urgency === 'high' && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-100 rounded-bl-full flex items-start justify-end p-2">
                      <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse mr-1 mt-1"></div>
                    </div>
                  )}
                  
                  <div className="font-bold text-slate-800 text-lg mb-1">{prompt.patientName}</div>
                  <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                    <MapPin size={14} /> {prompt.location}
                  </div>
                  
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg mb-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 uppercase font-bold">Blood Group</div>
                      <div className="font-bold text-slate-700">{donor.bloodGroup}</div>
                    </div>
                    <div className="text-center border-l border-r border-slate-200 px-4">
                      <div className="text-xs text-slate-400 uppercase font-bold">Bridges Needed</div>
                      <div className="font-bold text-slate-700">{prompt.bridgesNeeded - prompt.currentBridges}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 uppercase font-bold">Required By</div>
                      <div className="font-bold text-rose-600">{prompt.needByDate}</div>
                    </div>
                  </div>
                  
                  <button 
                    className={`w-full font-semibold py-3 rounded-lg transition-colors ${myPatient ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : prompt.urgency === 'high' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                    onClick={() => {
                      if (myPatient) {
                        showToast('You are already bridged to a patient and cannot pledge to another.', 'error');
                      } else {
                        handleBecomeBridge(prompt);
                      }
                    }}
                  >
                    {myPatient ? 'Already Bridged' : 'Commit to Donate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card h-[600px] flex flex-col items-center justify-center text-center bg-slate-50">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-slate-400">
               <HeartPulse size={32} />
             </div>
             <h3 className="font-bold text-slate-700 mb-2">More Needs Loading...</h3>
             <p className="text-sm text-slate-500">ARIA is continuously scanning for compatible patients.</p>
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: WALLET (Rewards & Camps)
          ========================================= */}
      {activeSection === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="card text-center bg-gradient-to-b from-amber-50 to-white border-amber-100">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-amber-500" size={40} />
              </div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Coins</h4>
              <div className="text-5xl font-extrabold text-amber-600 mb-6">{donor.coins}</div>
              
              <div className="bg-white rounded-lg border border-slate-100 p-4 text-left">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lifetime Stats</div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Total Donations</span>
                  <span className="font-bold text-slate-800">{donor.totalDonations}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Lives Saved (Est.)</span>
                  <span className="font-bold text-slate-800">{donor.totalDonations * 3}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="card">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Redeem Coupons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.filter(c => !c.claimed).map(c => (
                  <div key={c.id} className="border border-slate-200 rounded-xl p-5 hover:border-amber-300 transition-colors relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full group-hover:bg-amber-100 transition-colors -z-10"></div>
                    
                    <div className="font-bold text-lg text-slate-800 mb-1">{c.code}</div>
                    <div className="text-sm font-semibold text-amber-600 mb-4">
                      {c.discountType === 'percentage' ? `${c.discountValue}% Off` : `₹${c.discountValue} Discount`}
                    </div>
                    
                    <button 
                      className="w-full border-2 border-amber-500 text-amber-600 font-bold py-2 rounded-lg hover:bg-amber-500 hover:text-white transition-colors"
                      onClick={() => showToast('Coupon redeemed successfully!', 'success')}
                    >
                      REDEEM (50 Coins)
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Upcoming Events & Camps</h3>
              <p className="text-sm text-slate-500 mb-6">Attend ARIA-verified events to earn exclusive rewards.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map(e => (
                  <div key={e.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex gap-4 items-start hover:border-slate-300 transition-colors">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center text-rose-600 shadow-sm flex-shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{e.name}</div>
                      <div className="text-sm text-slate-500 mt-1">{e.venue}</div>
                      <div className="text-xs font-semibold text-teal-600 mt-2 bg-teal-50 inline-block px-2 py-1 rounded">
                        {e.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          SECTION: PROFILE
          ========================================= */}
      {activeSection === 'profile' && (
        <div className="card max-w-2xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <User className="text-slate-500" size={20} /> Donor Profile
            </h3>
            <button 
              className={`text-sm font-semibold px-4 py-1.5 rounded-lg border ${isEditingProfile ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-white border-slate-800'}`}
              onClick={() => {
                if (isEditingProfile) {
                  setProfileData({ name: donor.name, contact: donor.contact, preferredLocation: donor.preferredLocation || 'Main Blood Center' });
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
                <div className="text-sm text-slate-800 font-medium py-2">{donor.name}</div>
              )}
            </div>

            <div>
              <label className="!mt-0">Contact Number</label>
              {isEditingProfile ? (
                <input value={profileData.contact} onChange={e => setProfileData({ ...profileData, contact: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2">{donor.contact}</div>
              )}
            </div>

            <div>
              <label className="!mt-0">Blood Group</label>
              <div className="text-sm font-bold text-rose-600 bg-rose-50 inline-block px-3 py-1.5 rounded mt-2">{donor.bloodGroup}</div>
            </div>

            <div>
              <label className="!mt-0">Preferred Donation Area</label>
              {isEditingProfile ? (
                <input value={profileData.preferredLocation} onChange={e => setProfileData({ ...profileData, preferredLocation: e.target.value })} />
              ) : (
                <div className="text-sm text-slate-800 font-medium py-2">{profileData.preferredLocation}</div>
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
