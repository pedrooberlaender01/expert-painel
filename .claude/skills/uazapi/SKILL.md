---
name: uazapi-integration
description: Integracao com UAZAPI para WhatsApp. Usar sempre que o codigo envolver WhatsApp, mensagens, instancias, webhooks, grupos ou qualquer comunicacao via WhatsApp. NUNCA usar Evolution API.
---

# UAZAPI (uazapiGO) - WhatsApp API v2.0.1

Base URL: configuravel por tenant/instancia
Autenticacao: Token no header (gerado ao criar instancia)
Content-Type: application/json
Spec OpenAPI: https://docs.uazapi.com/openapi-bundled.json

## Campos Comuns (compartilhados entre endpoints de envio)

Todos os endpoints POST /send/* suportam estes campos opcionais:
- `delay` (integer) - ms de atraso, mostra "Digitando..." ou "Gravando audio..."
- `readchat` (boolean) - marca conversa como lida apos envio
- `readmessages` (boolean) - marca ultimas msgs recebidas como lidas
- `replyid` (string) - ID da mensagem pra responder
- `mentions` (string) - numeros separados por virgula
- `forward` (boolean) - marca como encaminhada
- `track_source` (string) - origem do rastreamento
- `track_id` (string) - ID de rastreamento (aceita duplicados)
- `async` (boolean) - envia via fila interna assincrona (alto volume)

O campo `number` aceita: numero internacional, ID de grupo (@g.us), ID de usuario (@s.whatsapp.net ou @lid).

### Placeholders disponiveis em textos:
- `{{name}}`, `{{first_name}}`, `{{wa_name}}`
- `{{lead_name}}`, `{{lead_fullName}}`, `{{lead_email}}`, `{{lead_personalid}}`, `{{lead_status}}`, `{{lead_notes}}`
- `{{lead_field01}}` ate `{{lead_field20}}`

---

## ADMINISTRACAO

### POST /instance/create — Criar Instancia
Body: name (string, REQUIRED), systemName (string), adminField01 (string), adminField02 (string)
- Criada como "disconnected", gera token unico
- Requer admintoken (nao token de instancia)

### GET /instance/all — Listar todas as instancias
- Retorna: ID, nome, status, data criacao, ultima desconexao/motivo, info perfil
- Requer admintoken

### POST /instance/updateAdminFields — Atualizar campos administrativos
Body: id (string, REQUIRED), adminField01 (string), adminField02 (string)
- Metadados personalizados para integracoes

### GET /globalwebhook — Ver Webhook Global
- Retorna configuracao atual do webhook global

### POST /globalwebhook — Configurar Webhook Global
Body: url (string, REQUIRED), events (array, REQUIRED), excludeMessages (array), addUrlEvents (boolean), addUrlTypesMessages (boolean)
- Eventos: connection, history, messages, messages_update, call, contacts, presence, groups, labels, chats, chat_labels, blocks, leads, sender
- Filtros excludeMessages: wasSentByApi, wasNotSentByApi, fromMeYes, fromMeNo, isGroupYes, isGroupNo
- addUrlEvents=true adiciona /{evento} na URL
- addUrlTypesMessages=true adiciona /{tipo_mensagem} na URL

### GET /globalwebhook/errors — Ver ultimos erros do webhook global
- Retorna em memoria os ultimos 20 erros de entrega

### POST /admin/restart — Reiniciar a aplicacao
- Forca reconexao de todas as instancias

---

## INSTANCIA

### POST /instance/connect — Conectar instancia ao WhatsApp
Body: phone (string, opcional)
- Com phone: gera codigo de pareamento (timeout 5 min)
- Sem phone: gera QR code (timeout 2 min)
- Sincronizacao: msgs dos ultimos 7 dias armazenadas

### POST /instance/disconnect — Desconectar instancia
- Encerra conexao ativa, requer novo QR pra reconectar

### POST /instance/reset — Reiniciar runtime da instancia
- Reset controlado quando sessao ficou presa ou envio nao progride
- Nao apaga registro da instancia

### GET /instance/status — Verificar status
- Retorna: estado conexao, QR code, codigo pareamento, info ultima desconexao

### POST /instance/updateInstanceName — Atualizar nome
Body: name (string, REQUIRED)

### DELETE /instance — Deletar instancia

### GET /instance/privacy — Buscar configuracoes de privacidade
- Retorna: quem pode adicionar aos grupos, ver visto por ultimo, ver status, ver foto, confirmacao leitura, ver online, fazer chamadas

### POST /instance/privacy — Alterar configuracoes de privacidade
Body (todos opcionais):
- groupadd (string) - all, contacts, contact_blacklist, none
- last (string) - all, contacts, contact_blacklist, none
- status (string) - all, contacts, contact_blacklist, none
- profile (string) - all, contacts, contact_blacklist, none
- readreceipts (string) - all, none
- online (string) - all, match_last_seen
- calladd (string) - all, known

### POST /instance/presence — Atualizar status de presenca
Body: presence (string, REQUIRED — available ou unavailable)
- ATENCAO: com "unavailable", ticks de entrega/leitura nao sao recebidos se API for unico dispositivo ativo

### POST /instance/updateDelaySettings — Delay na fila de mensagens
Body: msg_delay_min (integer, REQUIRED), msg_delay_max (integer, REQUIRED)
- Apenas para msgs diretas (async=true), nao afeta campanhas
- 0 = sem delay. Se max < min, ajustado automaticamente

---

## PROXY

### GET /instance/proxy — Obter configuracao de proxy
- UAZAPI usa proxy interno padrao (IPs brasileiros)

### POST /instance/proxy — Configurar ou alterar proxy
Body: enable (boolean, REQUIRED), proxy_url (string — obrigatorio se enable=true)
- URL validada antes de salvar, conexao pode reiniciar

### DELETE /instance/proxy — Remover proxy configurado
- Volta ao proxy interno padrao

---

## PERFIL

### POST /profile/name — Alterar nome do perfil do WhatsApp
Body: name (string, REQUIRED)

### POST /profile/image — Alterar imagem do perfil
Body: image (string, REQUIRED — URL http/https, base64, ou "remove"/"delete")
- Formato: JPEG, 640x640 pixels

---

## BUSINESS (EXPERIMENTAL)

### POST /business/get/profile — Obter perfil comercial
Body: jid (string — ex: "5511999999999@s.whatsapp.net")

### GET /business/get/categories — Obter categorias de negocios

### POST /business/update/profile — Atualizar perfil comercial
Body (todos opcionais): description (string), address (string), email (string)

### POST /business/catalog/list — Listar produtos do catalogo
Body: jid (string, REQUIRED)

### POST /business/catalog/info — Obter info de um produto
Body: jid (string, REQUIRED), id (string, REQUIRED)

### POST /business/catalog/delete — Deletar produto
Body: id (string, REQUIRED)

### POST /business/catalog/show — Mostrar produto
Body: id (string, REQUIRED)

### POST /business/catalog/hide — Ocultar produto
Body: id (string, REQUIRED)

---

## CHAMADAS

### POST /call/make — Iniciar chamada de voz
Body: number (string, REQUIRED)
- Apenas inicia, nao estabelece comunicacao real

### POST /call/reject — Rejeitar chamada recebida
Body: number (string, opcional), id (string, opcional)
- Pode enviar body vazio {}

---

## WEBHOOKS E SSE

### GET /webhook — Ver Webhook da Instancia
- Retorna array com: id, enabled, url, events, excludeMessages, addUrlEvents, addUrlTypesMessages

### POST /webhook — Configurar Webhook da Instancia
Modo Simples: nao incluir action nem id (gerencia 1 webhook automaticamente)
Modo Avancado: usar action + id pra multiplos webhooks
Body: url (string, REQUIRED), events (array), excludeMessages (array), addUrlEvents (boolean), addUrlTypesMessages (boolean), enabled (boolean), id (string), action (string — add, update, delete)
- Mesmos eventos e filtros do globalwebhook

### GET /webhook/errors — Ver ultimos erros do webhook local
- Retorna em memoria os ultimos 20 erros de envio dos webhooks locais

### GET /sse — Server-Sent Events
Query Params: token (string, REQUIRED), events (string, REQUIRED — separados por virgula), excludeMessages (string)
- Conexao persistente HTTP pra eventos em tempo real
- Uso: new EventSource('/sse?token=TOKEN&events=chats,messages')

---

## ENVIAR MENSAGEM

### POST /send/text — Enviar mensagem de texto
Body: number (string, REQUIRED), text (string, REQUIRED — aceita placeholders)
Opcionais especificos:
- linkPreview (boolean) - preview automatico do primeiro link
- linkPreviewTitle (string), linkPreviewDescription (string), linkPreviewImage (string — URL ou base64), linkPreviewLarge (boolean)
+ campos comuns

### POST /send/media — Enviar midia
Body: number (string, REQUIRED), type (string, REQUIRED), file (string, REQUIRED — URL ou base64)
Tipos: image (JPG), video (MP4), document (PDF/DOCX/XLSX), audio (MP3/OGG), myaudio (msg voz alternativa), ptt (Push-to-Talk), ptv (Push-to-Video), sticker (figurinha)
Opcionais especificos:
- text (string — caption/legenda)
- docName (string — nome arquivo, apenas documents)
- thumbnail (string — URL ou base64, videos/documents)
- mimetype (string — detectado automaticamente)
+ campos comuns

### POST /send/contact — Enviar cartao de contato (vCard)
Body: number (string, REQUIRED), fullName (string, REQUIRED), phoneNumber (string, REQUIRED — multiplos separados por virgula)
Opcionais: organization (string), email (string), url (string)
+ campos comuns

### POST /send/location — Enviar localizacao geografica
Body: number (string, REQUIRED), latitude (number, REQUIRED — -90 a 90), longitude (number, REQUIRED — -180 a 180)
Opcionais: name (string), address (string)
+ campos comuns

### POST /send/location-button — Solicitar localizacao do usuario
Body: number (string, REQUIRED), text (string, REQUIRED)
- Envia botao que abre interface de compartilhar localizacao
+ campos comuns

### POST /send/status — Enviar Stories (Status)
Body: type (string, REQUIRED — text, image, video, audio, myaudio, ptt)
Opcionais:
- text (string — max 656 chars para type=text)
- background_color (integer — 1-3 amarelo, 4-6 verde, 7-9 azul, 10-12 lilas, 13 magenta, 14-15 rosa, 16 marrom, 17-19 cinza)
- font (integer — 0 padrao, 1-8 alternativos, apenas type=text)
- file (string — URL ou base64)
- thumbnail (string), mimetype (string)
+ campos comuns

### POST /send/menu — Enviar menu interativo
Body: number (string, REQUIRED), type (string, REQUIRED — button, list, poll, carousel), text (string, REQUIRED), choices (array, REQUIRED)
Opcionais: footerText (string), listButton (string), selectableCount (integer), imageButton (string — URL, apenas type=button)
+ campos comuns

**type "button"** — Formatos (separador | ou \n):
- Resposta: "texto|id" ou "texto"
- Copia: "texto|copy:codigo"
- Chamada: "texto|call:+5511999999999"
- URL: "texto|url:https://exemplo.com"
- Limitacao: combinar resposta com call/url/copy mostra aviso no WhatsApp Web

**type "list"** — listButton obrigatorio, choices com secoes:
- "[Titulo da Secao]" inicia secao
- "texto|id|descricao" item

**type "poll"** — selectableCount (padrao 1), choices array simples de strings

**type "carousel"** — choices com ordem: "[Titulo]", "{URL imagem}", botoes
- Endpoint alternativo: /send/carousel

### POST /send/carousel — Enviar carrossel de midia com botoes
Body: number (string, REQUIRED), text (string, REQUIRED), carousel (array, REQUIRED — array de cartoes)
- Formato alternativo ao /send/menu com type=carousel
+ campos comuns

### POST /send/pix-button — Enviar botao PIX
Body: number (string, REQUIRED), pixType (string, REQUIRED — CPF, CNPJ, PHONE, EMAIL, EVP), pixKey (string, REQUIRED)
Opcionais: pixName (string — padrao "Pix")
+ campos comuns

### POST /send/request-payment — Solicitar pagamento
Body: number (string, REQUIRED), amount (number, REQUIRED — valor em BRL)
Opcionais:
- title (string), text (string), footer (string)
- itemName (string), invoiceNumber (string)
- pixKey (string), pixType (string — CPF, CNPJ, PHONE, EMAIL, EVP), pixName (string)
- paymentLink (string — URL checkout, apenas dominios homologados)
- fileUrl (string — boleto PDF), fileName (string)
- boletoCode (string — linha digitavel)
+ campos comuns

### POST /message/presence — Enviar atualizacao de presenca
Body: number (string, REQUIRED), presence (string, REQUIRED — composing, recording, paused)
Opcional: delay (integer — ms, max 300000/5min, padrao 5min)
- Assincrono, reenvia a cada 10s, cancelado ao enviar msg pro mesmo chat

---

## MENSAGEM ASYNC

### GET /message/async — Consultar fila async de envio direto
- Resumo da fila de envio async=true
- NAO inclui campanhas do sender nem envios em massa

### DELETE /message/async — Limpar fila async de envio direto
- Cancela toda a fila async e marca pendentes como "Canceled"
- NAO afeta campanhas do sender

---

## ACOES NA MENSAGEM E BUSCAR

### POST /message/delete — Apagar Mensagem Para Todos
Body: id (string, REQUIRED)
- Funciona em conversas individuais ou grupos

### POST /message/edit — Editar mensagem enviada
Body: id (string, REQUIRED — formato owner:messageid ou apenas messageid), text (string, REQUIRED)
- Edita conteudo via funcionalidade nativa do WhatsApp
- Gera novo ID para a mensagem editada

### POST /message/download — Baixar arquivo de uma mensagem
Body: id (string, REQUIRED)
Opcionais:
- return_base64 (boolean, default false) - retorna conteudo em base64
- generate_mp3 (boolean, default true) - para audios: true=MP3, false=OGG
- return_link (boolean, default true) - salva e retorna URL publica
- transcribe (boolean, default false) - transcreve audios para texto
- openai_apikey (string) - chave OpenAI para transcricao
- download_quoted (boolean, default false) - baixa midia da mensagem citada

### POST /message/find — Buscar mensagens em um chat
Body (todos opcionais):
- id (string) - ID especifico para busca exata
- chatid (string) - ID do chat (formato internacional)
- track_source (string) - filtrar por origem de rastreamento
- track_id (string) - filtrar por ID de rastreamento
- limit (integer, default 100) - maximo de mensagens
- offset (integer, default 0) - deslocamento para paginacao

### POST /message/history-sync — Solicitar historico sob demanda
Body: number (string), messageid (string, opcional — referencia para msgs mais antigas), count (integer, opcional — max 100)
- Solicita sync de mensagens antigas ao WhatsApp

### POST /message/markread — Marcar mensagens como lidas
Body: id (array de strings, REQUIRED)
- Marca multiplas mensagens como lidas de uma vez

### POST /message/react — Enviar reacao a uma mensagem
Body: number (string, REQUIRED), id (string, REQUIRED), text (string, REQUIRED — emoji Unicode, vazio para remover)

---

## CHATS

### POST /chat/find — Buscar chats com filtros
Body (todos opcionais):
- operator (string, default "AND") - operador logico entre filtros
- sort (string) - campo para ordenacao (+/-campo, ex: -wa_lastMsgTimestamp)
- limit (integer, default 20), offset (integer, default 0)
- Filtros: wa_fastid, wa_chatid, wa_archived, wa_contactName, wa_name, name, wa_isBlocked, wa_isGroup, wa_isGroup_admin, wa_isGroup_announce, wa_isGroup_member, wa_isPinned, wa_label, wa_notes, lead_tags, lead_isTicketOpen, lead_assignedAttendant_id, lead_status
- Operadores de filtro: `~` (LIKE), `!~` (NOT LIKE), `!=`, `>`, `<`, `>=`, `<=`

### POST /chat/archive — Arquivar/desarquivar chat
Body: number (string, REQUIRED), archive (boolean, REQUIRED)

### POST /chat/read — Marcar chat como lido/nao lido
Body: number (string, REQUIRED), read (boolean, REQUIRED)

### POST /chat/mute — Silenciar chat
Body: number (string, REQUIRED), muteEndTime (integer, REQUIRED — 0=remove, 8=8h, 168=1semana, -1=sempre)

### POST /chat/pin — Fixar/desafixar chat
Body: number (string, REQUIRED), pin (boolean, REQUIRED)

### POST /chat/delete — Deletar chat
Body: number (string, REQUIRED)
Opcionais:
- deleteChatDB (boolean, default false) - deleta do banco
- deleteMessagesDB (boolean, default false) - deleta mensagens do banco
- deleteChatWhatsApp (boolean, default false) - deleta do WhatsApp
- clearChatWhatsApp (boolean, default false) - limpa conversa no WhatsApp

### POST /chat/notes — Consultar notas internas do chat
Body: number (string)

### POST /chat/notes/refresh — Recarregar notas internas
Body: number (string), force (boolean, default false)

### POST /chat/notes/edit — Editar notas internas do chat
Body: number (string), notes (string — vazio para limpar)

---

## CONTATOS

### GET /contacts — Retorna lista de contatos do WhatsApp
- Lista contatos salvos na agenda que estao no WhatsApp

### POST /contacts/list — Listar contatos com paginacao
Body: limit (integer, default 100, max 1000), offset (integer, default 0)

### POST /contact/add — Adicionar contato a agenda
Body: number (string, REQUIRED — formato internacional), name (string, REQUIRED)

### POST /contact/remove — Remover contato da agenda
Body: number (string, REQUIRED)

### POST /chat/details — Obter detalhes completos
Body: number (string, REQUIRED), preview (boolean, default false — tamanho da foto de perfil)
- Retorna todos os campos do modelo Chat incluindo foto, status, nome

### POST /chat/check — Verificar numeros no WhatsApp
Body: numbers (array de strings)
- Verifica multiplos numeros simultaneamente

---

## BLOQUEIOS

### POST /chat/block — Bloquear/desbloquear contato
Body: number (string, REQUIRED), block (boolean, REQUIRED)

### GET /chat/blocklist — Listar contatos bloqueados

---

## ETIQUETAS

### GET /labels — Buscar todas as etiquetas
- Retorna lista completa de etiquetas da instancia

### POST /label/edit — Criar, editar ou deletar etiqueta
Body: labelid (string, REQUIRED — ID real para editar/deletar, "new" para criar)
Opcionais: name (string), color (integer, 0-19), delete (boolean)

### POST /chat/labels — Gerenciar labels de um chat
Body: number (string, REQUIRED)
Opcionais (3 modos de operacao):
- labelids (array de strings) - define todas as labels do chat
- add_labelid (string) - adiciona uma label
- remove_labelid (string) - remove uma label

### POST /labels/refresh — Recarregar etiquetas do WhatsApp
Body: force (boolean, default false)

---

## GRUPOS E COMUNIDADES

### POST /group/create — Criar novo grupo
Body: name (string, REQUIRED, max 100 chars), participants (array de strings, REQUIRED)
- Minimo 1 participante alem do criador

### POST /group/info — Obter informacoes do grupo
Body: groupjid (string, REQUIRED), getInviteLink (boolean), getRequestsParticipants (boolean), force (boolean)

### POST /group/inviteInfo — Obter info pelo codigo de convite
Body: invitecode (string, REQUIRED — codigo curto ou URL completa)

### POST /group/join — Entrar em grupo via convite
Body: invitecode (string, REQUIRED — codigo ou URL, max 50 chars)

### POST /group/leave — Sair do grupo
Body: groupjid (string, REQUIRED)

### GET /group/list — Listar todos os grupos (simples)
Query: force (boolean — atualiza cache), noparticipants (boolean)

### POST /group/list — Listar grupos com filtros e paginacao
Body: page (integer, padrao 1), pageSize (integer, padrao 50, max 1000), limit (integer), offset (integer), search (string), force (boolean), noParticipants (boolean)

### POST /group/resetInviteCode — Resetar codigo de convite
Body: groupjid (string, REQUIRED)

### POST /group/updateAnnounce — Permissoes de envio
Body: groupjid (string, REQUIRED), announce (boolean, REQUIRED)
- true = apenas admins enviam

### POST /group/updateDescription — Atualizar descricao
Body: groupjid (string, REQUIRED), description (string, REQUIRED)

### POST /group/updateImage — Atualizar imagem do grupo
Body: groupjid (string, REQUIRED), image (string, REQUIRED — URL, base64, ou "remove"/"delete")
- JPEG, 640x640 pixels

### POST /group/updateLocked — Permissao de edicao do grupo
Body: groupjid (string, REQUIRED), locked (boolean, REQUIRED)
- true = apenas admins podem editar infos do grupo

### POST /group/updateName — Atualizar nome do grupo
Body: groupjid (string, REQUIRED), name (string, REQUIRED, max 25 chars)

### POST /group/updateParticipants — Gerenciar participantes
Body: groupjid (string, REQUIRED), action (string, REQUIRED — add, remove, promote, demote, approve, reject), participants (array, REQUIRED)

### POST /community/create — Criar comunidade
Body: name (string, REQUIRED)

### POST /community/editgroups — Gerenciar grupos na comunidade
Body: community (string, REQUIRED — JID), action (string, REQUIRED — add, remove), groupjids (array, REQUIRED)

---

## NEWSLETTERS E CANAIS

### POST /newsletter/create — Criar canal
Body: name (string, REQUIRED), description (string), picture (string — URL, base64 ou data URI, max 1MB)

### GET /newsletter/list — Listar canais inscritos

### POST /newsletter/info — Buscar info de um canal
Body: id (string) ou jid (string)

### POST /newsletter/link — Buscar canal por link de convite
Body: key (string, REQUIRED — chave do convite)

### POST /newsletter/subscribe — Assinar live updates temporarios
Body: id (string) ou jid (string)

### POST /newsletter/messages — Buscar mensagens de um canal
Body: id/jid (string), count (integer, min 1), beforeid (integer — para paginacao)

### POST /newsletter/messages/edit — Editar mensagem do canal
Body: id/jid (string), messageid (string) ou serverid (integer), text (string, REQUIRED)
Opcionais: count (integer), maxpages (integer)

### POST /newsletter/messages/delete — Deletar mensagem do canal
Body: id/jid (string), messageid (string) ou serverid (integer)
Opcionais: count (integer), maxpages (integer)

### POST /newsletter/updates — Buscar updates de mensagens
Body: id/jid (string), count (integer), afterid (integer), since (integer — timestamp ms ou s)

### POST /newsletter/viewed — Marcar posts como visualizados
Body: id/jid (string), serverids (array de integers)

### POST /newsletter/reaction — Reagir a post do canal
Body: id/jid (string), serverid (integer), reaction (string — emoji, vazio para remover), reactionmessageid (string)

### POST /newsletter/follow — Seguir canal
Body: id (string) ou jid (string)

### POST /newsletter/unfollow — Deixar de seguir canal
Body: id (string) ou jid (string)

### POST /newsletter/mute — Silenciar canal
Body: id (string) ou jid (string)

### POST /newsletter/unmute — Remover mute do canal
Body: id (string) ou jid (string)

### POST /newsletter/delete — Deletar canal
Body: id (string) ou jid (string)

### POST /newsletter/picture — Atualizar foto do canal
Body: id/jid (string), picture (string, REQUIRED)

### POST /newsletter/name — Atualizar nome do canal
Body: id/jid (string), name (string, REQUIRED)

### POST /newsletter/description — Atualizar descricao do canal
Body: id/jid (string), description (string)

### POST /newsletter/settings — Atualizar configuracoes do canal
Body: id/jid (string), reactionCodes (string, REQUIRED — all, basic, none, blocklist)

### POST /newsletter/search — Pesquisar canais publicos
Body: searchText (string), limit (integer), view (string), countryCodes (array de strings), after (string — paginacao)

### POST /newsletter/admin/invite — Convidar admin do canal
Body: id/jid (string), phone (string, REQUIRED)

### POST /newsletter/admin/accept — Aceitar convite de admin
Body: id (string) ou jid (string)

### POST /newsletter/admin/remove — Remover admin do canal
Body: id/jid (string), phone (string, REQUIRED)

### POST /newsletter/admin/revoke — Revogar convite de admin
Body: id/jid (string), phone (string, REQUIRED)

### POST /newsletter/owner/transfer — Transferir dono do canal
Body: id/jid (string), phone (string, REQUIRED), quitAdmin (boolean — remove admin anterior)

---

## RESPOSTAS RAPIDAS

### POST /quickreply/edit — Criar, atualizar ou excluir resposta rapida
Body: shortCut (string, REQUIRED), type (string, REQUIRED — text, audio, myaudio, ptt, document, video, image)
Opcionais: id (string — omitir para criar, incluir para editar/excluir), delete (boolean, default false), text (string — obrigatorio para type=text), file (string — URL ou base64 para midia), docName (string — nome do arquivo para documents)

### GET /quickreply/showall — Listar todas as respostas rapidas

---

## CRM

### POST /instance/updateFieldsMap — Atualizar campos personalizados de leads
Body: lead_field01 a lead_field20 (string, max 255 chars cada)
- Configura ate 20 campos personalizados para leads

### POST /chat/editLead — Editar informacoes de lead
Body: id (string, REQUIRED — wa_chatid ou wa_fastid)
Opcionais:
- chatbot_disableUntil (integer) - timestamp UTC para desativar chatbot (0 para reativar)
- lead_isTicketOpen (boolean) - status do ticket
- lead_assignedAttendant_id (string) - ID do atendente (vazio para remover)
- lead_kanbanOrder (integer) - posicao no kanban
- lead_tags (array de strings) - tags (inexistentes sao criadas, vazio limpa)
- lead_name, lead_fullName, lead_email, lead_personalid (string) - dados do lead
- lead_status (string) - status no funil
- lead_notes (string) - anotacoes
- lead_field01 a lead_field20 (string) - campos personalizados

---

## MENSAGEM EM MASSA (SENDER/CAMPANHAS)

### POST /sender/simple — Criar nova campanha (simples)
Body:
- numbers (array de strings, REQUIRED) - lista de numeros
- type (string, REQUIRED) - tipo da mensagem (text, image, video, audio, document, contact, location, button, list, poll, carousel)
- delayMin (integer, REQUIRED) - delay minimo entre msgs (segundos)
- delayMax (integer, REQUIRED) - delay maximo entre msgs (segundos)
- scheduled_for (integer, REQUIRED) - timestamp ms ou minutos a partir de agora
Opcionais:
- folder (string) - nome da campanha
- info (string) - descricao
- text (string), file (string), docName (string) - conteudo conforme type
- linkPreview (boolean), linkPreviewTitle, linkPreviewDescription, linkPreviewImage, linkPreviewLarge
- fullName, phoneNumber, organization, email, url - para type=contact
- latitude, longitude, name, address - para type=location
- footerText, buttonText, listButton, selectableCount, choices, imageButton - para menus interativos
- mentions (string)

### POST /sender/advanced — Criar envio em massa avancado
Body: messages (array de objetos, REQUIRED — cada msg com numero, tipo, conteudo e delays individuais)
Opcionais: delayMin, delayMax (integer), info (string), scheduled_for (integer)

### POST /sender/edit — Controlar campanha de envio
Body: folder_id (string, REQUIRED), action (string, REQUIRED — stop, continue, restart, abort)
- stop: pausa campanha
- continue: retoma campanha pausada
- restart: reinicia do zero
- abort: cancela definitivamente

### POST /sender/cleardone — Limpar mensagens enviadas
Body: hours (integer, default 168 — mantém msgs mais recentes que X horas)

### DELETE /sender/clearall — Limpar toda fila de mensagens
- Remove TODAS as mensagens (pendentes e enviadas). Irreversivel.

### GET /sender/listfolders — Listar campanhas de envio
Query: status (string — filtro opcional)

### POST /sender/listmessages — Listar mensagens de uma campanha
Body: folder_id (string, REQUIRED), messageStatus (string), limit (integer, default 1000), offset (integer, default 0)

---

## CHATBOT CONFIGURACOES

### POST /instance/updatechatbotsettings — Configurar chatbot
Body (todos opcionais):
- openai_apikey (string) - chave API OpenAI
- chatbot_enabled (boolean) - habilita/desabilita
- chatbot_ignoreGroups (boolean) - ignorar grupos
- chatbot_stopConversation (string) - palavra-chave para parar
- chatbot_stopMinutes (integer) - minutos desativado apos parada
- chatbot_stopWhenYouSendMsg (integer) - minutos desativado apos envio manual

---

## CHATBOT TRIGGER

### POST /trigger/edit — Criar, atualizar ou excluir trigger
Body: id (string — vazio para criar), delete (boolean), trigger (object, REQUIRED)

### GET /trigger/list — Listar todos os triggers do chatbot

---

## CONFIGURACAO DO AGENTE DE IA

### POST /agent/edit — Criar/editar agente
Body: id (string — vazio para criar), delete (boolean)
agent (object):
- name (string) - nome do agente
- provider (string) - ex: "openai"
- apikey (string) - chave da API do provider
- basePrompt (string) - prompt base do agente
- model (string) - ex: "gpt-4o-mini"
- maxTokens (integer) - max tokens por resposta
- temperature (integer) - criatividade (0-100)
- diversityLevel (integer), frequencyPenalty (integer), presencePenalty (integer)
- signMessages (boolean), readMessages (boolean)
- maxMessageLength (integer) - max caracteres por msg
- typingDelay_seconds (integer) - delay de digitacao
- contextTimeWindow_hours (integer) - janela de contexto em horas
- contextMaxMessages (integer), contextMinMessages (integer)

### GET /agent/list — Listar todos os agentes

---

## CONHECIMENTO DOS AGENTES

### POST /knowledge/edit — Criar/editar conhecimento do agente
Body: id (string — vazio para criar), delete (boolean)
knowledge (object):
- active (boolean) - ativo/inativo
- tittle (string) - titulo do conhecimento
- content (string) - conteudo texto
- fileType (string) - tipo do arquivo (PDF/CSV quando aplicavel)

### GET /knowledge/list — Listar base de conhecimento

---

## FUNCOES API DOS AGENTES

### POST /function/edit — Criar/editar funcao de API
Body: id (string, REQUIRED — vazio para criar), delete (boolean, REQUIRED), function (object, REQUIRED)
- Funcoes para integracao com APIs externas usadas pelos agentes

### GET /function/list — Listar todas as funcoes de API

---

## INTEGRACAO CHATWOOT (BETA)

### GET /chatwoot/config — Obter configuracao do Chatwoot

### PUT /chatwoot/config — Atualizar configuracao do Chatwoot
Body:
- enabled (boolean, REQUIRED) - habilitar/desabilitar
- url (string, REQUIRED) - URL base do Chatwoot (sem barra final)
- access_token (string, REQUIRED) - token de acesso da API
- account_id (integer, REQUIRED) - ID da conta
- inbox_id (integer, REQUIRED) - ID da inbox
Opcionais:
- ignore_groups (boolean) - ignorar msgs de grupos
- sign_messages (boolean) - assinar msgs com ID do agente
- create_new_conversation (boolean) - sempre criar nova conversa

---

## GOTCHAS
- Numeros: sempre formato internacional sem + ou espacos (ex: 5524999999999)
- JID de grupo: formato numero@g.us
- JID de usuario: formato numero@s.whatsapp.net ou numero@lid
- Imagens de perfil/grupo: JPEG 640x640 obrigatorio
- Delay em envio: valor em milissegundos (1000 = 1 segundo)
- Delay em campanhas (sender): valor em segundos
- Async=true: usa fila interna, recomendado pra alto volume
- Presence "unavailable": nao recebe ticks se API for unico dispositivo
- Webhooks: podem ser por instancia (POST /webhook) ou global (POST /globalwebhook)
- SSE: alternativa a webhooks pra conexao persistente
- Mensagens com mais de 7 dias sao excluidas na madrugada
- Rate limit de disparo: respeitar delay entre mensagens pra evitar ban
- Botoes interativos podem ser descontinuados pelo WhatsApp a qualquer momento
- Newsletter/canais: identificar por id (numerico) ou jid (completo com @newsletter)
- Etiquetas: usar labelid (numerico), nao o nome da etiqueta
- CRM leads: ate 20 campos personalizados (lead_field01 a lead_field20, max 255 chars)
- Chatbot: desativar por chat via chatbot_disableUntil no /chat/editLead
