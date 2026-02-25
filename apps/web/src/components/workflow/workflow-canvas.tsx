'use client';

import { useCallback, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import { NodePalette } from './node-palette';
import { NodeConfigPanel } from './panels/node-config-panel';

const DEFAULT_NODE_CONFIG: Record<string, any> = {
  start: { greetingText: 'Hello! How can I help you today?' },
  intent: { intents: [], fallbackHandle: 'fallback', confidenceThreshold: 0.7 },
  response: { text: '', expectResponse: true, saveResponseAs: '' },
  transfer: { phoneNumber: '', warmTransfer: false },
  fallback: { retryCount: 3, fallbackText: "I didn't quite catch that. Could you please repeat?" },
  disconnect: { goodbyeText: 'Thank you for calling. Goodbye!', reason: 'completed' },
  sheet: { operation: 'read', range: 'A1:D10', mappings: [] },
  outbound_trigger: { triggerType: 'immediate', targetPhone: '' },
  api: { method: 'GET', endpointUrl: '', headers: {}, bodyTemplate: '', timeoutMs: 5000, retryRules: { maxRetries: 2, backoffMs: 1000 }, responseMapping: {} },
  payment: { provider: 'razorpay', amountVariable: '', orderIdVariable: '', webhookUrl: '', timeoutSeconds: 300 },
  verification: { type: 'otp', maxAttempts: 3, codeLength: 6, expirySeconds: 300 },
  knowledge: { knowledgeBaseId: '', maxResults: 3, confidenceThreshold: 0.7 },
  logic: { conditions: [], defaultHandle: 'default' },
  introduction: { greetingText: '' },
};

const NODE_TYPE_LABELS: Record<string, string> = {
  start: 'Start',
  intent: 'Intent Detection',
  response: 'Response',
  transfer: 'Transfer Call',
  fallback: 'Fallback',
  disconnect: 'Disconnect',
  sheet: 'Google Sheet',
  outbound_trigger: 'Outbound Trigger',
  api: 'API Call',
  payment: 'Payment',
  verification: 'Verification',
  knowledge: 'Knowledge Base',
  logic: 'Logic',
  introduction: 'Introduction',
};

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 400, y: 50 },
    data: {
      label: 'Start',
      config: { greetingText: 'Hello! How can I help you today?' },
    },
  },
  {
    id: 'intent-1',
    type: 'intent',
    position: { x: 370, y: 200 },
    data: {
      label: 'Main Intent',
      config: {
        intents: [
          { name: 'book_appointment', examples: ['I want to book an appointment', 'Schedule a visit'], outputHandle: 'intent-0' },
          { name: 'check_status', examples: ['Where is my order', 'Mera order kaha hai'], outputHandle: 'intent-1' },
        ],
        fallbackHandle: 'fallback',
        confidenceThreshold: 0.7,
      },
    },
  },
  {
    id: 'response-1',
    type: 'response',
    position: { x: 650, y: 350 },
    data: {
      label: 'Booking Response',
      config: { text: 'Sure, I can help you book an appointment. What date works for you?', expectResponse: true, saveResponseAs: 'preferred_date' },
    },
  },
  {
    id: 'response-2',
    type: 'response',
    position: { x: 100, y: 350 },
    data: {
      label: 'Status Response',
      config: { text: 'Let me check your order status. One moment please.', expectResponse: false },
    },
  },
  {
    id: 'fallback-1',
    type: 'fallback',
    position: { x: 370, y: 450 },
    data: {
      label: 'Fallback',
      config: { retryCount: 3, fallbackText: "I'm sorry, I didn't understand. Could you rephrase?" },
    },
  },
  {
    id: 'disconnect-1',
    type: 'disconnect',
    position: { x: 370, y: 600 },
    data: {
      label: 'End Call',
      config: { goodbyeText: 'Thank you for calling. Have a great day!', reason: 'completed' },
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-start-intent', source: 'start-1', target: 'intent-1', animated: true },
  { id: 'e-intent-booking', source: 'intent-1', sourceHandle: 'intent-0', target: 'response-1' },
  { id: 'e-intent-status', source: 'intent-1', sourceHandle: 'intent-1', target: 'response-2' },
  { id: 'e-response1-disconnect', source: 'response-1', target: 'disconnect-1' },
  { id: 'e-response2-disconnect', source: 'response-2', target: 'disconnect-1' },
  { id: 'e-intent-fallback', source: 'intent-1', target: 'fallback-1' },
  { id: 'e-fallback-disconnect', source: 'fallback-1', target: 'disconnect-1' },
];

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: false }, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: NODE_TYPE_LABELS[type] || type,
          config: { ...(DEFAULT_NODE_CONFIG[type] || {}) },
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes],
  );

  const onNodeUpdate = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? { ...node, data } : node)),
      );
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
    },
    [setNodes],
  );

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  return (
    <div className="flex h-[calc(100vh-140px)] border border-gray-200 rounded-lg overflow-hidden bg-white">
      <NodePalette />

      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={memoizedNodeTypes}
          fitView
          defaultEdgeOptions={{
            style: { stroke: '#d1d5db', strokeWidth: 1.5 },
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
          <Controls className="!border-gray-200 !shadow-sm [&>button]:!border-gray-200 [&>button]:!bg-white" />
          <MiniMap
            className="!border-gray-200 !shadow-sm !bg-white"
            nodeColor="#e5e7eb"
            maskColor="rgba(255,255,255,0.8)"
          />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={onNodeUpdate}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
