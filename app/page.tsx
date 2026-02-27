"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = "https://sottbysajayvystatavk.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdHRieXNhamF5dnlzdGF0YXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzIwNTcsImV4cCI6MjA4NzcwODA1N30.TjVoS43L16vvQSbnswidXNPkCMR9a_ulSuKs0clbqlg"; 
const supabase = createClient(supabaseUrl, supabaseKey);

const EMOJIS = ["👏", "🤡", "💀", "💸", "🔥", "👀"];

export default function Home() {
  


  // --- ESTADOS ---
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [empresa, setEmpresa] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nota, setNota] = useState(3);
  const [denuncias, setDenuncias] = useState<any[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  
  const [idEmojiAberto, setIdEmojiAberto] = useState<number | null>(null);
  const [idRespostaAtiva, setIdRespostaAtiva] = useState<number | null>(null);
  const [respInput, setRespInput] = useState("");

  // --- EFEITO DE INICIALIZAÇÃO (CORRIGIDO) ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) buscarDados();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) buscarDados();
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // --- FUNÇÕES DE AUTH ---
  async function handleLogin(e: any) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Erro: " + error.message);
    if (data?.session) setSession(data.session);
    setLoading(false);
  }

  async function handleSignUp(e: any) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
    } else {
      alert("Conta criada! Entrando...");
      const { data } = await supabase.auth.signInWithPassword({ email, password });
      if (data?.session) setSession(data.session);
    }
    setLoading(false);
  }

  // --- FUNÇÕES DO MURAL ---
  async function buscarDados() {
    const { data } = await supabase
      .from("denuncias")
      .select("*, reacoes(emoji), respostas(*)")
      .order("created_at", { ascending: false });
    if (data) setDenuncias(data);
  }

  async function buscarEmpresas(texto: string) {
    setEmpresa(texto);
    if (texto.length > 1) {
      const { data } = await supabase
        .from("empresas")
        .select("nome")
        .ilike("nome", `%${texto}%`)
        .limit(5);
      setSugestoes(data || []);
    } else {
      setSugestoes([]);
    }
  }

  async function enviarDenuncia() {
    if (!empresa || !descricao) return alert("Preencha tudo!");
    setLoading(true);
    const { error } = await supabase.from("denuncias").insert([{
      empresa,
      descricao,
      nota,
      nivel: nota === 5 ? "⚠️ AJUDA PSICOLOGICA!" : "🚩 Perigo",
      user_id: session?.user?.id
    }]);
    if (!error) {
      setEmpresa(""); setDescricao(""); setNota(3); buscarDados();
    }
    setLoading(false);
  }

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
            <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-black border border-zinc-800 rounded-2xl p-4 outline-none focus:border-orange-600"/>
            <button onClick={handleLogin} disabled={loading} className="bg-orange-600 text-black font-black py-4 rounded-2xl uppercase hover:bg-orange-500 transition-all">
              {loading ? "Carregando..." : "Entrar"}
            </button>
            <button onClick={handleSignUp} className="text-zinc-500 text-[10px] uppercase font-bold text-center mt-2 hover:text-white transition-colors">Criar Conta Anônima</button>
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

        {/* POSTAR */}
        <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] mb-12">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <input value={empresa} onChange={(e) => buscarEmpresas(e.target.value)} placeholder="Empresa..." className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-orange-500 font-bold outline-none focus:border-orange-600"/>
              {sugestoes.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-zinc-800 border border-zinc-700 mt-2 rounded-2xl z-50 overflow-hidden">
                  {sugestoes.map(s => (
                    <button key={s.nome} onClick={() => { setEmpresa(s.nome); setSugestoes([]); }} className="w-full text-left p-4 hover:bg-orange-600 hover:text-black font-bold text-xs border-b border-zinc-700 last:border-0">🏢 {s.nome}</button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-center gap-3 bg-black/40 py-4 rounded-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setNota(n)} className={`text-2xl transition-all ${nota >= n ? "opacity-100" : "opacity-20 grayscale"}`}>🚩</button>
              ))}
            </div>

            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que rolou nessa cilada?" className="bg-black border border-zinc-800 rounded-2xl p-4 h-24 outline-none focus:border-orange-600 resize-none"/>
            <button onClick={enviarDenuncia} disabled={loading} className="bg-orange-600 text-black font-black py-4 rounded-2xl uppercase hover:bg-orange-500 transition-all">
              {loading ? "Publicando..." : "Publicar no Anonimato"}
            </button>
          </div>
        </section>

        {/* FEED */}
        <div className="space-y-8">
          {denuncias.map((item) => (
            <div key={item.id} className="relative">
              {idEmojiAberto === item.id && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full flex gap-3 z-50 shadow-xl">
                  {EMOJIS.map((e) => <button key={e} onClick={() => reagir(item.id, e)} className="hover:scale-150 transition-all text-xl">{e}</button>)}
                </div>
              )}
              <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[30px]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${item.id}`} className="w-8 h-8 rounded-full bg-zinc-800"/>
                    <span className="text-orange-500 font-black text-sm uppercase">{item.empresa}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setIdEmojiAberto(item.id); }} className="text-lg opacity-40 hover:opacity-100">🎭</button>
                </div>
                <p className="text-zinc-300 text-sm italic mb-4">"{item.descricao}"</p>
                <div className="flex gap-0.5 mb-4">{[...Array(item.nota || 3)].map((_, i) => <span key={i} className="text-[10px]">🚩</span>)}</div>
                
                {/* REAÇÕES ACUMULADAS */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {EMOJIS.map(e => {
                    const count = item.reacoes?.filter((r: any) => r.emoji === e).length;
                    return count > 0 ? (
                      <span key={e} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-orange-500">{e} {count}</span>
                    ) : null;
                  })}
                </div>

                {/* RESPOSTAS */}
                {item.respostas?.map((res: any) => (
                  <div key={res.id} className="text-[11px] text-zinc-400 bg-white/5 p-2 rounded-xl flex items-center gap-2 mb-2">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${res.id}`} className="w-5 h-5 rounded-full bg-zinc-800"/>
                    <span><span className="text-orange-600 font-bold mr-1">↳</span>{res.conteudo}</span>
                  </div>
                ))}

                <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    value={item.id === idRespostaAtiva ? respInput : ""} 
                    onFocus={() => setIdRespostaAtiva(item.id)} 
                    onChange={(e) => setRespInput(e.target.value)} 
                    placeholder="Responder..." 
                    className="flex-1 bg-black border border-zinc-800 rounded-full px-4 py-2 text-[11px] outline-none focus:border-orange-600"
                  />
                  <button onClick={() => enviarResposta(item.id)} className="bg-zinc-800 px-4 rounded-full text-[10px] font-bold hover:bg-orange-600 transition-all">OK</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-zinc-600 text-[10px] uppercase tracking-widest italic">Logado como: {session.user.email}</p>
      </div>
    </main>
  );
}