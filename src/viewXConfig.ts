export interface ViewXConfig {
    project: ProjectConfig;
    viewXModels: ViewXModelsConfig;
}

interface ProjectConfig {
    type: string;
    name: string;
    version: string;
    root: string;
    previewServerPort: number;
    socketPort: number
}

interface ViewXModelsConfig {
    root: string;
    patternMappings: PatternMapping[];
}

interface PatternMapping {
    modelName: string;
    pattern: string;
}