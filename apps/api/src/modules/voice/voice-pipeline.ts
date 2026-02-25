import { WebSocket } from 'ws';
import { SessionManager, type SessionState } from './session-manager';
import { STTService, type TranscriptResult } from './stt.service';
import { TTSService } from './tts.service';
import { IntentDetector } from './intent-detector';
import { WorkflowEngine } from '../workflows/workflow-engine';
import { GuardrailEngine } from '../guardrails/guardrail-engine';
import { prisma } from '@voiceflow/db';
import type {
  WorkflowGraph,
  StartConfig,
  IntentConfig,
  ResponseConfig,
  TransferConfig,
  FallbackConfig,
  DisconnectConfig,
} from '@voiceflow/shared';

export class VoicePipeline {
  private session: SessionManager;
  private stt: STTService;
  private tts: TTSService;
  private intentDetector: IntentDetector;
  private workflowEngine: WorkflowEngine;
  private guardrails: GuardrailEngine;
  private streamSid: string = '';
  private pendingText: string = '';

  constructor(
    private twilioWs: WebSocket,
    private callId: string,
    private agentId: string,
    private workflowId: string,
    private tenantId: string,
  ) {
    this.session = new SessionManager(callId);
    this.stt = new STTService();
    this.tts = new TTSService();
    this.intentDetector = new IntentDetector();
    this.workflowEngine = new WorkflowEngine();
    this.guardrails = new GuardrailEngine();
  }

