import yaml from 'js-yaml';
import { GDriveSyncClient } from '@/core/gdrive/gdrive_sync_client';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';
import { ScenarioPlugin, ScenarioPluginSchema } from '@/schemas/scenario_plugin_schema';

/**
 * Loads and validates plug-and-play scenario blueprints from local storage and Google Drive SSOT.
 */
export class ScenarioLoader {
  private static readonly _BUILTIN_PATH = ScenarioConstants.BUILTIN_SCENARIOS_DIR;
  private static readonly _YAML_EXT = ScenarioConstants.EXT_YAML;
  private static readonly _FORMAT_YAML = 'yaml';
  private static readonly _FORMAT_JSON = 'json';
  private static readonly _ERR_FILE_LOAD = 'Failed to load scenario file: ';
  private static readonly _ERR_UNSUPPORTED_FORMAT = 'Unsupported scenario format: ';

  public constructor(
    private readonly _schemaValidator: ScenarioPluginSchema,
    private readonly _gdriveClient: GDriveSyncClient | null = null,
    private readonly _fetchFn: typeof fetch = fetch
  ) {}

  /**
   * Loads a bundled reference scenario blueprint by scenario ID or filename.
   */
  public async loadBuiltinScenario(scenarioId: string): Promise<ScenarioPlugin> {
    const filename = this._resolveBuiltinFilename(scenarioId);
    const filePath = `${ScenarioLoader._BUILTIN_PATH}${filename}`;
    const rawContent = await this._fetchFile(filePath);
    return this.parseAndValidate(rawContent);
  }

  /**
   * Discovers and parses all user-contributed scenario blueprints from Google Drive schemas folder.
   */
  public async loadDriveScenarios(folderId: string): Promise<ScenarioPlugin[]> {
    if (!this._gdriveClient) {
      return [];
    }
    const files = await this._gdriveClient.listFilesInFolder(folderId);
    const results: ScenarioPlugin[] = [];
    for (const file of files) {
      if (this._isScenarioFile(file.name)) {
        const scenario = await this._loadSingleDriveScenario(file.id, file.name);
        if (scenario) {
          results.push(scenario);
        }
      }
    }
    return results;
  }

  /**
   * Validates raw scenario string content against the specified format (yaml or json).
   */
  public validateScenario(rawContent: string, format: 'yaml' | 'json'): ScenarioPlugin {
    if (format === ScenarioLoader._FORMAT_JSON) {
      const parsed: unknown = JSON.parse(rawContent);
      return this._schemaValidator.validateScenario(parsed);
    }
    if (format === ScenarioLoader._FORMAT_YAML) {
      const parsed: unknown = yaml.load(rawContent);
      return this._schemaValidator.validateScenario(parsed);
    }
    throw new Error(`${ScenarioLoader._ERR_UNSUPPORTED_FORMAT}${format}`);
  }

  /**
   * Parses and validates raw YAML or unparsed JSON text.
   */
  public parseAndValidate(rawYamlOrJson: string): ScenarioPlugin {
    const parsed: unknown = yaml.load(rawYamlOrJson);
    return this._schemaValidator.validateScenario(parsed);
  }

  /**
   * Returns list of known bundled reference scenario blueprint identifiers.
   */
  public listBuiltinScenarios(): string[] {
    return [
      ScenarioConstants.BLUEPRINT_ECOM_ID,
      ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID,
      ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID,
    ];
  }

  private _resolveBuiltinFilename(scenarioId: string): string {
    if (scenarioId.endsWith(ScenarioConstants.EXT_YAML) || scenarioId.endsWith(ScenarioConstants.EXT_JSON)) {
      return scenarioId;
    }
    if (scenarioId === ScenarioConstants.BLUEPRINT_ECOM_ID || scenarioId === 'blueprint_ecommerce_ranking') {
      return ScenarioConstants.FILE_ECOM_YAML;
    }
    if (scenarioId === ScenarioConstants.BLUEPRINT_STREAMING_FRAUD_ID || scenarioId === 'blueprint_streaming_fraud') {
      return ScenarioConstants.FILE_FRAUD_YAML;
    }
    if (scenarioId === ScenarioConstants.BLUEPRINT_ENTERPRISE_RAG_ID || scenarioId === 'blueprint_enterprise_vector_rag') {
      return ScenarioConstants.FILE_RAG_YAML;
    }
    return `${scenarioId}${ScenarioLoader._YAML_EXT}`;
  }

  private async _fetchFile(filePath: string): Promise<string> {
    const localContent = this._readFromLocalFs(filePath);
    if (localContent !== null) {
      return localContent;
    }
    const response = await this._fetchFn(filePath);
    if (!response.ok) {
      throw new Error(`${ScenarioLoader._ERR_FILE_LOAD}${filePath} (${response.status})`);
    }
    return response.text();
  }

  private _readFromLocalFs(filePath: string): string | null {
    if (typeof process === 'undefined' || !process.versions?.node) {
      return null;
    }
    try {
      const getModule = (process as unknown as { getBuiltinModule?: (name: string) => unknown }).getBuiltinModule;
      if (typeof getModule !== 'function') return null;
      const fsMod = getModule('node:fs') as { existsSync: (p: string) => boolean; readFileSync: (p: string, enc: string) => string };
      const pathMod = getModule('node:path') as { join: (...args: string[]) => string };
      const cleaned = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const fullPath = pathMod.join(process.cwd(), 'public', cleaned);
      if (fsMod.existsSync(fullPath)) {
        return fsMod.readFileSync(fullPath, 'utf-8');
      }
    } catch {
      return null;
    }
    return null;
  }

  private _isScenarioFile(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return (
      lower.endsWith(ScenarioConstants.EXT_YAML) ||
      lower.endsWith(ScenarioConstants.EXT_YML) ||
      lower.endsWith(ScenarioConstants.EXT_JSON)
    );
  }

  private async _loadSingleDriveScenario(fileId: string, fileName: string): Promise<ScenarioPlugin | null> {
    if (!this._gdriveClient) {
      return null;
    }
    try {
      const text = await this._gdriveClient.fetchRawTextFile(fileId);
      const isJson = fileName.toLowerCase().endsWith(ScenarioConstants.EXT_JSON);
      return this.validateScenario(text, isJson ? ScenarioLoader._FORMAT_JSON : ScenarioLoader._FORMAT_YAML);
    } catch {
      return null;
    }
  }
}
