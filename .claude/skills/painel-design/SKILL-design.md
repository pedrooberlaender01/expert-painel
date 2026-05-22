---
name: painel-design
description: Design system Dark-first Glassmorphism do painel SaaS. Usar sempre que criar ou editar HTML/CSS/JS de qualquer tela do painel. Inclui componentes, escala de opacidade, cores, gotchas e regras de white-label.
---

# Design System - Dark Glassmorphism

## Fundo com Atmosfera

```css
background: linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0f0a1a 100%);
```

Adicionar ambient lights como divs absolutas com pointer-events: none:
- Mancha azul: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%) — canto superior esquerdo
- Mancha verde: radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%) — canto inferior direito

## Escala de Opacidade (decorar)

| Elemento          | Valor                        |
|-------------------|------------------------------|
| Inner item bg     | rgba(255,255,255, 0.02)      |
| Inner item border | rgba(255,255,255, 0.04)      |
| Glass card bg     | rgba(255,255,255, 0.04)      |
| Glass elevated    | rgba(255,255,255, 0.06)      |
| Glass border      | rgba(255,255,255, 0.08)      |
| Hover border      | rgba(255,255,255, 0.12)      |
| Texto muted       | rgba(255,255,255, 0.35)      |
| Texto secondary   | rgba(255,255,255, 0.50)      |
| Texto primary     | #ffffff                      |

## Cores de Acento (cada uma com significado)

- Azul #3b82f6 / #60a5fa — acoes principais, links, info, membros
- Verde #10b981 / #34d399 — sucesso, greens, ativo, online, salvar
- Vermelho #f87171 — erro, reds, risco, deletar, desativado
- Dourado #facc3c — premium, VIP, receita, alerta
- Roxo #a78bfa — IA, broadcasting, features especiais

## Componentes

### Glass Card
```css
.glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  transform: translateZ(0);
  isolation: isolate;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}
.glass-card:hover {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
```

### Inner Item (elemento dentro de glass card)
```css
.inner-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 10px 12px;
}
```

### Stat Card (metrica com icone)
- Icone: quadrado 40x40, border-radius 12px, fundo rgba({cor}, 0.12)
- Label: 11px, uppercase, letter-spacing 0.5px, cor rgba(255,255,255,0.45)
- Numero: 28px, font-weight 700, font-variant-numeric tabular-nums
- Subtexto: 12px, cor da metrica correspondente

### Badge
```css
.badge-{tipo} {
  background: rgba({cor}, 0.12);
  border: 1px solid rgba({cor}, 0.2);
  color: {cor};
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}
```

### Botao de Acao
```css
.btn-{tipo} {
  background: rgba({cor}, 0.12);
  border: 1px solid rgba({cor}, 0.25);
  color: {cor};
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}
.btn-{tipo}:hover {
  background: rgba({cor}, 0.2);
}
.btn-{tipo}:active {
  transform: scale(0.98);
}
```

### Tab Selector (glass pill group)
```css
.tab-selector {
  display: inline-flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 4px;
  backdrop-filter: blur(12px);
}
.tab-item {
  padding: 8px 20px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}
.tab-item:hover {
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.03);
}
.tab-item.active {
  background: rgba({cor-da-aba}, 0.1);
  border: 1px solid rgba({cor-da-aba}, 0.2);
  color: {cor-da-aba};
}
```

### Input Glass
```css
.input-glass {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 16px;
  color: #fff;
  font-size: 13px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-glass::placeholder {
  color: rgba(255, 255, 255, 0.25);
}
.input-glass:focus {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
  outline: none;
}
```

### Dropdown Glass
```css
.dropdown-glass {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px 36px 8px 14px;
  color: #fff;
  font-size: 13px;
  appearance: none;
  cursor: pointer;
}
```

### Toggle Switch
```css
.toggle-glass {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}
.toggle-glass.active {
  background: rgba(59, 130, 246, 0.35);
  border-color: rgba(59, 130, 246, 0.5);
}
.toggle-glass .knob {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.toggle-glass.active .knob {
  transform: translateX(20px);
}
```

### Tabela
```css
/* Header */
thead th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.4);
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
/* Linhas */
tbody tr { transition: background 0.2s ease; }
tbody tr:hover { background: rgba(255, 255, 255, 0.03); }
tbody td {
  padding: 12px 16px;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
}
```

### Popups / Dropdowns / Calendarios
```css
.popup-glass {
  background: rgba(22, 27, 34, 0.97);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  z-index: 9999;
}
```

### Scrollbar
```css
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
```

### Empty State
- Icone: circulo 64-72px, fundo rgba(255,255,255,0.04), border rgba(255,255,255,0.08)
- Icone SVG: cor rgba(255,255,255,0.2)
- Titulo: 15px, font-weight 500, rgba(255,255,255,0.5)
- Descricao: 13px, rgba(255,255,255,0.25)

### Baloes de Chat (secao Conversas)
- Mensagem recebida: bg rgba(255,255,255,0.06), border rgba(255,255,255,0.08), radius 4px 16px 16px 16px
- Mensagem enviada: bg rgba(59,130,246,0.15), border rgba(59,130,246,0.2), radius 16px 4px 16px 16px
- Preview de mensagem (follow-ups): bg linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.2))

## White-Label

Centralizar tudo em CSS variables. Override por classe no body:
```css
:root {
  --accent-primary: #3b82f6;
  --accent-success: #34d399;
  --accent-danger: #f87171;
  --accent-warning: #facc3c;
  --glass-bg: rgba(255,255,255,0.04);
  --glass-border: rgba(255,255,255,0.08);
  --glass-blur: 20px;
  --bg-gradient: linear-gradient(135deg, #0a0a0f, #0d1117, #0f0a1a);
}
/* Override por cliente */
.theme-cliente-x {
  --accent-primary: #10b981;
  --bg-gradient: linear-gradient(135deg, #0a0f0a, #0d1711, #0a1a0f);
}
```

No Supabase, armazenar tema por tenant (tema_css_class). No login, aplicar classe no body:
```javascript
document.body.className = tenant.tema_css_class;
```

## GOTCHAS CRITICOS

1. NUNCA usar backdrop-filter em popups/dropdowns/calendarios — causa linhas de artifact. Usar fundo opaco rgba(22,27,34,0.97) com backdrop-filter: none
2. NUNCA usar transition: all em glass cards — causa repaint pesado. Usar transition: background 0.2s ease, box-shadow 0.2s ease
3. NUNCA animar border-color em hover de elementos com backdrop-filter — usar box-shadow inset pra simular borda
4. Glass cards precisam de transform: translateZ(0) e isolation: isolate pra estabilizar GPU compositing
5. Labels uppercase: SEMPRE 11px, letter-spacing 0.5px, rgba(255,255,255,0.45)
6. Numeros/metricas: SEMPRE font-weight 700, font-variant-numeric tabular-nums
7. Sidebar: glass com rgba(255,255,255,0.02), border-right rgba(255,255,255,0.06)
8. Item ativo sidebar: bg rgba(59,130,246,0.12), border-left 3px solid #3b82f6
9. Status online: dot 8px com box-shadow glow na cor correspondente
10. Area tracejada (nova instancia, etc): border 2px dashed rgba(59,130,246,0.2), hover bg rgba(59,130,246,0.04)
