// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AiExchangeModal } from '@/components/ai_exchange/ai_exchange_modal';
import { PromptEnvelopeFactory } from '@/core/ai_gateway/prompt_envelope_factory';

describe('AiExchangeModal', () => {
  const factory = new PromptEnvelopeFactory();
  const sampleEnvelope = factory.createEnvelope(
    'SANDBOX_BUILDER',
    { qps: 5000 },
    'System instructions for architect',
    { type: 'object' },
    'test_use_case_1'
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = vi.fn();
  });

  it('test_render_whenClosedOrNoEnvelope_rendersNothing', () => {
    const { container: closedContainer } = render(
      <AiExchangeModal
        isOpen={false}
        envelope={sampleEnvelope}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );
    expect(closedContainer.firstChild).toBeNull();

    const { container: nullEnvelopeContainer } = render(
      <AiExchangeModal
        isOpen={true}
        envelope={null}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );
    expect(nullEnvelopeContainer.firstChild).toBeNull();
  });

  it('test_render_whenOpen_displaysModalTitleAndControls', () => {
    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Air-Gap AI Exchange Gateway \(SANDBOX_BUILDER\)/)).toBeDefined();
    expect(screen.getByText('Copy Markdown Prompt')).toBeDefined();
    expect(screen.getByText('Download Envelope JSON')).toBeDefined();
    expect(screen.getByText('Import & Validate Response')).toBeDefined();
  });

  it('test_copyPrompt_writesToClipboardAndTogglesCopiedLabel', async () => {
    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );

    const copyBtn = screen.getByText('Copy Markdown Prompt');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      sampleEnvelope.promptPayload.copyPasteReadyMarkdown
    );
    expect(await screen.findByText('Copied!')).toBeDefined();
  });

  it('test_downloadJson_triggersBlobDownload', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );

    const downloadBtn = screen.getByText('Download Envelope JSON');
    fireEvent.click(downloadBtn);

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('test_validateAndImport_whenValidJson_callsImportSuccessAndCloses', () => {
    const onImportSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={onClose}
        onImportSuccess={onImportSuccess}
      />
    );

    const validJson = JSON.stringify({
      overallHealthScore: 92,
      identifiedBottlenecks: [],
      suggestedOptimizations: [],
      tradeOffAssessment: 'Optimal',
    });

    const textarea = screen.getByPlaceholderText(/Paste raw LLM response/);
    fireEvent.change(textarea, { target: { value: validJson } });

    const importBtn = screen.getByText('Import & Validate Response');
    fireEvent.click(importBtn);

    expect(onImportSuccess).toHaveBeenCalledWith(expect.objectContaining({ overallHealthScore: 92 }));
    expect(onClose).toHaveBeenCalled();
  });

  it('test_validateAndImport_whenInvalidJson_displaysErrorAndCopiesRepairPrompt', async () => {
    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Paste raw LLM response/);
    fireEvent.change(textarea, { target: { value: '{"overallHealthScore": "bad_type"}' } });

    const importBtn = screen.getByText('Import & Validate Response');
    fireEvent.click(importBtn);

    expect(screen.getByText('Validation Error:')).toBeDefined();
    const repairBtn = screen.getByText('Copy Schema Repair Prompt');
    expect(repairBtn).toBeDefined();

    fireEvent.click(repairBtn);
    expect(await screen.findByText('Copied!')).toBeDefined();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL JSON SCHEMA ERROR')
    );
  });

  it('test_closeButton_triggersOnCloseCallback', () => {
    const onClose = vi.fn();
    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={onClose}
        onImportSuccess={vi.fn()}
      />
    );

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('test_fileUpload_whenNoFilesSelected_returnsEarly', () => {
    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    const textarea = screen.getByPlaceholderText(/Paste raw LLM response/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('test_fileUpload_populatesTextareaWithFileContent', async () => {
    render(
      <AiExchangeModal
        isOpen={true}
        envelope={sampleEnvelope}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
      />
    );

    const fileContent = '{"overallHealthScore": 80, "identifiedBottlenecks": [], "suggestedOptimizations": [], "tradeOffAssessment": "OK"}';
    const file = new File([fileContent], 'response.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for FileReader
    await new Promise((resolve) => setTimeout(resolve, 50));
    const textarea = screen.getByPlaceholderText(/Paste raw LLM response/) as HTMLTextAreaElement;
    expect(textarea.value).toBe(fileContent);
  });
});
