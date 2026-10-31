import React from 'react';
import { ResponseValidator } from '@/core/ai_gateway/response_validator';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

export interface AiExchangeModalProps {
  isOpen: boolean;
  envelope: LLMExchangeEnvelope | null;
  onClose: () => void;
  onImportSuccess: (data: unknown) => void;
  validator?: ResponseValidator;
}

export interface AiExchangeModalState {
  pastedText: string;
  validationError: string | null;
  repairPrompt: string | null;
  copiedPrompt: boolean;
  copiedRepair: boolean;
}

/**
 * Accessible React modal dialog for Air-Gap prompt export and response import.
 */
export class AiExchangeModal extends React.Component<AiExchangeModalProps, AiExchangeModalState> {
  private static readonly _EMPTY_STRING = '';
  private static readonly _JSON_MIME = 'application/json';
  private static readonly _RESET_TIMEOUT_MS = 2000;
  private static readonly _TEXTAREA_ROWS = 6;
  private static readonly _FILE_SUFFIX = '_envelope.json';

  private static readonly _LABEL_MODAL_TITLE = 'Air-Gap AI Exchange Gateway';
  private static readonly _LABEL_COPY_PROMPT = 'Copy Markdown Prompt';
  private static readonly _LABEL_COPIED = 'Copied!';
  private static readonly _LABEL_DOWNLOAD_JSON = 'Download Envelope JSON';
  private static readonly _LABEL_PASTE_PLACEHOLDER =
    'Paste raw LLM response from Google AI Studio, ChatGPT, or Claude here...';
  private static readonly _LABEL_IMPORT_BUTTON = 'Import & Validate Response';
  private static readonly _LABEL_REPAIR_BUTTON = 'Copy Schema Repair Prompt';
  private static readonly _LABEL_CLOSE = 'Close';
  private static readonly _LABEL_VALIDATION_ERR = 'Validation Error:';
  private static readonly _LABEL_EXPORT_DESC =
    'Export prompt context to run in external LLM interface (AI Studio, Claude, ChatGPT):';

  public constructor(props: AiExchangeModalProps) {
    super(props);
    this._validator = props.validator ?? new ResponseValidator();
    this.state = {
      pastedText: AiExchangeModal._EMPTY_STRING,
      validationError: null,
      repairPrompt: null,
      copiedPrompt: false,
      copiedRepair: false,
    };
  }

