export interface ViewXConfig {
    project: ProjectConfig;
    viewXModels: ViewXModelsConfig;
}

interface ProjectConfig {
    type: string;
    name: string;
    version: string;
    root: string;
}

interface ViewXModelsConfig {
    root: string;
    filterMappings: FilterMapping[];
}

interface FilterMapping {
    modelName: string;
    filter: string;
}