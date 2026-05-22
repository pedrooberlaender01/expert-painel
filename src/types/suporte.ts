export interface SuporteAgenteConfig {
  id: string
  nome_agente: string
  prompt_sistema: string
  mensagem_boas_vindas: string | null
  mensagem_nao_sabe: string
  delay_digitacao_min: number
  delay_digitacao_max: number
  debounce_segundos: number
  modelo_llm: string
  temperatura: number
  max_tokens: number
  contexto_max_mensagens: number
  similaridade_minima: number
  ativo: boolean
  expert_id: string
  created_at: string
  updated_at: string
}

export interface SuporteConhecimento {
  id: number
  tipo: 'pergunta_resposta' | 'documento'
  categoria: string
  pergunta: string | null
  content: string
  nome_arquivo: string | null
  metadata: Record<string, any>
  embedding: any | null
  expert_id: string
  created_at: string
}

export interface SuporteConversaLog {
  id: string
  telefone: string
  nome_contato: string | null
  direcao: 'recebida' | 'enviada'
  tipo: 'texto' | 'audio' | 'imagem'
  conteudo: string | null
  audio_url: string | null
  midia_url: string | null
  instancia: string | null
  messageid_whatsapp: string | null
  similaridade_rag: number | null
  conhecimento_usado_id: number | null
  respondido_por: 'agente' | 'nao_respondido'
  expert_id: string
  created_at: string
}

export interface SugestaoConhecimento {
  categoria: string
  pergunta: string
  resposta: string
}