  public override render(): React.ReactNode {
    if (!this.props.isOpen || !this.props.envelope) {
      return null;
    }
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-exchange-title"
      >
        <div className="w-full max-w-2xl rounded-lg bg-neutral-900 border border-neutral-700 p-6 text-neutral-100 shadow-xl">
          {this._renderHeader()}
          {this._renderExportSection()}
          {this._renderImportSection()}
          {this._renderErrorBanner()}
          {this._renderFooter()}
        </div>
      </div>
    );
  }

  private readonly _validator: ResponseValidator;

  private _renderHeader(): React.ReactNode {
    const moduleId = this.props.envelope?.moduleId ?? AiExchangeModal._EMPTY_STRING;
    return (
      <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
        <h2 id="ai-exchange-title" className="text-xl font-bold">
          {AiExchangeModal._LABEL_MODAL_TITLE} ({moduleId})
        </h2>
        <button
          onClick={this.props.onClose}
          className="text-neutral-400 hover:text-white"
          aria-label={AiExchangeModal._LABEL_CLOSE}
        >
          ✕
        </button>
      </div>
    );
  }

  private _renderExportSection(): React.ReactNode {
    return (
      <div className="mb-4 space-y-2">
        <p className="text-sm text-neutral-300">{AiExchangeModal._LABEL_EXPORT_DESC}</p>
        {this._renderExportButtons()}
      </div>
    );
  }

  private _renderExportButtons(): React.ReactNode {
    const copyLabel = this.state.copiedPrompt
      ? AiExchangeModal._LABEL_COPIED
      : AiExchangeModal._LABEL_COPY_PROMPT;
    return (
      <div className="flex gap-2">
        <button
          onClick={this._handleCopyPrompt}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          {copyLabel}
        </button>
        <button
          onClick={this._handleDownloadJson}
          className="rounded bg-neutral-800 px-4 py-2 text-sm font-medium hover:bg-neutral-700"
        >
          {AiExchangeModal._LABEL_DOWNLOAD_JSON}
        </button>
      </div>
    );
  }

  private _renderImportSection(): React.ReactNode {
    return (
      <div className="mb-4 space-y-2">
        <label htmlFor="response-textarea" className="block text-sm font-medium text-neutral-300">
          Paste Raw Response:
        </label>
        {this._renderTextarea()}
        {this._renderImportControls()}
      </div>
    );
  }

  private _renderTextarea(): React.ReactNode {
    return (
      <textarea
        id="response-textarea"
        rows={AiExchangeModal._TEXTAREA_ROWS}
        value={this.state.pastedText}
        onChange={this._handleTextChange}
        placeholder={AiExchangeModal._LABEL_PASTE_PLACEHOLDER}
        className="w-full rounded border border-neutral-700 bg-neutral-950 p-3 text-xs font-mono text-neutral-200 focus:border-indigo-500 focus:outline-none"
      />
    );
  }

  private _renderImportControls(): React.ReactNode {
    return (
      <div className="flex items-center justify-between">
        <input
          type="file"
          accept=".json"
          onChange={this._handleFileUpload}
          className="text-xs text-neutral-400"
        />
        <button
          onClick={this._handleValidateAndImport}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          {AiExchangeModal._LABEL_IMPORT_BUTTON}
        </button>
      </div>
    );
  }

  private _renderErrorBanner(): React.ReactNode {
    if (!this.state.validationError) return null;
    return (
      <div className="mb-4 rounded border border-rose-800 bg-rose-950/60 p-3 text-sm text-rose-200">
        <p className="font-semibold">{AiExchangeModal._LABEL_VALIDATION_ERR}</p>
        <p className="font-mono text-xs mt-1">{this.state.validationError}</p>
        {this._renderRepairButton()}
      </div>
    );
  }

  private _renderRepairButton(): React.ReactNode {
    if (!this.state.repairPrompt) return null;
    const repairLabel = this.state.copiedRepair
      ? AiExchangeModal._LABEL_COPIED
      : AiExchangeModal._LABEL_REPAIR_BUTTON;
    return (
      <button
        onClick={this._handleCopyRepairPrompt}
        className="mt-2 rounded bg-rose-700 px-3 py-1 text-xs font-medium hover:bg-rose-600"
      >
        {repairLabel}
      </button>
    );
  }

  private _renderFooter(): React.ReactNode {
    return (
      <div className="flex justify-end border-t border-neutral-800 pt-3">
        <button
          onClick={this.props.onClose}
          className="rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
        >
          {AiExchangeModal._LABEL_CLOSE}
        </button>
      </div>
    );
  }

  private _handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    this.setState({ pastedText: e.target.value });
  };

  private _handleCopyPrompt = async (): Promise<void> => {
    if (!this.props.envelope) return;
    const text = this.props.envelope.promptPayload.copyPasteReadyMarkdown;
    await navigator.clipboard.writeText(text);
    this.setState({ copiedPrompt: true });
    setTimeout(
      () => this.setState({ copiedPrompt: false }),
      AiExchangeModal._RESET_TIMEOUT_MS
    );
  };

  private _handleCopyRepairPrompt = async (): Promise<void> => {
    if (!this.state.repairPrompt) return;
    await navigator.clipboard.writeText(this.state.repairPrompt);
    this.setState({ copiedRepair: true });
    setTimeout(
      () => this.setState({ copiedRepair: false }),
      AiExchangeModal._RESET_TIMEOUT_MS
    );
  };

  private _handleDownloadJson = (): void => {
    if (!this.props.envelope) return;
    const jsonStr = JSON.stringify(this.props.envelope, null, 2);
    const blob = new Blob([jsonStr], { type: AiExchangeModal._JSON_MIME });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.props.envelope.moduleId.toLowerCase()}${AiExchangeModal._FILE_SUFFIX}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  private _handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        this.setState({ pastedText: content });
      }
    };
    reader.readAsText(file);
  };

  private _handleValidateAndImport = (): void => {
    if (!this.props.envelope) return;
    const result = this._validator.validateResponse(
      this.props.envelope.moduleId,
      this.state.pastedText
    );
    if (result.success && result.data) {
      this.setState({ validationError: null, repairPrompt: null });
      this.props.onImportSuccess(result.data);
      this.props.onClose();
      return;
    }
    this._handleValidationError(result.error);
  };

  private _handleValidationError(errorMessage?: string): void {
    if (!this.props.envelope) return;
    const errorMsg = errorMessage ?? 'Validation failed';
    const repairPrompt = this._validator.buildRepairPrompt(
      this.props.envelope.moduleId,
      this.state.pastedText,
      errorMsg
    );
    this.setState({ validationError: errorMsg, repairPrompt });
  }
}
