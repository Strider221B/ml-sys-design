'use client';

import React from 'react';
import { AiExchangeModal } from '@/components/ai_exchange/ai_exchange_modal';
import { ArchitectureCanvas } from '@/components/canvas/architecture_canvas';
import { ChaosSandboxWorkspace } from '@/components/chaos/chaos_sandbox_workspace';
import { CurriculumView } from '@/components/curriculum/curriculum_view';
import { FinopsWorkspace } from '@/components/finops/finops_workspace';
import { NodeInspectorDrawer } from '@/components/guidance/node_inspector_drawer';
import { PlatformOnboardingModal } from '@/components/guidance/platform_onboarding_modal';
import { ScreenContextBanner } from '@/components/guidance/screen_context_banner';
import { InterviewWorkspace } from '@/components/interview/interview_workspace';
import { ExportType, HeaderDeck } from '@/components/navigation/header_deck';
import { TelemetryDashboard } from '@/components/telemetry/telemetry_dashboard';
import { AppWelcomeModal } from '@/components/welcome/app_welcome_modal';
import { ComponentWelcomeOverlay } from '@/components/welcome/component_welcome_overlay';
import { KubernetesManifestExporter } from '@/core/exporters/kubernetes_manifest_exporter';
import { ProductionManifestoGenerator } from '@/core/exporters/production_manifesto_generator';
import { TerraformHclExporter } from '@/core/exporters/terraform_hcl_exporter';
import { GuidancePreferenceManager } from '@/core/state/guidance_preference_manager';
import {
  InspectorNodeData,
  QuickActionDescriptor,
  WorkspaceTab,
} from '@/core/state/guidance_types';
import { WorkspaceStore } from '@/core/state/workspace_store';

export interface PageProps {
  ref?: React.Ref<Page> | undefined;
}

export interface PageState {
  activeTab: WorkspaceTab;
  isAiModalOpen: boolean;
  isExportModalOpen: boolean;
  isHelpModalOpen: boolean;
  isAppWelcomeOpen: boolean;
  isComponentWelcomeOpen: boolean;
  selectedNode: InspectorNodeData | null;
  exportType: ExportType;
  exportedCode: string;
}

/**
 * 2026 Machine Learning System Design Platform root interactive workspace.
 */
export class Page extends React.Component<PageProps, PageState> {
  private static readonly _TAB_CANVAS: WorkspaceTab = 'CANVAS';
  private static readonly _TAB_INTERVIEW: WorkspaceTab = 'INTERVIEW';
  private static readonly _TAB_CHAOS: WorkspaceTab = 'CHAOS';
  private static readonly _TAB_CURRICULUM: WorkspaceTab = 'CURRICULUM';
  private static readonly _TAB_TELEMETRY: WorkspaceTab = 'TELEMETRY';
  private static readonly _TAB_FINOPS: WorkspaceTab = 'FINOPS';

  public static renderPage(): React.ReactNode {
    return <Page />;
  }

  public constructor(props: PageProps) {
    super(props);
    this._store = new WorkspaceStore();
    this._guidanceManager = new GuidancePreferenceManager(undefined, this._store);
    this._tfExporter = new TerraformHclExporter();
    this._k8sExporter = new KubernetesManifestExporter();
    this._manifestoGen = new ProductionManifestoGenerator();
    this.state = {
      activeTab: Page._TAB_CANVAS,
      isAiModalOpen: false,
      isExportModalOpen: false,
      isHelpModalOpen: false,
      isAppWelcomeOpen: this._guidanceManager.shouldShowAppWelcome(),
      isComponentWelcomeOpen: this._guidanceManager.shouldShowComponentWelcome(Page._TAB_CANVAS),
      selectedNode: null,
      exportType: 'TERRAFORM',
      exportedCode: '',
    };
  }

  public override componentDidMount(): void {
    void this._updateExportedCode('TERRAFORM');
  }

  public override render(): React.ReactNode {
    return (
      <main className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
        {this._renderHeaderSection()}
        {this._renderMainContent()}
        {this._renderModals()}
      </main>
    );
  }

