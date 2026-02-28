"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import confetti from 'canvas-confetti';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = "https://sottbysajayvystatavk.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdHRieXNhamF5dnlzdGF0YXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzIwNTcsImV4cCI6MjA4NzcwODA1N30.TjVoS43L16vvQSbnswidXNPkCMR9a_ulSuKs0clbqlg"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const EMOJIS = ["👏", "🤡", "💀", "💸", "🔥", "👀"];

// Função simples para calcular o tempo relativo (Ex: "há 2 min")
function formatarTempo(dataIso: string) {
  const diff = Math.floor((new Date().getTime() - new Date(dataIso).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return new Date(dataIso).toLocaleDateString();
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [empresa, setEmpresa] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nota, setNota] = useState(3);
  const [denuncias, setDenuncias] = useState<any[]>([]);
  
  const [idEmojiAberto, setIdEmojiAberto] = useState<number | null>(null);
  const [idRespostaAtiva, setIdRespostaAtiva] = useState<number | null>(null);
  const [respInput, setRespInput] = useState("");

  const [sugestoes, setSugestoes] = useState<any[]>([]);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) buscarDados();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) buscarDados();
    });
    return () => { if (subscription) subscription.unsubscribe(); };
  }, []);

  // --- AUTH SEM ERRO DE SENHA (CONFORME COMBINAMOS) ---
  async function handleLogin(e: any) {
    e.preventDefault();
    setLoading(true);
    const pass = password || "123456";
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) handleSignUp(e);
    else if (data?.session) setSession(data.session);
    setLoading(false);
  }

  async function handleSignUp(e: any) {
    if(e) e.preventDefault();
    setLoading(true);
    const pass = password || "123456";
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (!error) {
      const { data } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (data?.session) setSession(data.session);
    } else { alert(error.message); }
    setLoading(false);
  }

  // --- DADOS DO MURAL ---
  async function buscarDados() {
    const { data } = await supabase
      .from("denuncias")
      .select("*, reacoes(emoji), respostas(*)")
      .order("created_at", { ascending: false });
    if (data) setDenuncias(data);
  }

  // COLE AQUI EMBAIXO:
  async function buscarEmpresas(texto: string) {
  setEmpresa(texto); 

  if (texto.length > 1) {
    const { data, error } = await supabase
      .from("empresas")
      .select("nome")
      .ilike("nome", `%${texto}%`)
      .limit(5);

    if (error) {
      console.error("Erro ao buscar empresas:", error.message);
    } else {
      setSugestoes(data || []);
    }
  } else {
    setSugestoes([]);
  }
}

  async function enviarDenuncia() {
    if (!empresa || !descricao) return alert("Preencha tudo!");
    setLoading(true);

    try {
     const payload = {
      empresa: empresa,
      descricao: descricao,
      nota: nota,
      // ADICIONE ESTA LINHA ABAIXO:
      nivel: nota === 5 ? "⚠️ AJUDA PSICOLOGICA!" : "🚩 Perigo" 
    };

    if (session?.user?.id) {
      payload.user_id = session.user.id;
    }

    const { error } = await supabase
      .from("denuncias")
      .insert([payload]);

    if (error) {
      } else {
      // 1. Toca o som (Som de "pop/sucesso")
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
      audio.volume = 0.3;
      audio.play().catch(e => console.log("Som bloqueado pelo navegador"));

      // 2. Dispara os confetes laranjas da CiladaCorp
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#ffffff', '#000000']
      });

    // 3. Limpa os campos e atualiza o mural
      setEmpresa(""); 
      setDescricao(""); 
      setNota(3); 
      buscarDados();
    } // <-- Esta chave fecha o "else" do sucesso (onde tem o confete)
    
    setLoading(false); // Desativa o loading independente de dar erro ou não
   
   } catch (err) {
    console.error(err);
    alert("Erro crítico ao publicar");
    setLoading(false);
  }
} // <-- Esta chave fecha a função enviarDenuncia

  async function reagir(denunciaId: number, emoji: string) {
    await supabase.from("reacoes").insert([{ denuncia_id: denunciaId, emoji }]);
    setIdEmojiAberto(null); buscarDados();
  }

  async function enviarResposta(denunciaId: number) {
    if (!respInput) return;
    await supabase.from("respostas").insert([{ denuncia_id: denunciaId, conteudo: respInput }]);
    setRespInput(""); setIdRespostaAtiva(null); buscarDados();
  }

  // --- TELA DE LOGIN ---
  if (!session) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-[40px] shadow-2xl">
          <header className="mb-8 text-center uppercase italic">
            <h1 className="text-5xl font-black text-orange-600 tracking-tighter">CILADA<span className="text-white">CORP</span></h1>
            <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] mt-2">Área de Denúncia</p>
          </header>
          <div className="flex flex-col gap-4">
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black border border-zinc-800 rounded-2xl p-4 outline-none focus:border-orange-600"/>
            <button onClick={handleLogin} disabled={loading} className="bg-orange-600 text-black font-black py-4 rounded-2xl uppercase hover:bg-orange-500 transition-all">
              {loading ? "Carregando..." : "Entrar Direto"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- TELA DO MURAL ---
  return (
    <main className="min-h-screen bg-black text-white p-6 pb-20 font-sans" onClick={() => { setIdEmojiAberto(null); setIdRespostaAtiva(null); }}>
      <div className="max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-orange-600 italic">CILADA<span className="text-white">CORP</span></h1>
          <button onClick={() => supabase.auth.signOut()} className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-[10px] font-bold hover:text-red-500 uppercase transition-all">Sair</button>
        </header>

      {/* --- SEÇÃO DE POSTAR (SUBSTITUIR LINHA 171 A 190) --- */}
<section className="bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] mb-12 shadow-lg shadow-orange-900/10">
  <div className="flex flex-col gap-4">
    
    {/* NOVO INPUT COM AUTO-COMPLETE */}
    <div className="relative">
      <input 
        value={empresa} 
        onChange={(e) => buscarEmpresas(e.target.value)} 
        placeholder="Nome da empresa vacilona..." 
        className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-orange-500 font-bold outline-none focus:border-orange-600"
      />
      
      {/* LISTA DE SUGESTÕES */}
      {sugestoes.length > 0 && (
        <div className="absolute top-full left-0 w-full bg-zinc-800 border border-zinc-700 mt-2 rounded-2xl z-[999] overflow-hidden shadow-2xl">
          {sugestoes.map((s) => (
            <button 
              key={s.nome} 
              type="button"
              onClick={() => { 
                setEmpresa(s.nome); 
                setSugestoes([]); 
              }} 
              className="w-full text-left p-4 hover:bg-orange-600 hover:text-black font-bold text-xs border-b border-zinc-700 last:border-0 transition-colors"
            >
              🏢 {s.nome}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* SELETOR DE NÍVEL DE CILADA */}
    <div className="flex items-center justify-between px-2">
       <span className="text-[10px] font-bold text-zinc-500 uppercase">Nível da Cilada:</span>
       <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setNota(n)} className={`text-xl transition-all ${nota >= n ? "opacity-100 scale-110" : "opacity-20 grayscale"}`}>🚩</button>
        ))}
       </div>
    </div>

    <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que rolou nessa cilada?" className="bg-black border border-zinc-800 rounded-2xl p-4 h-24 outline-none focus:border-orange-600 resize-none text-sm"/>
    
    <button onClick={enviarDenuncia} disabled={loading} className="bg-orange-600 text-black font-black py-4 rounded-2xl uppercase hover:bg-orange-500 transition-all">
      {loading ? "Publicando..." : "Publicar no Anonimato"}
    </button>
  </div>
</section>

        {/* --- FEED COM NOVOS ELEMENTOS --- */}
        <div className="space-y-6">
          {denuncias.map((item) => (
            <div key={item.id} className="relative group">
              {/* REAÇÕES FLUTUANTES */}
              {idEmojiAberto === item.id && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full flex gap-3 z-50 shadow-2xl animate-bounce">
                  {EMOJIS.map((e) => <button key={e} onClick={() => reagir(item.id, e)} className="hover:scale-150 transition-all text-xl">{e}</button>)}
                </div>
              )}

              {/* CARD DA DENÚNCIA */}
              <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-[32px] hover:border-zinc-600 transition-all">
                
                {/* HEADER DO CARD (Badge + Tempo) */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${item.id}`} className="w-10 h-10 rounded-full bg-zinc-800 border border-orange-600/30"/>
                    <div>
                      {/* BADGE DA EMPRESA */}
                      <div className="flex items-center gap-2">
                        <span className="text-orange-500 font-black text-sm uppercase tracking-tight">{item.empresa}</span>
                        <span className="bg-orange-600/10 text-orange-600 text-[8px] font-bold px-2 py-0.5 rounded-full border border-orange-600/20">VERIFICADA</span>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-widest">{formatarTempo(item.created_at)}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setIdEmojiAberto(item.id); }} className="text-lg opacity-40 hover:opacity-100 transition-opacity">🎭</button>
                </div>

                {/* TEXTO DA CILADA */}
                <p className="text-zinc-300 text-[13px] leading-relaxed mb-4">"{item.descricao}"</p>
                
                {/* NÍVEL DA CILADA (VIsual) */}
                <div className="flex items-center gap-2 mb-6 bg-black/30 w-fit px-3 py-1.5 rounded-full border border-white/5">
                  <span className="text-[9px] font-black text-zinc-400 uppercase mr-1">Risco:</span>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-[10px] ${i < item.nota ? "opacity-100" : "opacity-10"}`}>🚩</span>
                  ))}
                </div>

                {/* BOTÃO "JÁ CAÍ NESSA TAMBÉM" + REAÇÕES */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-800/50">
                   <button 
                    onClick={() => reagir(item.id, "💀")}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-orange-600 hover:text-black px-4 py-2 rounded-full transition-all text-[10px] font-black uppercase"
                   >
                     💀 Já caí nessa também
                   </button>

                   {/* REAÇÕES ACUMULADAS */}
                   <div className="flex gap-2">
                    {EMOJIS.map(e => {
                      const count = item.reacoes?.filter((r: any) => r.emoji === e).length;
                      return count > 0 ? (
                        <span key={e} className="bg-white/5 border border-white/10 px-2 py-1 rounded-full text-[10px] font-bold text-orange-500">
                          {e} {count}
                        </span>
                      ) : null;
                    })}
                   </div>
                </div>

                {/* RESPOSTAS (Thread) */}
                {item.respostas?.length > 0 && (
                  <div className="mt-4 space-y-2 pl-4 border-l-2 border-orange-600/20">
                    {item.respostas.map((res: any) => (
                      <div key={res.id} className="text-[11px] text-zinc-400 bg-white/5 p-3 rounded-2xl flex items-start gap-2">
                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${res.id}`} className="w-4 h-4 rounded-full bg-zinc-800 mt-0.5"/>
                        <span>{res.conteudo}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CAMPO DE RESPOSTA RÁPIDA */}
                <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    value={item.id === idRespostaAtiva ? respInput : ""} 
                    onFocus={() => setIdRespostaAtiva(item.id)} 
                    onChange={(e) => setRespInput(e.target.value)} 
                    placeholder="Comentar anonimamente..." 
                    className="flex-1 bg-black border border-zinc-800 rounded-full px-5 py-2.5 text-[11px] outline-none focus:border-orange-600 transition-all"
                  />
                  <button onClick={() => enviarResposta(item.id)} className="bg-zinc-800 px-5 rounded-full text-[10px] font-bold hover:bg-orange-600 transition-all uppercase tracking-tighter">OK</button>
                </div>
              </div>

              {/* SEPARAÇÃO VISUAL (Linha entre posts) */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mt-6 opacity-50" />
            </div>
          ))}
        </div>

        <footer className="mt-16 text-center">
          <p className="text-zinc-700 text-[10px] uppercase tracking-[0.4em] italic">CiladaCorp © 2026 - Conexão Segura</p>
        </footer>
      </div>
    </main>
  );
}