import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import type { Node, Edge, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './flow.css';
import { GatilhoNode, EtapaNode } from './nodes';
import { buildFlowData, getGatilhoRow, getAnchorRowForSecao } from './utils/buildFlowData';
import { useMensagensFunil } from '../../../hooks/useMensagensFunil';
import { AlertCircle, LayoutList, RefreshCw } from 'lucide-react';
import { GatilhoDrawer } from './drawer/GatilhoDrawer';
import { EtapaDrawer } from './drawer/EtapaDrawer';
import { FlowControls } from './controls/FlowControls';
import { SaveLayoutButton } from './controls/SaveLayoutButton';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../backend/client';
import { useToast } from '../../../hooks/useToast';
import { Toast } from '../../Toast';

const nodeTypes = {
  gatilho: GatilhoNode,
  etapa: EtapaNode,
};

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  animated: false,
  style: { strokeWidth: 1.5 },
  pathOptions: { borderRadius: 0 },
};

const canvasStyle = {
  borderColor: 'rgba(255,255,255,0.08)',
  background: 'linear-gradient(135deg, rgba(10,10,15,0.95), rgba(13,17,23,0.95))',
};

type DrawerState =
  | { type: 'closed' }
  | { type: 'gatilho' }
  | { type: 'etapa'; secao: string; numero: number; titulo: string };

// ── Skeleton, Error, Empty ──

const LoadingSkeleton: React.FC = () => (
  <div className="h-[calc(100vh-280px)] min-h-[500px] rounded-2xl border overflow-hidden relative flex items-center justify-center" style={canvasStyle}>
    <div className="flex gap-6 items-center px-8">
      <div className="w-[180px] h-[82px] rounded-xl animate-pulse" style={{ background: 'rgba(250, 204, 60, 0.04)', border: '1px solid rgba(250, 204, 60, 0.1)' }} />
      <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6">
          <div className="w-[180px] h-[82px] rounded-xl animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.08)', animationDelay: `${i * 100}ms` }} />
          {i < 4 && <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />}
        </div>
      ))}
    </div>
  </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="h-[calc(100vh-280px)] min-h-[500px] rounded-2xl border overflow-hidden relative flex items-center justify-center" style={canvasStyle}>
    <div className="flex flex-col items-center gap-4 max-w-xs text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.15)' }}>
        <AlertCircle className="w-6 h-6 text-rose-400" />
      </div>
      <p className="text-[14px] font-semibold text-white font-display">Erro ao carregar</p>
      <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Não foi possível carregar as etapas do funil</p>
      <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
        <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
      </button>
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="h-[calc(100vh-280px)] min-h-[500px] rounded-2xl border overflow-hidden relative flex items-center justify-center" style={canvasStyle}>
    <div className="flex flex-col items-center gap-4 max-w-xs text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <LayoutList className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
      <p className="text-[14px] font-semibold text-white font-display">Nenhuma etapa configurada</p>
      <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>As etapas do funil aparecerão aqui quando forem cadastradas</p>
    </div>
  </div>
);

