// src/App.jsx - VERSION CORRIGÉE AVEC SUPABASE
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Download, Settings, Users, BarChart3, Mail, Check, AlertCircle, ChevronRight, X, Upload, Trash2 } from 'lucide-react';
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
  const [view, setView] = useState(() => {
    // Récupérer la vue depuis localStorage
    return localStorage.getItem('currentView') || 'login';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    // Récupérer l'utilisateur depuis localStorage
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [participants, setParticipants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, []);

  // Sauvegarder la vue actuelle
  useEffect(() => {
    localStorage.setItem('currentView', view);
  }, [view]);

  // Sauvegarder l'utilisateur actuel
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
        getParticipants(),
        getEntries(),
        getSettings()
      ]);
      
      setParticipants(participantsData);
      setEntries(entriesData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Login Component
  const LoginScreen = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
      setIsLoading(true);
      setError('');

      try {
        if (code === '9999') {
          setView('admin');
          setIsLoading(false);
          return;
        }

        const participant = await getParticipantByCode(code);
        setCurrentUser(participant);
        setView('participant');
      } catch (error) {
        console.error('Login error:', error);
        setError('Code invalide. Vérifiez votre code à 4 chiffres.');
      } finally {
        setIsLoading(false);
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
                disabled={isLoading}
              />
              {error && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p>Administrateurs : code 9999</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Participant Dashboard
  const ParticipantDashboard = () => {
    const userEntries = entries.filter(e => e.participantCode === currentUser.code);
    const completedDays = userEntries.filter(e => e.status === 'complete').length;
    const today = new Date();
    const startDate = new Date(currentUser.startDate || settings.studyStartDate);
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

    const handleSaveEntry = async (entry) => {
      try {
        await upsertEntry(entry);
        await loadData();
        alert('✅ Questionnaire enregistré avec succès !');
        setSelectedDay(null);
      } catch (error) {
        console.error('Error saving entry:', error);
        alert('❌ Erreur lors de la sauvegarde');
      }
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
            {settings.showProgressBar && (
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
            existingEntry={entries.find(e => e.participantCode === currentUser.code && e.day === selectedDay)}
            onSave={handleSaveEntry}
          />
        )}
      </div>
    );
  };

  // Suite dans le prochain fichier...
  // (DailyQuestionnaire, AdminPanel, etc.)

  // COPIEZ CETTE PARTIE DANS App.jsx APRÈS ParticipantDashboard

  // Daily Questionnaire Component
  const DailyQuestionnaire = ({ day, participant, onClose, existingEntry, onSave }) => {
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

    useEffect(() => {
      const timer = setInterval(() => {
        console.log('Auto-saving draft...');
      }, 30000);
      return () => clearInterval(timer);
    }, []);

    const handleSubmit = async () => {
      setIsSaving(true);
      const entry = {
        participantCode: participant.code,
        day,
        date: new Date().toISOString(),
        status: 'complete',
        ...formData
      };
      
      await onSave(entry);
      setIsSaving(false);
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
                    3. Causes possibles de l'odeur (choix multiples)
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

  // COPIEZ CETTE PARTIE DANS App.jsx APRÈS DailyQuestionnaire

  // Admin Panel Component
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

    // Add Participant Modal
    const AddParticipantModal = () => {
      const [newParticipant, setNewParticipant] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        code: '',
        startDate: settings?.studyStartDate || '2025-12-06'
      });
      const [isSaving, setIsSaving] = useState(false);

      const handleAdd = async () => {
        if (!newParticipant.code || newParticipant.code.length !== 4) {
          alert('❌ Le code doit contenir 4 chiffres');
          return;
        }

        if (participants.some(p => p.code === newParticipant.code)) {
          alert('❌ Ce code existe déjà');
          return;
        }

        setIsSaving(true);
        try {
          await createParticipant(newParticipant);
          await loadData();
          alert('✅ Panéliste ajouté avec succès !');
          setShowAddModal(false);
        } catch (error) {
          console.error('Error adding participant:', error);
          alert('❌ Erreur lors de l\'ajout');
        } finally {
          setIsSaving(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-2xl font-bold">Nouveau Panéliste</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Prénom"
                value={newParticipant.firstName}
                onChange={(e) => setNewParticipant({ ...newParticipant, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Nom"
                value={newParticipant.lastName}
                onChange={(e) => setNewParticipant({ ...newParticipant, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={newParticipant.phone}
                onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                maxLength="4"
                placeholder="Code à 4 chiffres"
                value={newParticipant.code}
                onChange={(e) => setNewParticipant({ ...newParticipant, code: e.target.value.replace(/\D/g, '') })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="date"
                value={newParticipant.startDate}
                onChange={(e) => setNewParticipant({ ...newParticipant, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-100"
                disabled={isSaving}
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={isSaving}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {isSaving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      );
    };

    // CSV Import Modal (version simplifiée)
    const CSVImportModal = () => {
      const [csvText, setCsvText] = useState('');
      const [importResult, setImportResult] = useState(null);
      const [isImporting, setIsImporting] = useState(false);

      const downloadTemplate = () => {
        const template = 'prenom,nom,email,telephone,code,date_debut\nMarie,Dupont,marie@example.com,0612345678,1234,2025-12-06';
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
          
          if (values.length < 6) {
            errors++;
            continue;
          }

          const participant = {
            firstName: values[0],
            lastName: values[1],
            email: values[2],
            phone: values[3],
            code: values[4],
            startDate: values[5] || settings.studyStartDate
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
              <button onClick={() => { setShowImportModal(false); setImportResult(null); }} className="text-gray-500 hover:text-gray-700">
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
                {isImporting ? 'Import en cours...' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      );
    };

    // Export CSV Function
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
          entry.odorCauses.includes('Transpiration excessive') ? 'Oui' : 'Non',
          entry.odorCauses.includes('Port de foulard/hijab') ? 'Oui' : 'Non',
          entry.odorCauses.includes('Shampooing peu fréquent') ? 'Oui' : 'Non',
          entry.odorCauses.includes('Excès de sébum') ? 'Oui' : 'Non',
          entry.odorCauses.includes('Changements hormonaux') ? 'Oui' : 'Non',
          entry.odorCauses.includes('Produit inapproprié') ? 'Oui' : 'Non',
          entry.odorCauses.includes('Autre') ? 'Oui' : 'Non',
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

    // RENDER DU ADMIN PANEL DANS LE FICHIER FINAL
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

  return null;
};

export default App;