  private _renderHeaderSection(): React.ReactNode {
    return (
      <>
        <HeaderDeck
          activeTab={this.state.activeTab}
          onTabSelect={(tab) => this._handleTabSelect(tab)}
          onOpenAiModal={() => this.setState({ isAiModalOpen: true })}
          onOpenExportModal={(type) => this._handleExportClick(type)}
          onOpenHelpModal={() => this.setState({ isAppWelcomeOpen: true })}
          store={this._store}
        />
        <ScreenContextBanner
          activeTab={this.state.activeTab}
          onQuickAction={this._handleQuickAction}
          onShowMockExample={() => this.setState({ isComponentWelcomeOpen: true })}
        />
      </>
    );
  }

  private _renderMainContent(): React.ReactNode {
    return (
      <div className="flex-1 overflow-auto relative flex flex-col">
        <ComponentWelcomeOverlay
          isOpen={this.state.isComponentWelcomeOpen}
          tabId={this.state.activeTab}
          store={this._store}
          onClose={(dontShowAgain) => {
            this._guidanceManager.dismissComponentWelcome(this.state.activeTab, dontShowAgain);
            this.setState({ isComponentWelcomeOpen: false });
          }}
        />
        <div className="flex-1 overflow-auto relative">
          {this._renderActiveTabContent()}
          {this._renderNodeInspector()}
        </div>
      </div>
    );
  }

  private _renderNodeInspector(): React.ReactNode {
    return (
      <NodeInspectorDrawer
        isOpen={Boolean(this.state.selectedNode)}
        selectedNode={this.state.selectedNode}
        onClose={() => this.setState({ selectedNode: null })}
        onUpdateNode={this._handleUpdateInspectorNode}
        onDuplicateNode={this._handleDuplicateNode}
        onDisconnectEdges={this._handleDisconnectNode}
        onDeleteNode={this._handleDeleteInspectorNode}
      />
    );
  }

  private readonly _store: WorkspaceStore;
  private readonly _guidanceManager: GuidancePreferenceManager;
  private readonly _tfExporter: TerraformHclExporter;
  private readonly _k8sExporter: KubernetesManifestExporter;
  private readonly _manifestoGen: ProductionManifestoGenerator;

  private async _updateExportedCode(type: ExportType): Promise<void> {
    const doc = this._store.getState().currentWorkspace;
    let code = '';
    if (type === 'TERRAFORM') {
      code = this._tfExporter.exportHcl(doc);
    } else if (type === 'K8S') {
      code = this._k8sExporter.exportYaml(doc);
    } else {
      code = await this._manifestoGen.generateMarkdownManifesto(doc);
    }
    this.setState({ exportType: type, exportedCode: code });
  }

  private _handleTabSelect(tab: WorkspaceTab): void {
    this.setState({
      activeTab: tab,
      isComponentWelcomeOpen: this._guidanceManager.shouldShowComponentWelcome(tab),
    });
  }

  private _handleExportClick(type: ExportType): void {
    void this._updateExportedCode(type);
    this.setState({ isExportModalOpen: true });
  }

  private _handleQuickAction = (action: QuickActionDescriptor): void => {
    switch (action.actionType) {
      case 'LOAD_TEMPLATE':
        this.setState({ activeTab: Page._TAB_CANVAS });
        break;
      case 'START_STEP':
      case 'LOAD_CANVAS_CONTEXT':
        this.setState({ activeTab: Page._TAB_INTERVIEW });
        break;
      case 'RUN_CHAOS':
        this.setState({ activeTab: Page._TAB_CHAOS });
        break;
      case 'LOAD_BLUEPRINT':
        this.setState({ activeTab: Page._TAB_CURRICULUM });
        break;
      case 'TOGGLE_VIEW':
        this.setState({ activeTab: Page._TAB_TELEMETRY });
        break;
      case 'CALC_FINOPS':
        this.setState({ activeTab: Page._TAB_FINOPS });
        break;
      default:
        break;
    }
  };

  private _handleUpdateInspectorNode = (updatedData: Partial<InspectorNodeData>): void => {
    this.setState((prev) => ({
      selectedNode: prev.selectedNode ? { ...prev.selectedNode, ...updatedData } : null,
    }));
  };

