// src/App.jsx - VERSION COMPLÈTE FINALE
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, X, Plus, Upload, Download, BarChart3, 
  Check, AlertCircle, ChevronRight, Trash2, Settings
} from 'lucide-react';
import { 
  getParticipants, 
  getParticipantByCode, 
  getEntries, 
  createParticipant,
  deleteParticipant,
  upsertEntry,
  getSettings
} from './lib/supabase';

const App = () => {
  const [view, setView] = useState(() => localStorage.getItem('currentView') || 'login');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [participants, setParticipants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [adminTab, setAdminTab] = useState('dashboard');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('currentView', view);
  }, [view]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [participantsData, entriesData, settingsData] = await Promise.all([
        getParticipants().catch(() => []),
        getEntries().catch(() => []),
        getSettings().catch(() => ({
          studyStartDate: '2025-12-06',
          showProgressBar: true,
          companyName: 'Lab Capillaire'
        }))
      ]);
      
      setParticipants(participantsData || []);
      setEntries(entriesData || []);
      setSettings(settingsData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // LOGIN COMPONENT
  const LoginScreen = () => {
    const [code, setCode] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLogging, setIsLogging] = useState(false);

    const handleLogin = async () => {
      setIsLogging(true);
      setLoginError('');

      try {
        if (code === '9999') {
          setView('admin');
          return;
        }

        const participant = await getParticipantByCode(code);
        setCurrentUser(participant);
        setView('participant');
      } catch (error) {
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
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {loginError}
                </p>
              )}
            </div>

            <button
              onClick={handleLogin}
              disabled={isLogging || !code || code.length !== 4}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isLogging ? 'Connexion...' : 'Se connecter'}
            </button>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Administrateurs : code 9999</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // PARTICIPANT DASHBOARD
  const ParticipantDashboard = () => {
    const userEntries = entries.filter(e => e.participantCode === currentUser.code);
    const completedDays = userEntries.filter(e => e.status === 'complete').length;
    const today = new Date();
    const startDate = new Date(currentUser.startDate || settings?.studyStartDate || '2025-12-06');
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const getDayStatus = (day) => {
      const entry = userEntries.find(e => e.day === day);
      if (entry?.status === 'complete') return 'completed';
      if (day > daysSinceStart) return 'future';
      if (day === daysSinceStart) return 'current';
      return 'missed';
    };

    const getDayDate = (day) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day - 1);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const statusStyles = {
      completed: 'bg-green-100 border-green-400 text-green-800',
      current: 'bg-blue-100 border-blue-400 text-blue-800',
      missed: 'bg-orange-100 border-orange-400 text-orange-800',
      future: 'bg-gray-100 border-gray-300 text-gray-500'
    };

    const statusIcons = {
      completed: <Check className="w-6 h-6" />,
      current: <ChevronRight className="w-6 h-6" />,
      missed: <AlertCircle className="w-6 h-6" />,
      future: null
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bonjour, {currentUser.firstName}</h2>
              <p className="text-sm text-gray-600">Code: {currentUser.code}</p>
            </div>
            <button
              onClick={() => { setView('login'); setCurrentUser(null); }}
              className="text-gray-600 hover:text-gray-900"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Progression</h3>
              <span className="text-3xl font-bold text-blue-600">{completedDays}/28</span>
            </div>
            {settings?.showProgressBar && (
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all"
                  style={{ width: `${(completedDays / 28) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Calendrier 28 jours</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => {
                const status = getDayStatus(day);
                const isClickable = status !== 'future';
                
                return (
                  <button
                    key={day}
                    onClick={() => isClickable && setSelectedDay(day)}
                    disabled={!isClickable}
                    className={`p-4 rounded-lg border-2 transition ${statusStyles[status]} ${
                      isClickable ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {statusIcons[status]}
                      <div className="text-center">
                        <div className="font-bold">Jour {day}</div>
                        <div className="text-xs">{getDayDate(day)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span>Complété</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-400 rounded"></div>
                <span>Aujourd'hui</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                <span>Manqué</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span>À venir</span>
              </div>
            </div>
          </div>
        </div>

        {selectedDay && (
          <DailyQuestionnaire
            day={selectedDay}
            participant={currentUser}
            onClose={() => setSelectedDay(null)}
            existingEntry={userEntries.find(e => e.day === selectedDay)}
          />
        )}
      </div>
    );
  };

  // DAILY QUESTIONNAIRE
  const DailyQuestionnaire = ({ day, participant, onClose, existingEntry }) => {
    const [formData, setFormData] = useState(existingEntry || {
      hasOdor: null,
      odorIntensity: 5,
      odorCauses: [],
      otherCause: '',
      hasSymptoms: null,
      itching: 0,
      irritation: 0,
      redness: 0,
      dryness: 0,
      washedHair: null
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
      setIsSaving(true);
      try {
        const entry = {
          participantCode: participant.code,
          day,
          date: new Date().toISOString(),
          status: 'complete',
          ...formData
        };
        
        await upsertEntry(entry);
        await loadData();
        alert('✅ Questionnaire enregistré avec succès !');
        onClose();
      } catch (error) {
        alert('❌ Erreur lors de la sauvegarde');
      } finally {
        setIsSaving(false);
      }
    };

    const odorCausesOptions = [
      'Transpiration excessive',
      'Port de foulard/hijab',
      'Shampooing peu fréquent',
      'Excès de sébum',
      'Changements hormonaux',
      'Produit inapproprié'
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-2xl font-bold">Jour {day} - Questionnaire</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
            <div>
              <label className="block text-lg font-semibold mb-3">
                1. Avez-vous détecté une odeur désagréable aujourd'hui ?
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setFormData({ ...formData, hasOdor: true })}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                    formData.hasOdor === true ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'
                  }`}
                >
                  Oui
                </button>
                <button
                  onClick={() => setFormData({ ...formData, hasOdor: false })}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                    formData.hasOdor === false ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'
                  }`}
                >
                  Non
                </button>
              </div>
            </div>

            {formData.hasOdor === true && (
              <>
                <div>
                  <label className="block text-lg font-semibold mb-3">
                    2. Intensité de l'odeur : {formData.odorIntensity}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.odorIntensity}
                    onChange={(e) => setFormData({ ...formData, odorIntensity: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>Faible</span>
                    <span>Forte</span>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-3">
                    3. Causes possibles (choix multiples)
                  </label>
                  <div className="space-y-2">
                    {odorCausesOptions.map(cause => (
                      <label key={cause} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.odorCauses.includes(cause)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, odorCauses: [...formData.odorCauses, cause] });
                            } else {
                              setFormData({ ...formData, odorCauses: formData.odorCauses.filter(c => c !== cause) });
                            }
                          }}
                          className="w-5 h-5"
                        />
                        <span>{cause}</span>
                      </label>
                    ))}
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        checked={formData.odorCauses.includes('Autre')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, odorCauses: [...formData.odorCauses, 'Autre'] });
                          } else {
                            setFormData({ ...formData, odorCauses: formData.odorCauses.filter(c => c !== 'Autre'), otherCause: '' });
                          }
                        }}
                        className="w-5 h-5 mt-1"
                      />
                      <div className="flex-1">
                        <span className="block mb-2">Autre</span>
                        {formData.odorCauses.includes('Autre') && (
                          <input
                            type="text"
                            value={formData.otherCause}
                            onChange={(e) => setFormData({ ...formData, otherCause: e.target.value })}
                            placeholder="Précisez..."
                            className="w-full px-3 py-2 border rounded"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-3">
                    4. Symptômes associés ?
                  </label>
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setFormData({ ...formData, hasSymptoms: true })}
                      className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                        formData.hasSymptoms === true ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, hasSymptoms: false })}
                      className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                        formData.hasSymptoms === false ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      Non
                    </button>
                  </div>

                  {formData.hasSymptoms === true && (
                    <div className="space-y-4 pl-4 border-l-4 border-blue-200">
                      {[
                        { key: 'itching', label: 'Démangeaisons' },
                        { key: 'irritation', label: 'Irritation' },
                        { key: 'redness', label: 'Rougeurs' },
                        { key: 'dryness', label: 'Sécheresse/desquamation' }
                      ].map(symptom => (
                        <div key={symptom.key}>
                          <label className="block font-medium mb-2">
                            {symptom.label}: {formData[symptom.key]}/10
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={formData[symptom.key]}
                            onChange={(e) => setFormData({ ...formData, [symptom.key]: parseInt(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-lg font-semibold mb-3">
                5. Avez-vous lavé vos cheveux aujourd'hui ?
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setFormData({ ...formData, washedHair: true })}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                    formData.washedHair === true ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'
                  }`}
                >
                  Oui
                </button>
                <button
                  onClick={() => setFormData({ ...formData, washedHair: false })}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium ${
                    formData.washedHair === false ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'
                  }`}
                >
                  Non
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100"
              disabled={isSaving}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {isSaving ? 'Enregistrement...' : 'Soumettre'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ADMIN PANEL - Suite dans le prochain message (fichier trop long)

  // COPIEZ CETTE PARTIE DANS App.jsx APRÈS DailyQuestionnaire

  // ADMIN PANEL
  const AdminPanel = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [filterParticipant, setFilterParticipant] = useState('all');

    const stats = {
      totalParticipants: participants.length,
      activeParticipants: participants.filter(p => entries.some(e => e.participantCode === p.code)).length,
      totalEntries: entries.length,
      completionRate: participants.length > 0 
        ? Math.round((entries.filter(e => e.status === 'complete').length / (participants.length * 28)) * 100)
        : 0
    };

    // ADD PARTICIPANT MODAL
    const AddParticipantModal = () => {
      const [newP, setNewP] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        code: '',
        startDate: settings?.studyStartDate || '2025-12-06'
      });
      const [saving, setSaving] = useState(false);

      const handleAdd = async () => {
        if (newP.code.length !== 4) {
          alert('❌ Le code doit contenir 4 chiffres');
          return;
        }
        
        if (participants.some(p => p.code === newP.code)) {
          alert('❌ Ce code existe déjà');
          return;
        }
        
        setSaving(true);
        try {
          await createParticipant(newP);
          await loadData();
          alert('✅ Panéliste ajouté !');
          setShowAddModal(false);
        } catch (error) {
          alert('❌ Erreur: ' + error.message);
        } finally {
          setSaving(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-2xl font-bold">Nouveau Panéliste</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Prénom"
                value={newP.firstName}
                onChange={(e) => setNewP({ ...newP, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Nom"
                value={newP.lastName}
                onChange={(e) => setNewP({ ...newP, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                value={newP.email}
                onChange={(e) => setNewP({ ...newP, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={newP.phone}
                onChange={(e) => setNewP({ ...newP, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                maxLength="4"
                placeholder="Code (4 chiffres)"
                value={newP.code}
                onChange={(e) => setNewP({ ...newP, code: e.target.value.replace(/\D/g, '') })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="date"
                value={newP.startDate}
                onChange={(e) => setNewP({ ...newP, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      );
    };

    // CSV IMPORT MODAL
    const CSVImportModal = () => {
      const [csvText, setCsvText] = useState('');
      const [importResult, setImportResult] = useState(null);
      const [isImporting, setIsImporting] = useState(false);

      const downloadTemplate = () => {
        const template = 'prenom,nom,email,telephone,code,date_debut\nMarie,Dupont,marie@example.com,0612345678,1234,2025-12-06\nJean,Martin,jean@example.com,0623456789,5678,2025-12-06';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_participants.csv';
        a.click();
      };

      const handleImport = async () => {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
          alert('❌ Fichier CSV vide ou invalide');
          return;
        }

        setIsImporting(true);
        let created = 0, ignored = 0, errors = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          
          if (values.length < 5) {
            errors++;
            continue;
          }

          const participant = {
            firstName: values[0],
            lastName: values[1],
            email: values[2],
            phone: values[3],
            code: values[4],
            startDate: values[5] || settings?.studyStartDate || '2025-12-06'
          };

          if (participants.some(p => p.code === participant.code)) {
            ignored++;
            continue;
          }

          try {
            await createParticipant(participant);
            created++;
          } catch (error) {
            errors++;
          }
        }

        await loadData();
        setImportResult({ created, ignored, errors });
        setIsImporting(false);
      };

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-2xl font-bold">Import CSV Massif</h3>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger Template CSV
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Format: prenom, nom, email, telephone, code (4 chiffres), date_debut
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Collez votre CSV ici
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full h-48 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="prenom,nom,email,telephone,code,date_debut&#10;Marie,Dupont,marie@example.com,0612345678,1234,2025-12-06"
                />
              </div>

              {importResult && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-semibold mb-2">Résultat de l'import :</p>
                  <ul className="space-y-1 text-sm">
                    <li className="text-green-600">✅ {importResult.created} créés</li>
                    <li className="text-orange-600">⚠️ {importResult.ignored} ignorés (doublons)</li>
                    <li className="text-red-600">❌ {importResult.errors} erreurs</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportResult(null); }}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100"
                disabled={isImporting}
              >
                Fermer
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {isImporting ? 'Import...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      );
    };

    // EXPORT CSV
    const exportToCSV = () => {
      const filteredEntries = filterParticipant === 'all' 
        ? entries 
        : entries.filter(e => e.participantCode === filterParticipant);

      if (filteredEntries.length === 0) {
        alert('❌ Aucune donnée à exporter');
        return;
      }

      const headers = [
        'code_participant', 'prenom', 'nom', 'email', 'jour', 'date', 
        'odeur_presente', 'intensite_odeur', 'transpiration', 'foulard', 
        'shampooing_rare', 'sebum', 'hormones', 'produit_inapproprie', 
        'autre_cause', 'autre_cause_details', 'symptomes_presents', 
        'demangeaisons', 'irritation', 'rougeurs', 'secheresse', 'cheveux_laves'
      ];

      const rows = filteredEntries.map(entry => {
        const participant = participants.find(p => p.code === entry.participantCode);
        return [
          entry.participantCode,
          participant?.firstName || '',
          participant?.lastName || '',
          participant?.email || '',
          entry.day,
          new Date(entry.date).toLocaleDateString('fr-FR'),
          entry.hasOdor ? 'Oui' : 'Non',
          entry.hasOdor ? entry.odorIntensity : '',
          entry.odorCauses?.includes('Transpiration excessive') ? 'Oui' : 'Non',
          entry.odorCauses?.includes('Port de foulard/hijab') ? 'Oui' : 'Non',
          entry.odorCauses?.includes('Shampooing peu fréquent') ? 'Oui' : 'Non',
          entry.odorCauses?.includes('Excès de sébum') ? 'Oui' : 'Non',
          entry.odorCauses?.includes('Changements hormonaux') ? 'Oui' : 'Non',
          entry.odorCauses?.includes('Produit inapproprié') ? 'Oui' : 'Non',
          entry.odorCauses?.includes('Autre') ? 'Oui' : 'Non',
          entry.otherCause || '',
          entry.hasSymptoms ? 'Oui' : 'Non',
          entry.hasSymptoms ? entry.itching : '',
          entry.hasSymptoms ? entry.irritation : '',
          entry.hasSymptoms ? entry.redness : '',
          entry.hasSymptoms ? entry.dryness : '',
          entry.washedHair ? 'Oui' : 'Non'
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_etude_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };

    // ADMIN PANEL RENDER
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <button
              onClick={() => { setView('login'); setCurrentUser(null); }}
              className="text-gray-600 hover:text-gray-900"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {['dashboard', 'participants', 'data'].map(tab => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${
                  adminTab === tab ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab === 'dashboard' && <><BarChart3 className="w-4 h-4" />Dashboard</>}
                {tab === 'participants' && <><Users className="w-4 h-4" />Panélistes</>}
                {tab === 'data' && <><Download className="w-4 h-4" />Données</>}
              </button>
            ))}
          </div>

          {adminTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-gray-600 text-sm mb-1">Total Panélistes</div>
                  <div className="text-3xl font-bold text-blue-600">{stats.totalParticipants}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-gray-600 text-sm mb-1">Actifs</div>
                  <div className="text-3xl font-bold text-green-600">{stats.activeParticipants}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-gray-600 text-sm mb-1">Entrées Totales</div>
                  <div className="text-3xl font-bold text-purple-600">{stats.totalEntries}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-gray-600 text-sm mb-1">Taux Complétion</div>
                  <div className="text-3xl font-bold text-orange-600">{stats.completionRate}%</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-4">Aperçu</h3>
                <p className="text-gray-600 mb-4">
                  L'étude compte {participants.length} participants avec {entries.length} entrées enregistrées.
                </p>
                <div className="space-y-2 text-sm">
                  <p>• Utilisez <strong>Panélistes</strong> pour gérer les participants</p>
                  <p>• Utilisez <strong>Données</strong> pour exporter les résultats</p>
                </div>
              </div>
            </div>
          )}

          {adminTab === 'participants' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Gestion des Panélistes</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import CSV
                  </button>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau
                  </button>
                </div>
              </div>

              {participants.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Aucun panéliste. Cliquez sur "Nouveau" pour en ajouter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Téléphone</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Progression</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {participants.map(p => {
                        const userEntries = entries.filter(e => e.participantCode === p.code && e.status === 'complete');
                        const progress = Math.round((userEntries.length / 28) * 100);
                        
                        return (
                          <tr key={p.code} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono font-bold">{p.code}</td>
                            <td className="px-4 py-3">{p.firstName} {p.lastName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{p.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{p.phone}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-sm font-semibold">{userEntries.length}/28</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={async () => {
                                  if (confirm('Supprimer ce panéliste ?')) {
                                    try {
                                      await deleteParticipant(p.code);
                                      await loadData();
                                      alert('✅ Supprimé');
                                    } catch (error) {
                                      alert('❌ Erreur');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminTab === 'data' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Export des Données</h2>
                <div className="flex gap-3">
                  <select
                    value={filterParticipant}
                    onChange={(e) => setFilterParticipant(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">Tous les panélistes</option>
                    {participants.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.firstName} {p.lastName} ({p.code})
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-2">📊 <strong>{entries.length}</strong> entrées disponibles</p>
                {filterParticipant !== 'all' && (
                  <p>Filtré sur : {participants.find(p => p.code === filterParticipant)?.firstName}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {showAddModal && <AddParticipantModal />}
        {showImportModal && <CSVImportModal />}
      </div>
    );
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // MAIN RENDER
  if (view === 'login') return <LoginScreen />;
  if (view === 'participant') return <ParticipantDashboard />;
  if (view === 'admin') return <AdminPanel />;

  return <LoginScreen />;
};

export default App;
