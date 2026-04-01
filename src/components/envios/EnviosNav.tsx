import React from 'react';
import { NavLink } from 'react-router-dom';
import { FlaskConical, CalendarPlus, CalendarClock, Sparkles } from 'lucide-react';

const tabs = [
  { label: 'Novo Agendamento', path: '/envios/agendamentos', icon: CalendarPlus, end: false },
  { label: 'Agendados', path: '/envios/agendados', icon: CalendarClock, end: false },
  { label: 'Simular Mensagem', path: '/envios/simulador', icon: FlaskConical, end: false },
  { label: 'Gerar Copy', path: '/envios/gerar-copy', icon: Sparkles, end: false },
];

export const EnviosNav: React.FC = () => {
  return (
    <div
      className="grid grid-cols-2 md:flex md:w-fit gap-1 p-1 rounded-[14px] w-full"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.end}
          className="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-[10px] text-[12px] md:text-[13px] font-medium transition-all duration-250"
          style={({ isActive }) => isActive
            ? { background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-bg)', color: 'var(--color-primary-light)' }
            : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.45)' }
          }
        >
          {({ isActive }) => (
            <>
              <tab.icon className="w-3.5 h-3.5 shrink-0" style={{ opacity: isActive ? 1 : 0.5 }} />
              <span className="truncate">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
};