  private _handleDuplicateNode = (nodeId: string): void => {
    if (this.state.selectedNode && this.state.selectedNode.id === nodeId) {
      this.setState({
        selectedNode: {
          ...this.state.selectedNode,
          id: `${nodeId}_copy`,
          label: `${this.state.selectedNode.label} (Copy)`,
        },
      });
    }
  };

  private _handleDisconnectNode = (_nodeId: string): void => {
    // Disconnect edges in store
  };

  private _handleDeleteInspectorNode = (_nodeId: string): void => {
    this.setState({ selectedNode: null });
  };

  private _renderActiveTabContent(): React.ReactNode {
    switch (this.state.activeTab) {
      case Page._TAB_CANVAS:
        return <ArchitectureCanvas store={this._store} />;
      case Page._TAB_INTERVIEW:
        return <InterviewWorkspace />;
      case Page._TAB_CHAOS:
        return <ChaosSandboxWorkspace />;
      case Page._TAB_CURRICULUM:
        return <CurriculumView />;
      case Page._TAB_TELEMETRY:
        return <TelemetryDashboard />;
      case Page._TAB_FINOPS:
        return <FinopsWorkspace />;
      default:
        return null;
    }
  }

  private _renderModals(): React.ReactNode {
    return (
      <>
        <AiExchangeModal
          isOpen={this.state.isAiModalOpen}
          envelope={null}
          onClose={() => this.setState({ isAiModalOpen: false })}
          onImportSuccess={() => this.setState({ isAiModalOpen: false })}
        />
        {this._renderWelcomeModals()}
        {this._renderExportModal()}
      </>
    );
  }

  private _renderWelcomeModals(): React.ReactNode {
    return (
      <>
        <AppWelcomeModal
          isOpen={this.state.isAppWelcomeOpen}
          onClose={(dontShowAgain) => {
            this._guidanceManager.dismissAppWelcome(dontShowAgain);
            this.setState({ isAppWelcomeOpen: false });
          }}
          onTakeTour={() => this.setState({ isHelpModalOpen: true })}
        />
        <PlatformOnboardingModal
          isOpen={this.state.isHelpModalOpen}
          onClose={() => this.setState({ isHelpModalOpen: false })}
        />
      </>
    );
  }

  private _renderExportModal(): React.ReactNode {
    if (!this.state.isExportModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="flex flex-col w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          {this._renderExportModalHeader()}
          <div className="flex-1 p-4 overflow-auto">
            <pre className="font-mono text-xs bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre">
              {this.state.exportedCode}
            </pre>
          </div>
          {this._renderExportModalFooter()}
        </div>
      </div>
    );
  }

  private _renderExportModalHeader(): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white">Export Infrastructure &amp; Portfolio</h2>
          <div className="flex rounded-md bg-slate-950 p-1 border border-slate-800 text-xs">
            {this._renderExportTypeBtn('TERRAFORM', 'Terraform HCL')}
            {this._renderExportTypeBtn('K8S', 'Kubernetes YAML')}
            {this._renderExportTypeBtn('MANIFESTO', 'Production Manifesto')}
          </div>
        </div>
        <button
          type="button"
          onClick={() => this.setState({ isExportModalOpen: false })}
          className="text-slate-400 hover:text-slate-200 text-lg font-bold"
        >
          ✕
        </button>
      </div>
    );
  }

  private _renderExportTypeBtn(type: ExportType, label: string): React.ReactNode {
    const isSel = this.state.exportType === type;
    return (
      <button
        key={type}
        type="button"
        onClick={() => void this._updateExportedCode(type)}
        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
          isSel ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        {label}
      </button>
    );
  }

  private _renderExportModalFooter(): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3 bg-slate-950/60 text-xs">
        <span className="text-slate-400">Zero disk persistence. Copy or download in memory.</span>
        <button
          type="button"
          onClick={() => this._handleCopyExport()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold text-white transition shadow-sm"
        >
          Copy to Clipboard
        </button>
      </div>
    );
  }

  private _handleCopyExport(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(this.state.exportedCode);
    }
  }
}

export default Page;