// ── Canvas interno ──
const FlowCanvas: React.FC<{
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodeClick: (e: React.MouseEvent, node: Node) => void;
  onDragDirty: () => void;
  onSaveLayout: (nodes: Node[]) => void;
  onDiscardLayout: () => void;
  isDirty: boolean;
  saving: boolean;
}> = ({ initialNodes, initialEdges, onNodeClick, onDragDirty, onSaveLayout, onDiscardLayout, isDirty, saving }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Detectar fim de drag
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const hasDragEnd = changes.some((c) => c && c.type === 'position' && 'dragging' in c && c.dragging === false);
    if (hasDragEnd) onDragDirty();
  }, [onNodesChange, onDragDirty]);

  // Cor primaria computada para o MiniMap
  const [corPrimaria, setCorPrimaria] = useState('#10b981');
  const expertId = useAuthStore((s) => s.getActiveExpertId());
  useEffect(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    if (val) setCorPrimaria(val);
  }, [expertId]);

  // Discard: resetar nodes para os iniciais
  const handleDiscard = useCallback(() => {
    setNodes(initialNodes);
    onDiscardLayout();
  }, [initialNodes, setNodes, onDiscardLayout]);

  return (
    <>
      <SaveLayoutButton
        visible={isDirty}
        saving={saving}
        onSave={() => onSaveLayout(nodes)}
        onDiscard={handleDiscard}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable={true}
        deleteKeyCode={null}
        snapToGrid={true}
        snapGrid={[24, 24]}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="rgba(255,255,255,0.15)" />
        <MiniMap
          position="bottom-left" pannable zoomable
          maskColor="rgba(10, 10, 15, 0.6)" nodeBorderRadius={4} nodeStrokeWidth={0}
          nodeColor={(node) => node.type === 'gatilho' ? '#facc3c' : corPrimaria}
          style={{ background: 'rgba(13, 17, 23, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
        />
        <FlowControls />
      </ReactFlow>
    </>
  );
};

// ── Componente principal ──
export const MensagensFunilFlow: React.FC = () => {
  const { data, loading, fetchData } = useMensagensFunil();
  const { toast, showToast, hideToast } = useToast();
  const [drawer, setDrawer] = useState<DrawerState>({ type: 'closed' });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Key que forca remontagem do ReactFlowProvider apos save (evita conflito de estado interno)
  const [flowKey, setFlowKey] = useState(0);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!data || data.length === 0) return { nodes: [], edges: [] };
    return buildFlowData(data);
  }, [data]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'gatilho') {
      setDrawer({ type: 'gatilho' });
    } else if (node.type === 'etapa') {
      setDrawer({ type: 'etapa', secao: node.data.secao as string, numero: node.data.numero as number, titulo: node.data.titulo as string });
    }
  }, []);

  const closeDrawer = useCallback(() => setDrawer({ type: 'closed' }), []);

  const handleDragDirty = useCallback(() => setIsDirty(true), []);

  const handleSaveLayout = useCallback(async (currentNodes: Node[]) => {
    setSaving(true);
    try {
      const expertId = useAuthStore.getState().getActiveExpertId();
      const updates: { id: string; position_x: number; position_y: number }[] = [];

      for (const node of currentNodes) {
        let rowId: string | null = null;
        if (node.type === 'gatilho') {
          rowId = getGatilhoRow(data)?.id ?? null;
        } else if (node.type === 'etapa') {
          rowId = getAnchorRowForSecao(data, node.data.secao as string)?.id ?? null;
        }
        if (rowId) {
          updates.push({ id: rowId, position_x: Math.round(node.position.x), position_y: Math.round(node.position.y) });
        }
      }

      for (const upd of updates) {
        const { error } = await supabase
          .from('mensagens_funil_v2')
          .update({ position_x: upd.position_x, position_y: upd.position_y })
          .eq('id', upd.id)
          .eq('expert_id', expertId);
        if (error) throw error;
      }

      showToast('success', 'Layout salvo');
      setIsDirty(false);
      await fetchData();
      // Incrementar key para forcar remontagem limpa do ReactFlow com novos dados
      setFlowKey((k) => k + 1);
    } catch (err: any) {
      console.error('[SaveLayout] Erro:', err);
      showToast('error', 'Não foi possível salvar o layout');
    } finally {
      setSaving(false);
    }
  }, [data, fetchData, showToast]);

  const handleDiscardLayout = useCallback(() => {
    setIsDirty(false);
    // Forcar remontagem para voltar aos initialNodes do banco
    setFlowKey((k) => k + 1);
  }, []);

  if (loading && data.length === 0) return <LoadingSkeleton />;
  if (!loading && initialNodes.length <= 1) return <EmptyState />;

  return (
    <>
      <div className="h-[calc(100vh-280px)] min-h-[500px] rounded-2xl border overflow-hidden relative" style={canvasStyle}>
        <ReactFlowProvider key={flowKey}>
          <FlowCanvas
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            onNodeClick={handleNodeClick}
            onDragDirty={handleDragDirty}
            onSaveLayout={handleSaveLayout}
            onDiscardLayout={handleDiscardLayout}
            isDirty={isDirty}
            saving={saving}
          />
        </ReactFlowProvider>
      </div>

      <GatilhoDrawer open={drawer.type === 'gatilho'} onClose={closeDrawer} onSaved={fetchData} />
      {drawer.type === 'etapa' && (
        <EtapaDrawer open onClose={closeDrawer} secao={drawer.secao} numero={drawer.numero} titulo={drawer.titulo} onSaved={fetchData} />
      )}
      {toast && <Toast toast={toast} onClose={hideToast} />}
    </>
  );
};

export default MensagensFunilFlow;
