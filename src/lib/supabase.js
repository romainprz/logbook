// src/lib/supabase.js - VERSION CORRIGÉE
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// === PARTICIPANTS ===
export const getParticipants = async () => {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching participants:', error)
    throw error
  }
  
  if (!data) return []
  
  return data.map(p => ({
    code: p.code,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    phone: p.phone,
    startDate: p.start_date
  }))
}

export const getParticipantByCode = async (code) => {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('code', code)
  
  if (error) {
    console.error('Error fetching participant:', error)
    throw error
  }
  
  // Vérifier si on a trouvé un participant
  if (!data || data.length === 0) {
    throw new Error('Participant not found')
  }
  
  const participant = data[0]
  return {
    code: participant.code,
    firstName: participant.first_name,
    lastName: participant.last_name,
    email: participant.email,
    phone: participant.phone,
    startDate: participant.start_date
  }
}

export const createParticipant = async (participant) => {
  const { data, error } = await supabase
    .from('participants')
    .insert([{
      code: participant.code,
      first_name: participant.firstName,
      last_name: participant.lastName,
      email: participant.email,
      phone: participant.phone,
      start_date: participant.startDate
    }])
    .select()
  
  if (error) {
    console.error('Error creating participant:', error)
    throw error
  }
  
  return data[0]
}

export const deleteParticipant = async (code) => {
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('code', code)
  
  if (error) {
    console.error('Error deleting participant:', error)
    throw error
  }
}

// === ENTRIES ===
export const getEntries = async (participantCode = null) => {
  // FIXED: Remove .range() to load ALL entries without pagination
  let query = supabase
    .from('entries')
    .select('*', { count: 'exact' }) // Add count to see total
    .order('entry_date', { ascending: false })
  
  if (participantCode) {
    query = query.eq('participant_code', participantCode)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    console.error('Error fetching entries:', error)
    throw error
  }
  
  console.log(`✅ Loaded ${data?.length || 0} entries from Supabase (total count: ${count})`)
  
  if (!data) return []
  
  return data.map(e => ({
    participantCode: e.participant_code,
    day: e.day,
    date: e.entry_date,
    status: e.status || 'complete', // Default to 'complete' if undefined
    hasOdor: e.has_odor,
    odorIntensity: e.odor_intensity,
    odorCauses: e.odor_causes || [],
    otherCause: e.other_cause,
    hasSymptoms: e.has_symptoms,
    itching: e.itching,
    irritation: e.irritation,
    redness: e.redness,
    dryness: e.dryness,
    washedHair: e.washed_hair
  }))
}


export const upsertEntry = async (entry) => {
  const { data, error } = await supabase
    .from('entries')
    .upsert({
      participant_code: entry.participantCode,
      day: entry.day,
      entry_date: entry.date,
      status: 'complete', // Always set to 'complete' when saving
      has_odor: entry.hasOdor,
      odor_intensity: entry.odorIntensity,
      odor_causes: entry.odorCauses,
      other_cause: entry.otherCause,
      has_symptoms: entry.hasSymptoms,
      itching: entry.itching,
      irritation: entry.irritation,
      redness: entry.redness,
      dryness: entry.dryness,
      washed_hair: entry.washedHair
    }, {
      onConflict: 'participant_code,day'
    })
    .select()
  
  if (error) {
    console.error('Error upserting entry:', error)
    throw error
  }
  
  return data[0]
}

// === SETTINGS ===
export const getSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
  
  if (error) {
    console.error('Error fetching settings:', error)
    throw error
  }
  
  if (!data || data.length === 0) {
    // Retourner des paramètres par défaut si la table est vide
    return {
      studyStartDate: '2025-12-06',
      allowRetroactive: true,
      autoComplete: true,
      companyName: 'Lab Capillaire',
      primaryColor: '#3b82f6',
      showProgressBar: true
    }
  }
  
  // Transformer en objet simple
  const settings = {}
  data.forEach(row => {
    Object.assign(settings, row.value)
  })
  
  return settings
}

export const updateSettings = async (key, value) => {
  const { data, error } = await supabase
    .from('settings')
    .update({ value })
    .eq('key', key)
    .select()
  
  if (error) {
    console.error('Error updating settings:', error)
    throw error
  }
  
  return data[0]
}
