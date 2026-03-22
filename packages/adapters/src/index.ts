export interface SourceAdapter {
  name: string;
  run(): Promise<void>;
}
