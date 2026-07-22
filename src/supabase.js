import { createClient } from '@supabase/supabase-js'

// Werte kommen aus der .env-Datei (nicht im Code hartcodiert).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// EIN Client fuer die ganze App. Andere Dateien importieren einfach
// "supabase" von hier, statt jeweils einen eigenen Client zu erzeugen.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
