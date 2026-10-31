'use client';

import React from 'react';
import { AiExchangeModal } from '@/components/ai_exchange/ai_exchange_modal';
import { ArchitectureCanvas } from '@/components/canvas/architecture_canvas';
import { ChaosSandboxWorkspace } from '@/components/chaos/chaos_sandbox_workspace';
import { CurriculumView } from '@/components/curriculum/curriculum_view';
import { FinopsWorkspace } from '@/components/finops/finops_workspace';
import { InterviewWorkspace } from '@/components/interview/interview_workspace';
import { TelemetryDashboard } from '@/components/telemetry/telemetry_dashboard';
import { KubernetesManifestExporter } from '@/core/exporters/kubernetes_manifest_exporter';
import { ProductionManifestoGenerator } from '@/core/exporters/production_manifesto_generator';
import { TerraformHclExporter } from '@/core/exporters/terraform_hcl_exporter';
import { WorkspaceStore } from '@/core/state/workspace_store';

export type ActiveTab = 'CANVAS' | 'INTERVIEW' | 'CHAOS' | 'CURRICULUM' | 'TELEMETRY' | 'FINOPS';
export type ExportType = 'TERRAFORM' | 'K8S' | 'MANIFESTO';

export type PageProps = Record<string, never>;

export interface PageState {
  activeTab: ActiveTab;
  isAiModalOpen: boolean;
  isExportModalOpen: boolean;
  exportType: ExportType;
  exportedCode: string;
  syncStatus: string;
}

/**
 * 2026 Machine Learning System Design Platform root interactive workspace.
 */
export class Page extends React.Component<PageProps, PageState> {
  private static readonly _TAB_CANVAS: ActiveTab = 'CANVAS';
  private static readonly _TAB_INTERVIEW: ActiveTab = 'INTERVIEW';
  private static readonly _TAB_CHAOS: ActiveTab = 'CHAOS';
  private static readonly _TAB_CURRICULUM: ActiveTab = 'CURRICULUM';
  private static readonly _TAB_TELEMETRY: ActiveTab = 'TELEMETRY';
  private static readonly _TAB_FINOPS: ActiveTab = 'FINOPS';

  public static renderPage(): React.ReactNode {
    return <Page />;
  }

  public constructor(props: PageProps) {
    super(props);
    this._store = new WorkspaceStore();
    this._tfExporter = new TerraformHclExporter();
    this._k8sExporter = new KubernetesManifestExporter();
    this._manifestoGen = new ProductionManifestoGenerator();
    this.state = {
      activeTab: Page._TAB_CANVAS,
      isAiModalOpen: false,
      isExportModalOpen: false,
      exportType: 'TERRAFORM',
      exportedCode: '',
      syncStatus: 'EPHEMERAL_RAM_ONLY',
    };
  }

  public override componentDidMount(): void {
    void this._updateExportedCode('TERRAFORM');
  }

  public override render(): React.ReactNode {
    return (
      <main className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
        {this._renderHeader()}
        <div className="flex-1 overflow-auto relative">
          {this._renderActiveTabContent()}
        </div>
        {this._renderModals()}
      </main>
    );
  }

  private readonly _store: WorkspaceStore;
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

  private _handleTabSelect(tab: ActiveTab): void {
    this.setState({ activeTab: tab });
  }

  private _handleExportClick(type: ExportType): void {
    void this._updateExportedCode(type);
    this.setState({ isExportModalOpen: true });
  }

  private _renderHeader(): React.ReactNode {
    return (
      <header className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 z-20 gap-3">
        {this._renderBrand()}
        {this._renderNavTabs()}
        {this._renderActions()}
      </header>
    );
  }

  private _renderBrand(): React.ReactNode {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 font-black text-white text-xs shadow-md shadow-indigo-500/30">
          ML
        </span>
        <div>
          <span className="font-bold text-sm tracking-tight text-white block">2026 Machine Learning System Design Platform</span>
          <span className="text-[10px] text-slate-400 font-mono">Deterministic interactive simulation and interview preparation engine.</span>
        </div>
      </div>
    );
  }

  private _renderNavTabs(): React.ReactNode {
    return (
      <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
        {this._renderTabBtn(Page._TAB_CANVAS, '🏗️ Canvas')}
        {this._renderTabBtn(Page._TAB_INTERVIEW, '🎙️ AI Interview')}
        {this._renderTabBtn(Page._TAB_CHAOS, '⚡ Chaos Sandbox')}
        {this._renderTabBtn(Page._TAB_CURRICULUM, '📚 Curriculum')}
        {this._renderTabBtn(Page._TAB_TELEMETRY, '📊 Telemetry')}
        {this._renderTabBtn(Page._TAB_FINOPS, '💰 FinOps')}
      </nav>
    );
  }

  private _renderTabBtn(tab: ActiveTab, label: string): React.ReactNode {
    const isActive = this.state.activeTab === tab;
    return (
      <button
        key={tab}
        onClick={() => this._handleTabSelect(tab)}
        className={`px-3 py-1.5 rounded-md font-semibold transition ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
      >
        {label}
      </button>
    );
  }

  private _renderActions(): React.ReactNode {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          RAM-Only SSOT
        </span>
        <button
          onClick={() => this.setState({ isAiModalOpen: true })}
          className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-medium transition"
        >
          AI Exchange
        </button>
        <button
          onClick={() => this._handleExportClick('TERRAFORM')}
          className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition"
        >
          Export IaC
        </button>
      </div>
    );
  }

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
        {this._renderExportModal()}
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
