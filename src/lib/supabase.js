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
  
  if (error) throw error
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
    .single()
  
  if (error) throw error
  return {
    code: data.code,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    startDate: data.start_date
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
    .single()
  
  if (error) throw error
  return data
}

export const deleteParticipant = async (code) => {
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('code', code)
  
  if (error) throw error
}

// === ENTRIES ===
export const getEntries = async (participantCode = null) => {
  let query = supabase
    .from('entries')
    .select('*')
    .order('day', { ascending: true })
  
  if (participantCode) {
    query = query.eq('participant_code', participantCode)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data.map(e => ({
    participantCode: e.participant_code,
    day: e.day,
    date: e.entry_date,
    status: e.status,
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
      status: entry.status,
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
    .single()
  
  if (error) throw error
  return data
}

// === SETTINGS ===
export const getSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
  
  if (error) throw error
  
  const settings = {}
  data.forEach(row => {
    Object.assign(settings, row.value)
  })
  
  return settings
}
