import React from 'react';
import { NavLink } from 'react-router-dom';
import { FlaskConical, CalendarPlus, CalendarClock, Sparkles, Lock } from 'lucide-react';
import { useSectionGates } from '../../hooks/useSectionGate';
import type { SectionKey } from '../../hooks/useSectionGate';

interface TabDef {
  label: string;
  path: string;
  icon: typeof FlaskConical;
  end: boolean;
  sectionKey: SectionKey;
}

const tabs: TabDef[] = [
  { label: 'Novo Agendamento', path: '/envios/agendamentos', icon: CalendarPlus, end: false, sectionKey: 'envios_novo_agendamento' },
  { label: 'Agendados', path: '/envios/agendados', icon: CalendarClock, end: false, sectionKey: 'envios_agendados' },
  { label: 'Simular Mensagem', path: '/envios/simulador', icon: FlaskConical, end: false, sectionKey: 'envios_simulador' },
  { label: 'Gerar Copy', path: '/envios/gerar-copy', icon: Sparkles, end: false, sectionKey: 'envios_gerar_copy' },
];

export const EnviosNav: React.FC = () => {
  const sectionStates = useSectionGates(['envios_novo_agendamento', 'envios_agendados', 'envios_simulador', 'envios_gerar_copy']);

  const visibleTabs = tabs.filter((t) => sectionStates[t.sectionKey] !== 'hidden');

  return (
    <div
      className="grid grid-cols-2 md:flex md:w-fit gap-1 p-1 rounded-[14px] w-full"
      style={{ background: 'var(--c-glass)', border: '1px solid var(--c-border)' }}
    >
      {visibleTabs.map((tab) => {
        const isDisabled = sectionStates[tab.sectionKey] === 'disabled';

        if (isDisabled) {
          return (
            <div
              key={tab.path}
              className="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-[10px] text-[12px] md:text-[13px] font-medium cursor-not-allowed"
              style={{ background: 'transparent', border: '1px solid transparent', color: 'var(--c-t-25)' }}
              title="Funcionalidade nao disponivel no seu plano"
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" style={{ opacity: 0.4 }} />
              <span className="truncate">{tab.label}</span>
              <Lock className="w-3 h-3" style={{ color: '#facc15', opacity: 0.6 }} />
            </div>
          );
        }

        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-[10px] text-[12px] md:text-[13px] font-medium transition-all duration-250"
            style={({ isActive }) => isActive
              ? { background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }
              : { background: 'transparent', border: '1px solid transparent', color: 'var(--c-t-45)' }
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon className="w-3.5 h-3.5 shrink-0" style={{ opacity: isActive ? 1 : 0.5 }} />
                <span className="truncate">{tab.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
};
