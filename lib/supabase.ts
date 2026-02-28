import { createClient } from '@supabase/supabase-js'

// Essas variáveis buscam os valores que você salvou no .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Aqui criamos o "cliente" que o seu site vai usar para falar com o banco
export const supabase = createClient(supabaseUrl, supabaseKey)