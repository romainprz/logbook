// src/App.jsx - VERSION SIMPLIFIÉE POUR DÉBOGUER
import React, { useState, useEffect } from 'react';
import { Calendar, Users, X, Plus } from 'lucide-react';
import { 
  getParticipants, 
  getParticipantByCode, 
  getEntries, 
  createParticipant,
  upsertEntry,
  getSettings
} from './lib/supabase';

const App = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('🔵 Starting loadData...');
      setLoading(true);
      setError(null);
      
      const [participantsData, entriesData, settingsData] = await Promise.all([
        getParticipants().catch(e => { console.error('❌ Participants error:', e); return []; }),
        getEntries().catch(e => { console.error('❌ Entries error:', e); return []; }),
        getSettings().catch(e => { console.error('❌ Settings error:', e); return null; })
      ]);
      
      console.log('✅ Data loaded:', { 
        participants: participantsData?.length, 
        entries: entriesData?.length,
        settings: settingsData 
      });
      
      setParticipants(participantsData || []);
      setEntries(entriesData || []);
      setSettings(settingsData || {
        studyStartDate: '2025-12-06',
        showProgressBar: true,
        companyName: 'Lab Capillaire'
      });
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError(error.message);
      // Initialiser avec valeurs par défaut
      setParticipants([]);
      setEntries([]);
      setSettings({
        studyStartDate: '2025-12-06',
        showProgressBar: true,
        companyName: 'Lab Capillaire'
      });
    } finally {
      setLoading(false);
      console.log('🔵 loadData finished');
    }
  };

  // Login Component
  const LoginScreen = () => {
    const [code, setCode] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLogging, setIsLogging] = useState(false);

    const handleLogin = async () => {
      console.log('🔵 Login attempt with code:', code);
      setIsLogging(true);
      setLoginError('');

      try {
        if (code === '9999') {
          console.log('✅ Admin login');
          setView('admin');
          return;
        }

        console.log('🔵 Fetching participant...');
        const participant = await getParticipantByCode(code);
        console.log('✅ Participant found:', participant);
        setCurrentUser(participant);
        setView('participant');
      } catch (error) {
        console.error('❌ Login error:', error);
        setLoginError('Code invalide. Vérifiez votre code à 4 chiffres.');
      } finally {
        setIsLogging(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Étude Capillaire</h1>
            <p className="text-gray-600">Logbook 28 jours</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                ⚠️ Erreur de chargement : {error}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code Participant (4 chiffres)
              </label>
              <input
                type="text"
                maxLength="4"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 text-2xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none tracking-widest"
                placeholder="••••"
                disabled={isLogging}
              />
              {loginError && (
                <p className="text-red-500 text-sm mt-2">{loginError}</p>
              )}
            </div>

            <button
              onClick={handleLogin}
              disabled={isLogging || !code || code.length !== 4}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogging ? 'Connexion...' : 'Se connecter'}
            </button>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Administrateurs : code 9999</p>
              <p className="text-xs mt-2">Participants: {participants.length} | Entrées: {entries.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin Panel Simple
  const AdminPanel = () => {
    const [showAddModal, setShowAddModal] = useState(false);

    console.log('🔵 Rendering AdminPanel');

    const AddModal = () => {
      const [newP, setNewP] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        code: '',
        startDate: '2025-12-06'
      });
      const [saving, setSaving] = useState(false);

      const handleAdd = async () => {
        if (newP.code.length !== 4) {
          alert('❌ Le code doit contenir 4 chiffres');
          return;
        }
        
        setSaving(true);
        try {
          await createParticipant(newP);
          await loadData();
          alert('✅ Panéliste ajouté !');
          setShowAddModal(false);
        } catch (error) {
          console.error('Error:', error);
          alert('❌ Erreur: ' + error.message);
        } finally {
          setSaving(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Nouveau Panéliste</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Prénom"
                value={newP.firstName}
                onChange={(e) => setNewP({ ...newP, firstName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Nom"
                value={newP.lastName}
                onChange={(e) => setNewP({ ...newP, lastName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                value={newP.email}
                onChange={(e) => setNewP({ ...newP, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={newP.phone}
                onChange={(e) => setNewP({ ...newP, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                maxLength="4"
                placeholder="Code (4 chiffres)"
                value={newP.code}
                onChange={(e) => setNewP({ ...newP, code: e.target.value.replace(/\D/g, '') })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <button
              onClick={() => setView('login')}
              className="text-gray-600 hover:text-gray-900"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{participants.length}</div>
                <div className="text-sm text-gray-600">Panélistes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{entries.length}</div>
                <div className="text-sm text-gray-600">Entrées</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {participants.length > 0 ? Math.round((entries.length / (participants.length * 28)) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Complétion</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Panélistes</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau
              </button>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Aucun panéliste. Cliquez sur "Nouveau" pour en ajouter un.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {participants.map(p => (
                    <tr key={p.code} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold">{p.code}</td>
                      <td className="px-4 py-3">{p.firstName} {p.lastName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {showAddModal && <AddModal />}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  console.log('🔵 Current view:', view);

  // Main render
  if (view === 'login') return <LoginScreen />;
  if (view === 'admin') return <AdminPanel />;
  if (view === 'participant') return <div className="p-8">Participant view (à développer)</div>;

  return <LoginScreen />;
};

export default App;