  async start(): Promise<void> {
    // Load workflow from DB
    const workflow = await prisma.workflow.findUnique({
      where: { id: this.workflowId },
      include: { agent: true },
    });

    if (!workflow) throw new Error('Workflow not found');

    const graph = workflow.graph as unknown as WorkflowGraph;
    this.workflowEngine.load(graph);

    const language = workflow.agent.language || 'en-US';

    // Initialize session
    await this.session.init({
      callId: this.callId,
      agentId: this.agentId,
      tenantId: this.tenantId,
      workflowId: this.workflowId,
      currentNodeId: this.workflowEngine.getStartNodeId(),
      language,
      variables: {},
      retryCount: 0,
      transcript: [],
    });

    // Start STT
    await this.stt.start(language);

    this.stt.on('transcript', async (result: TranscriptResult) => {
      if (result.isFinal && result.text.trim()) {
        await this.handleUserSpeech(result.text);
      }
    });

    // Handle Twilio WebSocket messages
    this.twilioWs.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data);
        switch (msg.event) {
          case 'connected':
            console.log(`[${this.callId}] Twilio media stream connected`);
            break;
          case 'start':
            this.streamSid = msg.start.streamSid;
            console.log(`[${this.callId}] Stream started: ${this.streamSid}`);
            // Execute start node after stream is ready
            this.executeCurrentNode();
            break;
          case 'media':
            // Forward audio to STT
            const audioBuffer = Buffer.from(msg.media.payload, 'base64');
            this.stt.sendAudio(audioBuffer);
            break;
          case 'stop':
            console.log(`[${this.callId}] Stream stopped`);
            this.cleanup();
            break;
        }
      } catch (error) {
        console.error(`[${this.callId}] Error processing message:`, error);
      }
    });

    this.twilioWs.on('close', () => {
      this.cleanup();
    });
  }

  private async handleUserSpeech(text: string): Promise<void> {
    await this.session.addTranscriptEntry('user', text);

    const state = await this.session.getState();

    // Run guardrails
    const guardrailResult = await this.guardrails.check(text, state);
    if (guardrailResult.blocked) {
      await this.speak(guardrailResult.response);

      if (guardrailResult.reason === 'max_retries_exceeded') {
        // Find transfer node or disconnect
        await this.handleMaxRetries(state);
      }
      return;
    }

    const currentNode = this.workflowEngine.getNode(state.currentNodeId);

    if (currentNode.type === 'intent') {
      const config = currentNode.data.config as IntentConfig;
      const intent = await this.intentDetector.classify(text, config, state.variables);

      await this.session.addTranscriptEntry('system', `Intent: ${intent.name} (${intent.confidence})`);

      if (intent.name === '__fallback__') {
        const retryCount = await this.session.incrementRetry();
        const fallbackNode = this.workflowEngine.getNode(state.currentNodeId);
        const fallbackConfig = fallbackNode.data.config as FallbackConfig;
        if (retryCount >= (fallbackConfig.retryCount || 3)) {
          await this.handleMaxRetries(state);
        } else {
          await this.speak("I didn't quite understand that. Could you please say that again?");
        }
        return;
      }

      await this.session.resetRetry();
      const nextNodeId = this.workflowEngine.resolveEdge(currentNode.id, intent.outputHandle);
      if (nextNodeId) {
        await this.session.update({ currentNodeId: nextNodeId });
        await this.executeCurrentNode();
      }
    } else if (currentNode.type === 'response') {
      const config = currentNode.data.config as ResponseConfig;
      if (config.expectResponse && config.saveResponseAs) {
        await this.session.setVariable(config.saveResponseAs, text);
      }
      // Move to next node
      const nextNodeId = this.workflowEngine.getNextNodeId(currentNode.id);
      if (nextNodeId) {
        await this.session.update({ currentNodeId: nextNodeId });
        await this.executeCurrentNode();
      }
    }
  }

  private async executeCurrentNode(): Promise<void> {
    const state = await this.session.getState();
    const node = this.workflowEngine.getNode(state.currentNodeId);

    switch (node.type) {
      case 'start': {
        const config = node.data.config as StartConfig;
        const greeting = this.workflowEngine.interpolateVariables(
          config.greetingText,
          state.variables,
        );
        await this.speak(greeting);
        // Auto-advance to next node
        const nextId = this.workflowEngine.getNextNodeId(node.id);
        if (nextId) {
          await this.session.update({ currentNodeId: nextId });
          await this.executeCurrentNode();
        }
        break;
      }

      case 'response': {
        const config = node.data.config as ResponseConfig;
        const text = this.workflowEngine.interpolateVariables(config.text, state.variables);
        await this.speak(text);

        if (!config.expectResponse) {
          const nextId = this.workflowEngine.getNextNodeId(node.id);
          if (nextId) {
            await this.session.update({ currentNodeId: nextId });
            await this.executeCurrentNode();
          }
        }
        // If expectResponse, we wait for user speech
        break;
      }

      case 'intent': {
        // Wait for user speech - nothing to do
        break;
      }

      case 'transfer': {
        const config = node.data.config as TransferConfig;
        await this.speak(config.whisperText || 'Transferring your call now. Please hold.');
        // Send transfer command via Twilio
        // In production, this would use Twilio API to redirect the call
        console.log(`[${this.callId}] Transferring to ${config.phoneNumber}`);
        break;
      }

      case 'fallback': {
        const config = node.data.config as FallbackConfig;
        await this.speak(config.fallbackText);
        // Stay on intent node for re-detection
        break;
      }

      case 'disconnect': {
        const config = node.data.config as DisconnectConfig;
        const goodbye = this.workflowEngine.interpolateVariables(
          config.goodbyeText,
          state.variables,
        );
        await this.speak(goodbye);
        // End call after TTS completes
        setTimeout(() => this.endCall(), 2000);
        break;
      }

      default:
        console.log(`[${this.callId}] Unhandled node type: ${node.type}`);
        const nextId = this.workflowEngine.getNextNodeId(node.id);
        if (nextId) {
          await this.session.update({ currentNodeId: nextId });
          await this.executeCurrentNode();
        }
    }
  }

  private async speak(text: string): Promise<void> {
    await this.session.addTranscriptEntry('agent', text);

    try {
      const state = await this.session.getState();
      const audioBuffer = await this.tts.synthesize(text, state.language);
      const chunks = this.tts.encodeToBase64Chunks(audioBuffer);

      for (const chunk of chunks) {
        if (this.twilioWs.readyState === WebSocket.OPEN) {
          this.twilioWs.send(
            JSON.stringify({
              event: 'media',
              streamSid: this.streamSid,
              media: { payload: chunk },
            }),
          );
        }
      }

      // Send mark event to know when audio finishes
      if (this.twilioWs.readyState === WebSocket.OPEN) {
        this.twilioWs.send(
          JSON.stringify({
            event: 'mark',
            streamSid: this.streamSid,
            mark: { name: `speech-${Date.now()}` },
          }),
        );
      }
    } catch (error) {
      console.error(`[${this.callId}] TTS error:`, error);
    }
  }

  private async handleMaxRetries(state: SessionState): Promise<void> {
    await this.speak("I'm unable to help further. Let me transfer you to a human agent.");
    setTimeout(() => this.endCall(), 3000);
  }

  private endCall(): void {
    if (this.twilioWs.readyState === WebSocket.OPEN) {
      this.twilioWs.close();
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await this.stt.stop();
      const state = await this.session.getState();

      // Persist call record
      await prisma.call.update({
        where: { id: this.callId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          transcript: state.transcript as any,
        },
      });

      await this.session.destroy();
    } catch (error) {
      console.error(`[${this.callId}] Cleanup error:`, error);
    }
  }
}
